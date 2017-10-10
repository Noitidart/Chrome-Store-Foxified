// @flow

import { timeout } from 'cmn/lib/all'

type StatusOk = void;
type StatusFail = { [string]:string }; // redux-form SubmissionError style keys ie: _error for whole form
type StatusResolve = StatusOk => void
type StatusPromise = Promise<StatusOk | StatusFail>
export type StatusInjection = { promise:StatusPromise, resolve:StatusResolve }
export function injectStatusPromise<T: { type:string }>(action: T): T {
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
    timeout: number // ms,
    compensate: boolean // subtracts half of the xhr request time from the time extracted from page
}
type FetchEpochServers = {
    url: string,
    process: (res:{}) => number // return ms or throw
}
async function fetchEpoch(options: FetchEpochOptions={}) {
    options = Object.assign({
        timeout: 10000,
        compensate: true
    }, options);

	const servers: FetchEpochServers = [
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
			const res = await timeout(options.timeout, fetch(url, fetchOpt));
			const duration = Date.now() - start;
			const halfDuration = Math.round(duration / 2);

			let ms = await process(res.xhr);
			if (opt.compensate) ms -= halfDuration;
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
