// @flow

import { select, takeEvery, call, put, race } from 'redux-saga/effects'
import { delay } from 'redux-saga'
import Zip from 'jszip'

import { addFile, deleteFile } from '../files'
import { get_webstore_url, get_crx_url, get_webstore_name, get_extensionID } from '../../cws_pattern'
import { omit } from 'cmn/lib/all'
import { injectStatusPromise, blobToDataUrl, dataUrlToBlob, blobToArrBuf, crxToZip, arrBufToDataUrl, deleteUndefined } from './utils'

import type { StatusInjection } from './utils'
import type { FileId } from '../files'

const A = ([actionType]: string[]) => 'EXTENSIONS_' + actionType; // Action type prefixer

export const sagas = [];

const STATUS = {
    DOWNLOADING: 'DOWNLOADING',
    PARSEING: 'PARSEING', // get meta info - unzipping
    CONVERTING: 'CONVERTING',
    SIGNING: 'SIGNING'
}

type Id = string;
type Kind = 'cws' | 'amo' | 'ows';
type Status = string; // $Keys<typeof STATUS>; // for some reason stupid flow is not recognizing $Keys
type Entry = {
    kind: Kind,
    date: number, // listing check date - udated when donwnload is started
    storeUrl: string,
    listingTitle: string, // title of the listing on the store
    status: Status,
    hasInstalled?: true, // once installed, no need to keep it highlighted.
    fileId?: FileId, // crx file id once downloaded
    zipFileId?: FileId,
    xpiFileId?: FileId, // once converted
    signedFileId?: FileId, // once signed
    //
    // status === DOWNLOADING
    progress?: number, // percent 0-100 // while downloading
    // status >= DOWNLOADING
    size?: number, // once downloaded
    // status > PARSEING
    name?: string, // once parseed
    version?: string, // once parseed
}

export type Shape = {
    [Id]: Entry
}

const INITIAL = {};

//
const ADD = A`ADD`;
type AddAction = { type:typeof ADD, entry:Entry };
const add = (entry): AddAction => ({ type:ADD, entry });

//
const DELETE = A`DELETE`;
type DeleteAction = { type:typeof DELETE, idOrIds:Id|Id[] };
const del = (idOrIds): DeleteAction => ({ type:DELETE, idOrIds });

//
const UPDATE = A`UPDATE`;
// type UpdateAction = { type:typeof UPDATE, id:Id, data:$Shape<Entry> };
type UpdateAction = { type:typeof UPDATE, id:Id, data:Entry };
const update = (id, data): UpdateAction => ({ type:UPDATE, id, data });

//
// storeUrl is webstore url - one that matches return of cws_pattern.js :: get_webstore_url
const REQUEST_ADD = A`REQUEST_ADD`;
type RequestAddAction = { type:typeof REQUEST_ADD, storeUrl:string, ...StatusInjection };
const requestAdd = (storeUrl): RequestAddAction => injectStatusPromise({ type:REQUEST_ADD, storeUrl });

function* requestAddWorker(action: RequestAddAction) {
    const { storeUrl, resolve } = action;


    const storeUrlFixed = get_webstore_url(storeUrl);
    if (!storeUrlFixed) return resolve({ storeUrl:'Not a valid store URL.' });
    console.log('storeUrlFixed:', storeUrlFixed);

    const storeName = get_webstore_name(storeUrl);
    if (!['cws'].includes(storeName)) return resolve({ storeUrl:`Extensions from ${storeName.toUpperCase()} are not supported.` });

    // check for duplicates
    const { extensions } = yield select();
    const exists = !!Object.values(extensions).find( ({ storeUrl:aStoreUrl }) => aStoreUrl === storeUrlFixed );
    if (exists) return resolve({ storeUrl:'You have previously already downloaded this extension' });

    // validate
    let listingTitle;
    {
        let res, timeout;
        try { ({ res, timeout } = yield race({ timeout:call(delay, 10000), res:call(fetch, storeUrlFixed) })) }
        catch(ex) { return resolve({ _error:'Unhandled error while validating URL: ' + ex.message }) }
        if (timeout) return resolve({ _error:'Connection timed out, please try again later.' });
        if (res.status !== 200) return resolve({ storeUrl:`Invalid status of "${res.status}" at URL.` });
        const html = yield call([res, res.text]);
        listingTitle = html.match(/<title>(.+?)<\/title>/)[1];
    }

    resolve();

    const id = yield call(getId);
    yield put(add({
        id,
        kind: storeName,
        storeUrl: storeUrlFixed,
        listingTitle,
        date: Date.now()
    }));

    yield put(requestDownload(id));
}
function* requestAddWatcher() {
    yield takeEvery(REQUEST_ADD, requestAddWorker);
}
sagas.push(requestAddWatcher);

