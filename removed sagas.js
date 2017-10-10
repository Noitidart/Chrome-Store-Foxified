//
const REQUEST_DOWNLOAD = A`REQUEST_DOWNLOAD`;
type RequestDownloadAction = { type:typeof REQUEST_DOWNLOAD, id:Id };
const requestDownload = (id): RequestDownloadAction => ({ type:REQUEST_DOWNLOAD, id })
const downloading: {[Id]:true} = {};
function* requestDownloadWorker(action: RequestDownloadAction) {
    const { id } = action;

    if (id in downloading) return; // already downloading
    downloading[id] = true;

    const {extensions:{ [id]:extension }} = yield select();
    if (!extension) return delete downloading[id]; // not a valid extension id
    const { storeUrl } = extension;

    yield put(update(id, { status:STATUS.DOWNLOADING, progress:0 }));

    const url = yield call(get_crx_url, storeUrl);

    let fileBlob;
    {
        let res;
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
    parseing[id] = true;

    const state = yield select();

    const {extensions:{ [id]:extension }} = state;
    if (!extension) return delete parseing[id]; // not a valid extension id
    const { fileId } = extension;

    const {files:{ [fileId]:{ data:dataurl }={} }} = state;
    if (!dataurl) return delete parseing[id]; // no file for such a extension id

    yield put(update(id, { status:STATUS.PARSEING }));

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
        const messages = JSON.parse(yield call([zip.file(`_locales/${defaultLocale}/messages.json`), 'async'], 'string'));
        console.log('messages:', messages);
        const nameKey = name.substring('__MSG_'.length, name.length-2);
        console.log('messages nameKey:', nameKey);
        const entry = Object.entries(messages).find( ([key]) => key.toLowerCase() === nameKey.toLowerCase() );
        name = entry[1].message;
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
    converting[id] = true;

    const state = yield select();

    const {extensions:{ [id]:extension }} = state;
    if (!extension) return delete converting[id]; // not a valid extension id
    const { zipFileId, storeUrl } = extension;

    const {files:{ [zipFileId]:{ data:zipDataUrl }={} }} = state;
    if (!zipDataUrl) return delete converting[id]; // no zip file for such a extension id

    yield put(update(id, { status:STATUS.CONVERTING }));
    const zip = yield call(Zip.loadAsync, getBase64FromDataUrl(zipDataUrl), { base64:true });

    const extId = get_extensionID(storeUrl);
    const manifest = JSON.parse(yield call([zip.file('manifest.json'), 'async'], 'string'));
    console.log('manifest', manifest);
    manifest.applications = {
        gecko: {
            id: extId + '@chrome-store-foxified-unsigned'
        }
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    // mimetype of x-xpinstall is needed so when open in new tab it offers install, if its a zip it will offer to download
    const xpiDataUrl = 'data:application/x-xpinstall;base64,' + (yield call([zip, zip.generateAsync], { type:'base64' }));
    console.log('xpiDataUrl:', xpiDataUrl);
    const xpiFileId = yield (yield put(addFile(xpiDataUrl))).promise;
    console.log('xpiFileId:', xpiFileId);

    yield put(update(id, { xpiFileId, status:undefined }));
    delete converting[id];

    yield put(deleteFile(zipFileId));
    yield put(update(id, { zipFileId:undefined }));

    yield put(requestSign(id));
}
function* requestConvertWatcher() {
    yield takeEvery(REQUEST_CONVERT, requestConvertWorker);
}
sagas.push(requestConvertWatcher);

//
const REQUEST_SIGN = A`REQUEST_SIGN`;
type RequestSignAction = { type:typeof REQUEST_SIGN, id:Id };
const requestSign = (id): RequestSignAction => ({ type:REQUEST_SIGN, id })
const signing: { [Id]:true } = {};
function* requestSignWorker(action: RequestSignAction) {
    const { id } = action;

    if (id in signing) return; // already signing
    signing[id] = true;

    const state = yield select();

    const {extensions:{ [id]:extension }} = state;
    if (!extension) return delete signing[id]; // not a valid extension id
    const { xpiFileId } = extension;

    const {files:{ [xpiFileId]:fileEntry }} = state;
    if (!fileEntry) return delete signing[id]; // no zip file for such a extension id

    // // any time after this point, if amo goes down, it should restart from here - because what if user changed amo account
    yield put(update(id, { status:STATUS.SIGNING, signedStatus:SIGNED_STATUS.AMO_CREDING }));

    // // get user.key and user.secret everytime fresh, because user may have logged into another account
    // // holds: amo down, amo user not logged in, amo agreement not accepted
    // yield fork()
    const { userKey, userSecret } = yield take('AMO_SIGNING_CREDENTIALS');

    // try {
    //     const res = fetch(`${AMODOMAIN}/en-US/developers/addon/api/key/`);
    // } catch(ex) {
    //     console.error('res failed, catastrophic, ex:', ex.message);
    //     console.error('res failed, catastrophic, ex:', ex);
    //     return delete signing[id];
    // }
    // if (res.status !== 200) {
    //     yield fork()
    //     yield take('AMO_UP'); // wait for AMO to come back up
    // }

    // // modify id in xpiBlob to use hash of user.id
    yield put(update(id, { signedStatus:SIGNED_STATUS.MODING }));

    const zip = yield call(Zip.loadAsync, getBase64FromDataUrl(fileEntry.data), { base64:true });
    const manifest = JSON.parse(yield call([zip.file('manifest.json'), 'async'], 'string'));
    manifest.applications.gecko.id = manifest.applications.gecko.id.replace('@chrome-store-foxified-unsigned', `@chrome-store-foxified-${btoa(userKey).replace(/=\+\//g, '')}`);
    zip.file('manifest.json', JSON.stringify(manifest));
    const xpiBlob = yield call([zip, zip.generateAsync], { type:'blob' }); // with modded id

    // // get offset of system clock to unix clock - then calc corrected time
    yield put(update(id, { signedStatus:SIGNED_STATUS.TIMING }));
    const epoch = yield call(fetchEpoch);

    // // upload to amo - PUT - AMO_DOMAIN + '/api/v3/addons/' + encodeURIComponent(xpiid) + '/versions/' + xpiversion + '/'
    yield put(update(id, { signedStatus:SIGNED_STATUS.AMO_UPLOADING }));
    // // this version can already be uploaded, if it is, then check continue to check review status
    // // holds: amo down, amo user not logged in

    // // loop to keep checking auto review status - GET - AMODOMAIN + '/api/v3/addons/' + encodeURIComponent(xpiid) + '/versions/' + xpiversion + '/'
    yield put(update(id, { signedStatus:SIGNED_STATUS.AMO_REVIEWING }));
    // // if review failed then give up signing and let user know
    // // holds: amo down, amo user not logged in

    // // download signed
    yield put(update(id, { signedStatus:SIGNED_STATUS.AMO_DOWNLOADING }));
    // // holds: amo down, amo user not logged in



    // //
    // const xpiDataUrl = fileEntry.data;
    // const xpiBlob = yield call(dataUrlToBlob, xpiDataUrl);

    // yield put(update(id, { xpiFileId, status:undefined }));
    // delete signing[id];

    // yield put(deleteFile(zipFileId));
    // yield put(update(id, { zipFileId:undefined }));

}
function* requestSignWatcher() {
    yield takeEvery(REQUEST_SIGN, requestSignWorker);
}
sagas.push(requestSignWatcher);
