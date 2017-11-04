// @flow

import { select, takeEvery, take, call, put, race } from 'redux-saga/effects'
import { delay } from 'redux-saga'
import Zip from 'jszip'
import { calcSalt } from 'cmn/lib/all'

import { addFile, deleteFile } from '../files'
import { get_webstore_url, get_crx_url, get_webstore_name, get_extensionID } from '../../cws_pattern'
import { omit } from 'cmn/lib/all'
import { injectStatusPromise, blobToDataUrl, dataUrlToBlob, blobToArrBuf, crxToZip, arrBufToDataUrl, deleteUndefined, fetchEpoch, getBase64FromDataUrl } from './utils'
import { getId, getIdSaga } from '../utils'

import type { StatusInjection } from './utils'
import type { FileId } from '../files'
import type { IOEffect } from 'redux-saga/effects'

const A = ([actionType]: string[]) => 'EXTENSIONS_' + actionType; // Action type prefixer

export const sagas = [];

const STATUS = {
    DOWNLOADING: 'DOWNLOADING',
    PARSEING: 'PARSEING', // get meta info - unzipping
    CONVERTING: 'CONVERTING',
    SIGNING: 'SIGNING'
}

const SIGNED_STATUS = {
    AMO_CREDING: 'AMO_CREDING', // getting amo user.key user.secret
    MODING: 'MODING',
    TIMING: 'TIMING',
    AMO_UPLOADING: 'AMO_UPLOADING',
    AMO_REVIEWING: 'AMO_REVIEWING',
    AMO_DOWNLOADING: 'AMO_DOWNLOADING'
}

const AMO_DOMAIN = 'https://addons.mozilla.org';

