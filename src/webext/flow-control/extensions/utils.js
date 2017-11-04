// @flow

import HmacSHA256 from 'crypto-js/hmac-sha256'
import EncBase64 from 'crypto-js/enc-base64'
import { timeout } from 'cmn/lib/all'

type StatusOk = void;
type StatusFail = { [string]:string }; // redux-form SubmissionError style keys ie: _error for whole form
type StatusResolve = StatusOk => void
type StatusPromise = Promise<StatusOk | StatusFail>
export type StatusInjection = { promise:StatusPromise, resolve:StatusResolve }
export function injectStatusPromise<T: Action>(action: T): T {
    action.promise = new Promise(resolve => action.resolve = resolve);
    return action;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(blob);
    })
}

export async function dataUrlToBlob(dataurl: string): Promise<Blob> {
    // TODO: i dont need to specify mime type for the blob here?
    const res = await fetch(dataurl);
    return await res.blob();
}

export function blobToArrBuf(blob: Blob): Promise<ArrayBuffer> {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsArrayBuffer(blob);
    })
}

export function arrBufToBlob(buf: ArrayBuffer, mime:string='application/octet-binary'): Blob {
    return new Blob([buf], { type:mime });
}

export async function arrBufToDataUrl(buf: ArrayBuffer, mime:string='application/octet-binary'): Promise<string> {
    const blob = arrBufToBlob(buf, mime);
    return await blobToDataUrl(blob);
}

export function crxToZip(crxBuf: ArrayBuffer): ArrayBuffer {
    // returns arrbuf that is a zip

    // check first 1000 bytes

    const uints = new Uint8Array(crxBuf.slice(0, 1000));
    // console.log('locOfPk:', locOfPk);
    const pkIx = uints.findIndex((uint, ix) => uint === 80 && uints[ix+1] === 75 && uints[ix+2] === 3 && uints[ix+3] === 4)

    // TODO: possible error point here, if pk not found

    const zipBuf = crxBuf.slice(pkIx);
    return zipBuf;
}

export function deleteUndefined<T: {}>(obj: T): T {
    // mutates obj
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) delete obj[k];
    }
    return obj;
}

// fetchEpoch
type FetchEpochOptions = {
    timeout: number, // ms,
    compensate: boolean // subtracts half of the xhr request time from the time extracted from page
}
type FetchEpochServers = {
    url: string,
    process: (res:{}) => Promise<number> // return ms or throw
}
export async function fetchEpoch(options: FetchEpochOptions={}) {
    options = Object.assign({
        timeout: 10000,
        compensate: true
    }, options);

	const servers: FetchEpochServers[] = [
		{
            url: 'https://trigger-community.sundayschoolonline.org/unixtime.php',
			process: async res => {
                if (res.status !== 200) throw `Unhandled status of "${status}"`;
                const { unixtime:sec } = await res.json();
				return sec * 1000;
			}
		},
		{
			url: 'http://currenttimestamp.com/',
			process: async res => {
                if (res.status !== 200) throw `Unhandled status of "${status}"`;
                const reply = await res.text();
				const [, sec ] = /current_time = (\d+);/.exec(reply); // will throw if regex fails
				return sec * 1000;
			}
		},
		{
			url: 'http://convert-unix-time.com/',
			process: async res => {
                if (res.status !== 200) throw `Unhandled status of "${status}"`;
                const reply = await res.text();
				const [, sec] = /currentTimeLink.*?(\d{10,})/.exec(reply); // will throw if regex fails
				return sec * 1000;
			}
		}
	];

	for (const { url, process } of servers) {
		try {
			const start = Date.now();
			const res = await timeout(options.timeout, fetch(url));
			const duration = Date.now() - start;
			const halfDuration = Math.round(duration / 2);

			let ms = await process(res);
			if (options.compensate) ms -= halfDuration;
			return ms;
		} catch(ex) {
            console.warn(`Failed to get epoch from server "${url}", error: ${ex.message}`);
		}
	}

	throw new Error('Failed to get epoch from all servers.');
}

export function getBase64FromDataUrl(dataUrl:string): string {
    const needle = 'base64,'
    return dataUrl.substr(dataUrl.indexOf(needle) + needle.length);
}

export function hashCode(str: string): number {
    // https://stackoverflow.com/a/7616484/1828637
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr   = str.charCodeAt(i);
        hash  = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export async function generateJWTToken(aKey, aSecret, aDateMs) {

    if (!aDateMs) aDateMs = await fetchEpoch();
	// aKey and aSecret should both be strings
	// jwt signature function for using with signing addons on AMO (addons.mozilla.org)
	var part1 = b64utoa(stringifySorted({
		typ: 'JWT',
		alg: 'HS256'
	}));

    var iat = Math.ceil(aDateMs / 1000); // in seconds
	var part2 = b64utoa(stringifySorted({
		iss: aKey,
		jti: Math.random().toString(),
		iat,
		exp: iat + 60 * 5
    }));

    var part3 = HmacSHA256(part1 + '.' + part2, aSecret).toString(EncBase64).replace(/=+$/m, '');
    return part1 + '.' + part2 + '.' + part3;

}

function stringifySorted(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

function b64utoa(aStr) {
	// base64url encode
	return btoa(aStr)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/m, '')
}