//
const REQUEST_DOWNLOAD = A`REQUEST_DOWNLOAD`;
type RequestDownloadAction = { type:typeof REQUEST_DOWNLOAD, id:Id };
const requestDownload = (id): RequestDownloadAction => ({ type:REQUEST_DOWNLOAD, id })
const downloading: {[Id]:true} = {};
function* requestDownloadWorker(action: RequestDownloadAction) {
    const { id } = action;

    if (id in downloading) return; // already downloading

    const {extensions:{ [id]:extension }} = yield select();

    if (!extension) return; // not a valid extension id

    downloading[id] = true;
    yield put(update(id, { status:STATUS.DOWNLOADING, progress:0 }));

    const { storeUrl } = extension;
    const url = yield call(get_crx_url, storeUrl);
    console.log('url:', url)

    let fileBlob;
    {
        let res, timeout;
        try { res = yield call(fetch, url) }
        catch(ex) { return } //  resolve({ _error:'Unhandled error while validating URL: ' + ex.message })
        if (res.status !== 200) return; // resolve({ storeUrl:`Invalid status of "${res.status}" at URL.` });
        fileBlob = yield call([res, res.blob]);
    }

    console.log('fileBlob:', fileBlob);
    const fileDataUrl = yield call(blobToDataUrl, fileBlob);
    const fileId = yield (yield put(addFile(fileDataUrl))).promise;
    console.log('fileId:', fileId);

    yield put(update(id, { fileId, size:fileBlob.size, status:undefined, progress:undefined }));
    delete downloading[id];

    yield put(requestParse(id));
}
function* requestDownloadWatcher() {
    yield takeEvery(REQUEST_DOWNLOAD, requestDownloadWorker);
}
sagas.push(requestDownloadWatcher);

//
const REQUEST_PARSE = A`REQUEST_PARSE`;
type RequestParseAction = { type:typeof REQUEST_PARSE, id:Id };
const requestParse = (id): RequestParseAction => ({ type:REQUEST_PARSE, id })
const parseing: { [Id]:true } = {};
function* requestParseWorker(action: RequestParseAction) {
    const { id } = action;

    if (id in parseing) return; // already parseing

    const state = yield select();
    const {extensions:{ [id]:extension }} = state;

    if (!extension) return; // not a valid extension id

    parseing[id] = true;
    yield put(update(id, { status:STATUS.PARSEING }));

    const { fileId } = extension;

    const {files:{ [fileId]:{ data:dataurl } }} = state;

    if (!dataurl) return; // no file for such a extension id
    console.log('dataurl:', dataurl);

    const blob = yield call(dataUrlToBlob, dataurl);

    // turn blob into zip - blob is a crx
    const buf = yield call(blobToArrBuf, blob);
    const zipBuf = crxToZip(buf);

    const zip = yield call(Zip.loadAsync, zipBuf);

    const manifest = JSON.parse(yield call([zip.file('manifest.json'), 'async'], 'string'));
    console.log('manifest', manifest);

    const { version } = manifest;
    let { name } = manifest;
    if (name.startsWith('__MSG')) {
        // get default localized name
        const defaultLocale = manifest.default_locale;
        const messages = JSON.parse(yield call([zip.file(`_locales/$defaultLocale/messages.json`), 'async'], 'string'));
        const nameKey = name.substring('__MSG_'.length, name.length-2);
        console.log('messages nameKey:', nameKey);
        name = messages[nameKey].message;
        console.log('name:', name);
    }

    const zipDataUrl = yield call(arrBufToDataUrl, zipBuf, 'application/zip');
    const zipFileId = yield (yield put(addFile(zipDataUrl))).promise;

    yield put(update(id, { zipFileId, version, name, status:undefined }));
    delete parseing[id];

    yield put(requestConvert(id));
}
function* requestParseWatcher() {
    yield takeEvery(REQUEST_PARSE, requestParseWorker);
}
sagas.push(requestParseWatcher);