type Id = string;
type Kind = 'cws' | 'amo' | 'ows' | 'file';
type Status = string; // $Keys<typeof STATUS>; // for some reason stupid flow is not recognizing $Keys
type Entry = {
    kind: Kind,
    date: number, // listing check date - udated when donwnload is started
    storeUrl?: string,
    fileId?: FileId, // crx file id once downloaded or if browesd from computer
    listingTitle: string, // title of the listing on the store
    status: Status,
    hasInstalled?: true, // once installed, no need to keep it highlighted.
    zipFileId?: FileId,
    xpiFileId?: FileId, // once converted
    signedFileId?: FileId, // once signed
    signedStatus?: string, // status of signing process
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
const PATCH = A`PATCH`;
// type PutAction = { type:typeof PATCH, id:Id, data:$Shape<Entry> };
type PatchAction = { type:typeof PATCH, id:Id, data:Entry };
const patch = (id, data): PatchAction => ({ type:PATCH, id, data });

//
const REQUEST_ADD = A`REQUEST_ADD`;
type RequestAddAction = { type:typeof REQUEST_ADD, storeUrl:string, fileDataUrl:string, ...StatusInjection };
const requestAdd = ({ storeUrl, fileDataUrl }: { storeUrl:string, fileDataUrl:string }): RequestAddAction => injectStatusPromise({ type:REQUEST_ADD, storeUrl, fileDataUrl });

function* requestAddWorker(action: RequestAddAction) {
    const { storeUrl, fileDataUrl, resolve } = action;

    if (storeUrl && fileDataUrl) return resolve({ _error:'Must only input a one or the other, a store url OR a file from your computer, not both.' });

    let id, kind;
    if (storeUrl) {
        const storeUrlFixed = get_webstore_url(storeUrl);
        if (!storeUrlFixed) return resolve({ storeUrl:'Not a valid store URL.' });
        console.log('storeUrlFixed:', storeUrlFixed);

        const storeName = get_webstore_name(storeUrl);
        if (!['cws'].includes(storeName)) return resolve({ storeUrl:`Extensions from ${storeName.toUpperCase()} are not supported.` });
        kind = storeName;


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

        id = yield getIdSaga('extensions');

        yield put(add({
            id,
            kind,
            storeUrl: storeUrlFixed,
            listingTitle,
            date: Date.now()
        }));
    } else if (fileDataUrl) {
        // extract crx and check for duplicate ids
        kind = 'file';

        // turn crx to zip and read manifest
        const blob = yield call(dataUrlToBlob, fileDataUrl);
        const zipBuf = crxToZip(yield call(blobToArrBuf, blob));
        const zip = yield call(Zip.loadAsync, zipBuf);
        const manifest = JSON.parse(yield call([zip.file('manifest.json'), 'async'], 'string'));
        const { version } = manifest;
        let { name } = manifest;
        if (name.startsWith('__MSG')) {
            // get default localized name
            const defaultLocale = manifest.default_locale;
            const messages = JSON.parse(yield call([zip.file(`_locales/${defaultLocale}/messages.json`), 'async'], 'string'));
            const nameKey = name.substring('__MSG_'.length, name.length-2);
            const entry = Object.entries(messages).find( ([key]) => key.toLowerCase() === nameKey.toLowerCase() );
            name = entry[1].message;
        }

        // check if name, version already exist
        const { extensions } = yield select();
        for (const extension of Object.values(extensions)) {
            if (extension.name === name) {
                // duplicate found
                return resolve({ fileDataUrl:'You have previously already added this extension' });
            }
        }

        id = yield getIdSaga('extensions');

        yield put(add({
            id,
            fileId: yield (yield put(addFile(fileDataUrl))).promise,
            kind,
            name,
            version,
            date: Date.now()
        }));
    }

    resolve();

    yield put(process(id));
}
function* requestAddWatcher() {
    yield takeEvery(REQUEST_ADD, requestAddWorker);
}
sagas.push(requestAddWatcher);

//
const PROCESS = A`PROCESS`
type ProcessAction = { type:typeof PROCESS, id:Id };
const process = (id): ProcessAction => ({ type:PROCESS, id });

function* processWorker(action: ProcessAction) {
    const { id } = action;
    const {extensions:{ [id]:ext }} = yield select();

    let fileDataUrl;
    if (ext.kind === 'file') {
        ({files:{ [ext.fileId]:{ data:fileDataUrl }={} }} = yield select());
    } else {
        // download it
        yield put(patch(id, { status:STATUS.DOWNLOADING, progress:0 }));

        const url = yield call(get_crx_url, ext.storeUrl);
        const fileRes = yield call(fetch, url);
        const fileBlob = yield call([fileRes, fileRes.blob]);
        fileDataUrl = yield call(blobToDataUrl, fileBlob);

        yield put(patch(id, { progress:undefined }));
    }

    // turn crx to zip and read manifest
    yield put(patch(id, { status:STATUS.PARSEING }));

    const blob = yield call(dataUrlToBlob, fileDataUrl);
    const zipBuf = crxToZip(yield call(blobToArrBuf, blob));
    const zip = yield call(Zip.loadAsync, zipBuf);
    const manifest = JSON.parse(yield call([zip.file('manifest.json'), 'async'], 'string'));
    const { version } = manifest;
    let { name } = manifest;
    if (name.startsWith('__MSG')) {
        // get default localized name
        const defaultLocale = manifest.default_locale;
        const messages = JSON.parse(yield call([zip.file(`_locales/${defaultLocale}/messages.json`), 'async'], 'string'));
        const nameKey = name.substring('__MSG_'.length, name.length-2);
        const entry = Object.entries(messages).find( ([key]) => key.toLowerCase() === nameKey.toLowerCase() );
        name = entry[1].message;
    }

    if (ext.kind !== 'file') yield put(patch(id, { version, name }));

    // convert zip to xpi
    yield put(patch(id, { status:STATUS.CONVERTING }));

    const generatedPrefix = 'generated-';
    const extId = ext.storeUrl ? get_extensionID(ext.storeUrl) : `${generatedPrefix}${calcSalt({ len:32-generatedPrefix.length })}`;
    const manifestNew = {
        ...manifest,
        applications: {
            gecko: {
                id: extId + '@chrome-store-foxified-unsigned'
            }
        }
    };

    zip.file('manifest.json', JSON.stringify(manifestNew));
    // application/x-xpinstall
    // const xpiDataUrl = 'data:application/zip;base64,' + (yield call([zip, zip.generateAsync], { type:'base64' }));
    const xpiDataUrl = 'data:application/x-xpinstall;base64,' + (yield call([zip, zip.generateAsync], { type:'base64' }));
    const xpiFileId = yield (yield put(addFile(xpiDataUrl))).promise;
    yield put(patch(id, { xpiFileId, fileId:undefined, status:undefined }));

    if (ext.kind === 'file') yield put(deleteFile(ext.fileId));

    // sign it

}
function* processWatcher() {
    yield takeEvery(PROCESS, processWorker);
}
sagas.push(processWatcher);

//
const INSTALL_UNSIGNED = A`INSTALL_UNSIGNED`;
type InstallUnsignedAction = { type:typeof INSTALL_UNSIGNED, id:Id };
const installUnsigned = (id): InstallUnsignedAction => ({ type:INSTALL_UNSIGNED, id })
function* installUnsignedWorker(action: InstallUnsignedAction) {
    const { id } = action;

    const state = yield select();

    const {extensions:{ [id]:extension }} = state;
    if (!extension) return; // not a valid extension id
    const { xpiFileId } = extension;

    const {files:{ [xpiFileId]:{ data:xpiDataUrl }={} }} = state;
    if (!xpiDataUrl) return; // no zip file for such a extension id

    const xpiBlob = yield call(dataUrlToBlob, xpiDataUrl);
    const xpiBlobUrl = URL.createObjectURL(xpiBlob);

    yield call(extensiona, 'tabs.create', { url:xpiBlobUrl });

    // TODO: URL.revokeObjectURL(xpiUrl);


}
function* installUnsignedWatcher() {
    yield takeEvery(INSTALL_UNSIGNED, installUnsignedWorker);
}
sagas.push(installUnsignedWatcher);

//
const SAVE = A`SAVE`;
type SaveAction = { type:typeof SAVE, id:Id, kind:'ext'|'unsigned'|'signed' };
const save = (id, kind): SaveAction => ({ type:SAVE, id, kind })
function* saveWorker(action: SaveAction) {
    const { id, kind } = action;

    const { fileIdKey, fileExt } = getSaveKindDetails(kind);

    const state = yield select();

    const {extensions:{ [id]:extension }} = state;
    if (!extension) return; // not a valid extension id
    const { name, listingTitle, version, [fileIdKey]:fileId } = extension;

    const {files:{ [fileId]:{ data:fileDataUrl }={} }} = state;
    if (!fileDataUrl) return; // no zip file for such a extension id

    const fileBlob = yield call(dataUrlToBlob, fileDataUrl);
    const fileBlobUrl = URL.createObjectURL(fileBlob);

    yield call(extensiona, 'downloads.download', {
        filename: `${getName(name, listingTitle)}-${version}.${fileExt}`,
        saveAs: true,
        url: fileBlobUrl
    });

    // URL.revokeObjectURL(fileBlobUrl); // TODO: delete once download done

}
function* saveWatcher() {
    yield takeEvery(SAVE, saveWorker);
}
sagas.push(saveWatcher);

function getSaveKindDetails(kind) {
    switch (kind) {
        case 'ext': return { fileIdKey:'fileId', fileExt:'crx' };
        case 'unsigned': return { fileIdKey:'xpiFileId', fileExt:'xpi' };
        case 'signed': return { fileIdKey:'signedFileId', fileExt:'xpi' };
        default: throw new Error(`Unknown save kind: "${kind}"`);
    }
}

//
type Action =
  | AddAction
  | DeleteAction
  | PutAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case DELETE: {
            const { idOrIds } = action;
            const ids = !Array.isArray(idOrIds) ? [idOrIds] : idOrIds;
            return omit({ ...state }, ...ids);
        }
        case ADD: {
            const { entry } = action;
            if (!('id' in entry)) entry.id = getId('extensions', state)
            return { ...state, [entry.id]:entry };
        }
        case PATCH: {
            const { id, data } = action;
            const dataOld = state[id];
            // const idNew = 'id' in data ? data.id : id;
            // const dataNew = deleteUndefined({ ...dataOld, ...data });
            const dataNew = deleteUndefined({ ...dataOld, ...data, id }); // id repeated in here to ensure this is a patch
            // return { ...state, [idNew]:dataNew };
            return { ...state, [id]:dataNew };
        }
        default: return state;
    }
}

function getName(name, listingTitle) {
    return name || listingTitle.substr(0, listingTitle.lastIndexOf(' - '));
}

export type { Entry, Status }
export { STATUS, installUnsigned, save, requestAdd }
