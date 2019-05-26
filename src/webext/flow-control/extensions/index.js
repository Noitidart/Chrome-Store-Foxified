// @flow

import { select, takeEvery, take, call, put, race } from 'redux-saga/effects'
import { delay } from 'redux-saga'
import Zip from 'jszip'
import qs from 'qs'
import { calcSalt } from 'cmn/lib/all'

import { addFile, deleteFile } from '../files'
import { get_webstore_url, get_crx_url, get_webstore_name, get_extensionID } from '../../cws_pattern'
import { omit } from 'cmn/lib/all'
import { injectStatusPromise, blobToDataUrl, dataUrlToBlob, blobToArrBuf, crxToZip, arrBufToDataUrl, deleteUndefined, fetchEpoch, getBase64FromDataUrl, hashCode, generateJWTToken, parseGoogleJson } from './utils'
import { getId, getIdSaga } from '../utils'
import fetchFronted from '../../lib/fetch-frontend';

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
type Kind = 'cws' | 'amo' | 'ows' | 'file' | 'msft';
type Status = string; // $Keys<typeof STATUS>; // for some reason stupid flow is not recognizing $Keys
type Entry = {
    id: Id,
    kind: Kind,
    date: number, // listing check date - udated when donwnload is started
    storeUrl?: string,
    fileId?: FileId, // crx file id once downloaded or if browesd from computer
    listingTitle: string, // title of the listing on the store
    status: Status,
    statusExtra: null
        | { validationUrl: string } // if status === "FAILED_REVIEW"
        | { progress: number } // if status "DOWNLOADING", "UPLOADING", number is 0 - 1
        | { resStatus: number, error: string } // if FAILED_UPLOAD
    ,
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
    //
    modedManifest?: string,
    origManifest?: string
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
type DeleteAction = { type:typeof DELETE, id:Id };
const deleteExtension = (id): DeleteAction => ({ type:DELETE, id });

//
const PATCH = A`PATCH`;
// type PutAction = { type:typeof PATCH, id:Id, data:$Shape<Entry> };
type PatchAction = { type:typeof PATCH, id:Id, data:Entry };
const patch = (id, data): PatchAction => ({ type:PATCH, id, data });

//
const CHECK_UPDATE = A`CHECK_UPDATE`;
type CheckUpdateAction = { type:typeof CHECK_UPDATE, id:Id, ...StatusInjection };
const checkUpdate = (id: Id): CheckUpdateAction => injectStatusPromise({ type:CHECK_UPDATE, id });

function* checkUpdateWorker(action: CheckUpdateAction) {
    const { id, resolve } = action;

    const {extensions:{ [id]:extension }} = yield select();

    if (!extension) {
        console.warn('no such extension with id:', id);
        return;
    }

    const { storeUrl, version } = extension;

    const url = yield call(get_crx_url, storeUrl);
    const res = yield call(fetch, url);
    const blob = yield call([res, res.blob]);

    const zipBuf = crxToZip(yield call(blobToArrBuf, blob));
    const zip = yield call(Zip.loadAsync, zipBuf);
    const manifest = parseGoogleJson(yield call([zip.file('manifest.json'), 'async'], 'string'));
    const { version:versionNew } = manifest;

    if (versionNew !== version) resolve({ isUpdateAvailable:true, versionNew });
    else resolve({ isUpdateAvailable:false, versionNew });
}
function* checkUpdateWatcher() {
    yield takeEvery(CHECK_UPDATE, checkUpdateWorker);
}
sagas.push(checkUpdateWatcher);

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
        if (!['cws', 'ows'].includes(storeName)) return resolve({ storeUrl:`Extensions from ${storeName.toUpperCase()} are not supported.` });
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
        const manifest = parseGoogleJson(yield call([zip.file('manifest.json'), 'async'], 'string'));
        const { version } = manifest;
        let { name } = manifest;
        if (name.startsWith('__MSG')) {
            // get default localized name
            const defaultLocale = manifest.default_locale;
            const messages = parseGoogleJson(yield call([zip.file(`_locales/${defaultLocale}/messages.json`), 'async'], 'string'));
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

    resolve(id);

    yield put(process(id));
}
function* requestAddWatcher() {
    yield takeEvery(REQUEST_ADD, requestAddWorker);
}
sagas.push(requestAddWatcher);

//
const PROCESS = A`PROCESS`
type ProcessAction = { type:typeof PROCESS, id:Id, shouldForceUpload?:boolean };
const process = (id: Id, shouldForceUpload: boolean = false): ProcessAction => ({ type:PROCESS, id, shouldForceUpload });

function* processWorker(action: ProcessAction) {
    const { id, shouldForceUpload } = action;

    const {extensions:{ [id]:ext }, account:{ dontAutoUpload }} = yield select();

    let { signedFileId, xpiFileId, fileId } = ext;

    if (signedFileId === undefined && xpiFileId === undefined && fileId === undefined) {
        // its a store url which hasnt been downloaded yet - so download it
        yield put(patch(id, { status:STATUS.DOWNLOADING, statusExtra:{ progress:0 } }));

        const url = yield call(get_crx_url, ext.storeUrl);
        const res = yield call(fetch, url);
        const blob = yield call([res, res.blob]);
        const fileDataUrl = yield call(blobToDataUrl, blob);

        fileId = yield (yield put(addFile(fileDataUrl))).promise;
        yield put(patch(id, { statusExtra:{ progress:100 }, fileId }));
    }

    if (signedFileId === undefined && xpiFileId === undefined) {
        const {files:{ [fileId]:{ data:fileDataUrl }={} }} = yield select();

        // turn crx to zip and read manifest
        yield put(patch(id, { status:STATUS.PARSEING, statusExtra:undefined }));

        const blob = yield call(dataUrlToBlob, fileDataUrl);
        const zipBuf = crxToZip(yield call(blobToArrBuf, blob));
        const zip = yield call(Zip.loadAsync, zipBuf);
        console.log('got zip, will get manifestStr');
        const manifestStr = yield call([zip.file('manifest.json'), 'async'], 'string');
        console.log('manifestStr:', manifestStr);
        const manifest = parseGoogleJson(yield call([zip.file('manifest.json'), 'async'], 'string'));
        console.log('parsed, manifst:', manifest);
        const { version } = manifest;
        let { name } = manifest;
        if (name.startsWith('__MSG')) {
            // get default localized name
            const defaultLocale = manifest.default_locale;
            console.log('defaultLocale:', defaultLocale);
            const messagesStr = yield call([zip.file(`_locales/${defaultLocale}/messages.json`), 'async'], 'string');
            console.log('messagesStr:', messagesStr);
            const messages = parseGoogleJson(messagesStr);
            console.log('getting name');
            const nameKey = name.substring('__MSG_'.length, name.length-2);
            console.log('nameKey:', nameKey);
            const entry = Object.entries(messages).find( ([key]) => key.toLowerCase() === nameKey.toLowerCase() );
            name = entry[1].message;
        }
        console.log('outside of name');

        if (ext.kind !== 'file') yield put(patch(id, { version, name }));

        // convert zip to xpi
        yield put(patch(id, { status:STATUS.CONVERTING, statusExtra:undefined }));

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

        zip.file('manifest.json', JSON.stringify(manifestNew, null, 4));
        // application/x-xpinstall
        // const xpiDataUrl = 'data:application/zip;base64,' + (yield call([zip, zip.generateAsync], { type:'base64' }));
        const xpiDataUrl = 'data:application/x-xpinstall;base64,' + (yield call([zip, zip.generateAsync], { type:'base64' }));
        xpiFileId = yield (yield put(addFile(xpiDataUrl))).promise;
        yield put(patch(id, { xpiFileId }));

        if (ext.kind === 'file') yield put(deleteFile(ext.fileId));
    }

    // sign it
    if (!dontAutoUpload || (dontAutoUpload && shouldForceUpload)) { // eslint-disable-line no-extra-parens
        if (signedFileId === undefined) {

            // get user.key and user.secret everytime fresh, because user may have logged into another account
            yield put(patch(id, { status:'CREDENTIALING', statusExtra:undefined }));

            let userKey, userSecret;
            {
                const res = yield call(
                    fetchFronted,
                    `${AMO_DOMAIN}/en-US/developers/addon/api/key/`,
                    { credentials: 'include' }
                );
                const html = yield call([res, res.text]);

                if (html.includes('accept-agreement')) {
                    yield put(patch(id, { status:'NEEDS_AGREE', statusExtra:undefined }));
                    return;
                } else if (!html.includes('firefox/users/edit') && !html.includes('android/users/edit')) {
                    yield put(patch(id, { status:'NOT_LOGGED_IN', statusExtra:undefined }));
                    return;
                } else {
                    const keyInputHtmlPatt = /input[^<]+jwtkey[^>]+/i;
                    const secretInputHtmlPatt = /input[^<]+jwtsecret[^>]+/i

                    let keyInputHtml, secretInputHtml;

                    [ keyInputHtml ] = keyInputHtmlPatt.exec(html) || [];
                    [ secretInputHtml ] = secretInputHtmlPatt.exec(html) || [];

                    const valuePatt = /value=["']?(.*?)["' /<]/i;

                    if (!keyInputHtml || !secretInputHtml) {
                        // need to generate keys

                        const [ tokenHtml ] = /input[^<]+csrfmiddlewaretoken[^>]+/i.exec(html) || [];
                        if (!tokenHtml) return yield put(patch(id, { status:'Could not generate credentials - please report this bug at https://github.com/Noitidart/Chrome-Store-Foxified/issues.', statusExtra:undefined }));

                        const [, token ] = valuePatt.exec(tokenHtml) || [];
                        if (!token) return yield put(patch(id, { status:'Could not extract token for credentials - please report this bug at https://github.com/Noitidart/Chrome-Store-Foxified/issues.', statusExtra:undefined }));


                        const res = yield call(
                            fetchFronted,
                            `${AMO_DOMAIN}/en-US/developers/addon/api/key/`,
                            {
                                method: 'POST',
                                credentials: 'include',
                                headers: {
                                    Referer: `${AMO_DOMAIN}/en-US/developers/addon/api/key/`,
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                },
                                body: qs.stringify({
                                    csrfmiddlewaretoken: token,
                                    action: 'generate'
                                })
                            }
                        );
                        const html2 = yield call([res, res.text]);

                        [ keyInputHtml ] = keyInputHtmlPatt.exec(html2) || [];
                        [ secretInputHtml ] = secretInputHtmlPatt.exec(html2) || [];
                    }

                    if (!keyInputHtml || !secretInputHtml) return yield put(patch(id, { status:'Could not extract generated credentials - please report this bug at https://github.com/Noitidart/Chrome-Store-Foxified/issues.', statusExtra:undefined }));

                    [, userKey ] = valuePatt.exec(keyInputHtml) || [];
                    [, userSecret ] = valuePatt.exec(secretInputHtml) || [];

                    if (!userKey || !userSecret) return yield put(patch(id, { status:'Could not credential values - please report this bug at https://github.com/Noitidart/Chrome-Store-Foxified/issues.', statusExtra:undefined }));
                }
            }

            // modify id in xpiBlob to use hash of user.id
            yield put(patch(id, { status:'MODING', statusExtra:undefined }));

            const userHash = hashCode(userKey);
            const {files:{ [xpiFileId]:{ data:xpiDataUrl }={} }} = yield select();
            const blob = yield call(dataUrlToBlob, xpiDataUrl);
            const zipBuf = crxToZip(yield call(blobToArrBuf, blob));
            const zip = yield call(Zip.loadAsync, zipBuf);
            const manifestTxt = yield call([zip.file('manifest.json'), 'async'], 'string');
            const manifestNewTxt = manifestTxt.replace('@chrome-store-foxified-unsigned', `@chrome-store-foxified-${userHash}`);
            zip.file('manifest.json', manifestNewTxt);
            const presignedBlob = yield call([zip, zip.generateAsync], { type:'blob' });

            // console.log('presignedBlob url:', URL.createObjectURL(presignedBlob));

            // upload
            const { version, applications:{gecko:{ id:signingId }}} = parseGoogleJson(manifestNewTxt);

            yield put(patch(id, { status:'UPLOADING', statusExtra:{ progress:0 } }));
            {
                const body = new FormData();
                body.append('Content-Type', 'multipart/form-data');
                const presignedFile = new File([presignedBlob], 'dummyname.xpi'); // http://stackoverflow.com/a/24746459/1828637
                body.append('upload', presignedFile);

                const res = yield call(
                    fetchFronted,
                    `${AMO_DOMAIN}/api/v3/addons/${encodeURIComponent(signingId)}/versions/${version}`,
                    {
                        method: 'PUT',
                        credentials: 'include',
                        body,
                        headers: {
                            Authorization: 'JWT ' + (yield call(generateJWTToken, userKey, userSecret))
                        }
                    }
                );
                const reply = yield call([res, res.json]);
                console.log('UPLOADING res.status:', res.status, 'reply:', reply);

                if (![201, 202, 409].includes(res.status)) {
                    let error;
                    try {
                        ({ error } = reply); // yield call([res, res.json]));
                    } catch(ignore) {} // eslint-disable-line no-empty
                    console.log('error:', error);
                    return yield put(patch(id, { status:'FAILED_UPLOAD', statusExtra:{ resStatus:res.status, error } }));
                    // return yield put(patch(id, { status:`Failed to upload to AMO. ${error || `It is likely this extension will also fail manual upload.`}`, statusExtra:undefined }));
                }
            }

            // wait for review - and get downloadUrl
            let downloadUrl;
            {
                while(true) {
                    yield put(patch(id, { status:'CHECKING_REVIEW', statusExtra:undefined }));

                    const res = yield call(
                        fetchFronted,
                        `${AMO_DOMAIN}/api/v3/addons/${encodeURIComponent(signingId)}/versions/${version}`,
                        {
                            credentials: 'include',
                            headers: {
                                Authorization: 'JWT ' + (yield call(generateJWTToken, userKey, userSecret))
                            }
                        }
                    );
                    const reply = yield call([res, res.json]);
                    console.log('CHECKING res.status:', res.status, 'reply:', reply);

                    if (res.status !== 200) {
                        let error;
                        try {
                            ({ error } = reply); // yield call([res, res.json]));
                        } catch(ignore) {} // eslint-disable-line no-empty
                        return yield put(patch(id, { status:`Failed to upload to AMO. ${error || ''}`, statusExtra:undefined }));
                    }

                    const { processed, validation_results, reviewed, passed_review, files:[ file ], validation_url } = reply;
                    const isDownloadReady = !!file;

                    if (isDownloadReady) {
                        // ok review complete and approved - download it
                        downloadUrl = file.download_url;
                        break;
                    } else {
                        // not yet signed, maybe failed?
                        console.log('processed:', processed, 'validation_results:', validation_results, 'reviewed:', reviewed, 'passed_review:', passed_review);
                        if (processed && validation_results && !validation_results.success) return yield put(patch(id, { status:'FAILED_REVIEW', statusExtra:{ validationUrl:validation_url } }));
                        // if (reviewed && !passed_review) return yield put(patch(id, { status:'FAILED_REVIEW', statusExtra:{ validationUrl:validation_url } }));
                        else {
                            for (let i=10; i>=1; i--) {
                                yield put(patch(id, { status:'WAITING_REVIEW', statusExtra:{ sec:i } }));
                                yield call(delay, 1000);
                            }
                        }
                    }
                }
            }

            // download it
            yield put(patch(id, { status:'DOWNLOADING_SIGNED', statusExtra:{ progress:0 } }));
            {
                console.log('downloadUrl:', downloadUrl);
                const res = yield call(fetch, downloadUrl, {
                    credentials: 'include',
                    headers: {
                        Authorization: 'JWT ' + (yield call(generateJWTToken, userKey, userSecret))
                    }
                });
                console.log('DOWNLOADING res.status:', res.status);

                if (res.status !== 200) {
                    let error;
                    try {
                        ({ error } = yield call([res, res.json]));
                    } catch(ignore) {} // eslint-disable-line no-empty
                    return yield put(patch(id, { status:`Failed to download from AMO. ${error || ''}`, statusExtra:undefined }));
                }

                const blob = yield call([res, res.blob]);
                const signedDataUrl = yield call(blobToDataUrl, blob);

                const signedFileId = yield (yield put(addFile(signedDataUrl))).promise;
                yield put(patch(id, { signedFileId }));
            }

            yield put(patch(id, { status:undefined, statusExtra:undefined }));

            yield put(install(id, true));
        }
    } else {
        yield put(patch(id, { status:undefined, statusExtra:undefined }));
        yield put(install(id, false));
    }

}
function* processWatcher() {
    yield takeEvery(PROCESS, processWorker);
}
sagas.push(processWatcher);

//
const INSTALL = A`INSTALL`;
type InstallAction = { type:typeof INSTALL, id:Id, signed:boolean };
const install = (id, signed): InstallAction => ({ type:INSTALL, id, signed })
function* installWorker(action: InstallAction) {
    const { id, signed } = action;

    const state = yield select();

    const {extensions:{ [id]:extension }} = state;
    if (!extension) return; // not a valid extension id
    const fileIdKey = signed ? 'signedFileId' : 'xpiFileId';
    const { [fileIdKey]:fileId } = extension;

    const {files:{ [fileId]:{ data:dataUrl }={} }} = state;
    if (!dataUrl) return; // no zip file for such a extension id

    const blob = yield call(dataUrlToBlob, dataUrl);
    const blobUrl = URL.createObjectURL(blob);

    yield call(extensiona, 'tabs.create', { url:blobUrl });

    // TODO: URL.revokeObjectURL(xpiUrl);


}
function* installWatcher() {
    yield takeEvery(INSTALL, installWorker);
}
sagas.push(installWatcher);

//
const SAVE = A`SAVE`;
type SaveAction = { type:typeof SAVE, id:Id, kind:'ext'|'unsigned'|'signed' };
const save = (id, kind): SaveAction => ({ type:SAVE, id, kind })
function* saveWorker(action: SaveAction) {
    const { id, kind:saveKind } = action;

    const state = yield select();
    const {extensions:{ [id]:extension }} = state;
    if (!extension) return; // not a valid extension id

    const { name, kind, listingTitle, version } = extension;

    const { fileIdKey, fileExt } = getSaveKindDetails(saveKind, kind);
    const { [fileIdKey]:fileId } = extension;
    console.log('fileId:', fileId);

    const {files:{ [fileId]:{ data:fileDataUrl }={} }} = state;
    console.log('fileDataUrl:', fileDataUrl);
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

function getSaveKindDetails(saveKind, kind) {
    switch (saveKind) {
        case 'ext': {
            switch (kind) {
                case 'cws': return { fileIdKey:'fileId', fileExt:'crx' };
                case 'ows': return { fileIdKey:'fileId', fileExt:'nex' };
                case 'file': return { fileIdKey:'fileId', fileExt:'crx' }; // TODO: how to get original file ext?
                default: throw new Error(`Unknown kind: "${kind}"`);
            }
        }
        case 'unsigned': return { fileIdKey:'xpiFileId', fileExt:'xpi' };
        case 'signed': return { fileIdKey:'signedFileId', fileExt:'xpi' };
        default: throw new Error(`Unknown save kind: "${saveKind}"`);
    }
}

//
type Action =
  | AddAction
  | DeleteAction
  | PatchAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case DELETE: {
            const { id } = action;
            return omit({ ...state }, id);
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
export { STATUS, install, save, requestAdd, process, deleteExtension, checkUpdate }