//
const REQUEST_CONVERT = A`REQUEST_CONVERT`;
type RequestConvertAction = { type:typeof REQUEST_CONVERT, id:Id };
const requestConvert = (id): RequestConvertAction => ({ type:REQUEST_CONVERT, id })
const converting: { [Id]:true } = {};
function* requestConvertWorker(action: RequestConvertAction) {
    const { id } = action;

    if (id in converting) return; // already converting

    const state = yield select();
    const {extensions:{ [id]:extension }} = state;

    if (!extension) return; // not a valid extension id

    converting[id] = true;
    yield put(update(id, { status:STATUS.CONVERTING }));

    const { zipFileId, storeUrl } = extension;

    const {files:{ [zipFileId]:{ data:zipDataUrl } }} = state;

    if (!zipDataUrl) return; // no zip file for such a extension id
    console.log('zipDataUrl:', zipDataUrl);

    const zipBlob = yield call(dataUrlToBlob, zipDataUrl);
    const zip = yield call(Zip.loadAsync, zipBlob);
    console.log('zipppp:', zip);

    const extId = get_extensionID(storeUrl);
    const manifest = JSON.parse(yield call([zip.file('manifest.json'), 'async'], 'string'));
    console.log('manifest', manifest);
    manifest.applications = {
        gecko: {
            id: extId + '@chrome-store-foxified-unsigned'
        }
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    const xpiDataUrl = 'data:application/zip;base64,' + (yield call([zip, zip.generateAsync], { type:'base64' }));
    console.log('xpiDataUrl:', xpiDataUrl);
    const xpiFileId = yield (yield put(addFile(xpiDataUrl))).promise;
    console.log('xpiFileId:', xpiFileId);

    yield put(update(id, { xpiFileId, status:undefined }));
    delete converting[id];

    yield put(deleteFile(zipFileId));

}
function* requestConvertWatcher() {
    yield takeEvery(REQUEST_CONVERT, requestConvertWorker);
}
sagas.push(requestConvertWatcher);

let NEXT_ID = -1;
function* getId() {
    if (NEXT_ID === -1) {
        const { extensions } = yield select();
        const ids = Object.keys(extensions);
        if (ids.length) NEXT_ID = Math.max(...ids);
    }
    return ++NEXT_ID;
}

//
type Action =
  | AddAction
  | DeleteAction
  | UpdateAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case DELETE: {
            const { idOrIds } = action;
            const ids = !Array.isArray(idOrIds) ? [idOrIds] : idOrIds;
            return omit({ ...state }, ...ids);
        }
        case ADD: {
            const { entry, entry:{ id } } = action;
            return { ...state, [id]:entry };
        }
        case UPDATE: {
            const { id, data } = action;
            const dataOld = state[id];
            const idNew = 'id' in data ? data.id : id;
            const dataNew = deleteUndefined({ ...dataOld, ...data });
            return { ...state, [idNew]:dataNew };
        }
        default: return state;
    }
}

export type { Entry, Status }
export { requestAdd, STATUS, requestDownload, requestParse, requestConvert }
