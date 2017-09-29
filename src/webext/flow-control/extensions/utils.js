// @flow

type StatusOk = void;
type StatusFail = { [string]:string }; // redux-form SubmissionError style keys ie: _error for whole form
type StatusResolve = StatusOk => void
type StatusPromise = Promise<StatusOk | StatusFail>
export type StatusInjection = { promise:StatusPromise, resolve:StatusResolve }
export function injectStatusPromise<T>(action: T): T {
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

export function deleteUndefined(obj: {}) {
    // mutates obj
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) delete obj[k];
    }
    return obj;
}
