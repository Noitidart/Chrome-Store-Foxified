// @flow

import { delay } from 'redux-saga'
import { take, takeEvery, call, put, select, all } from 'redux-saga/effects'
// import { depth0Or1Equal } from 'cmn/lib/recompose'
import shallowEqual from 'recompose/shallowEqual'
import { isObject } from 'cmn/lib/all'

import { deleteUndefined, getIdSaga, getId } from '../utils'
import { splitActionId } from './utils'

import { canAdd } from '../extensions'

import type { IOEffect } from 'redux-saga/effects'

type ActionStatus = {
    code?: string,
    placeholders?: string[], // for use when do extension.i18n.getMessage(`PINGUP_${status}`, placeholders)
    other?: string, // `${key}_${id}` of other things status to show in here
    errors?: {}, // for redux form
    reply?: {}
}

type StatusError = 'ERROR' // | 'ERROR_*'
type StatusDone = 'OK' | StatusError;

export type Shape = {
    isLoggedIn?: string,
    isOffline?: string,
    isDown?: string,
    isAgree?: string,
    isCwsDown?: string,
}

const INITIAL = {}
export const sagas = [];

const A = ([actionType]: string[]) => 'API_' + actionType;

const SERVER = 'https://addons.mozilla.org';
const CWS_SERVER = 'https://chrome.google.com/';

// selector's
const isServerDown = function* isServerDown() { return yield select(state => state.api.isDown) }
const isCwsDown = function* isCwsDown() { return yield select(state => state.api.isCwsDown) }

// utils
type ApiAction = Action | { actionId?:string }
type UpdateThis = (thisData?:{}, otherData?:{}) => UpdateAction
const standardApi = function* standardApi(isMulti: boolean, apiKey: string, actionId?:Id): Generator<IOEffect, { actionId:Id, updateThis:UpdateThis }, any> {

    if (isMulti) {
        if (actionId === undefined) actionId = yield call(getId);
        if (!actionId.startsWith(`${apiKey})`)) actionId = `${apiKey}_${actionId}`;
    } else {
        actionId = apiKey;
    }

    const updateThis: UpdateThis = (thisData, otherData) => update({ [actionId]:thisData, ...otherData });

    return { actionId, updateThis };
}

// yielders/take's - can do like `yield take(SERVER_UP)`
const SERVER_UP = ({ type, data }) => type === UPDATE && 'isDown' in data && !data.isDown
const CWS_UP = ({ type, data }) => type === UPDATE && 'isCwsDown' in data && !data.isCwsDown

//
const SET = A`SET`;
type SetAction = { type:typeof SET, data:{} };
const set = (dataOrKey: {} | string, valueIfKey: ?any): SetAction => ({ type:SET, data:typeof dataOrKey === 'string' ? { [dataOrKey]:valueIfKey } : dataOrKey  });

//
const UPDATE = A`UPDATE`;
type UpdateAction = { type:typeof UPDATE, key?:string, data:$Shape<Shape> };
const update = (data): UpdateAction => ({ type:UPDATE, data });

// pings internet until it is back up
const PING_OFFLINE = A`PING_OFFLINE`;
type PingOfflineAction = { type:typeof PING_OFFLINE, reason:string };
const pingOffline = (reason): PingOfflineAction => ({ type:PING_OFFLINE, reason });

const pingOfflineSaga = function* pingOfflineSaga(): Generator<IOEffect, void, any> {

    const { updateThis, actionId } = yield call(standardApi, false, 'pingOffline');

    while (true) {
        const { reason } = yield take(PING_OFFLINE);

        yield put(set('isOffline', reason));

        while(true) {
            const OFFLINE_SERVERS = ['http://duckduckgo.com/'];

            yield put(set({ code:'FETCHING', placeholders:undefined }));
            const responses = yield all(OFFLINE_SERVERS.map(server => call(fetch200, server)));

            if (responses.includes(true)) {
                yield put(updateThis(undefined));
                break;
            } else {
                yield put(updateThis({ code:'WAITING', placeholders:['5'] }));
                yield call(delay, 5000);
            }
        }
    }
}
sagas.push(pingOfflineSaga);

async function fetch200(url) {
    let res;
    try {
        res = await fetch(url);
    } catch(err) {
        throw new Error(`fetch200 :: Fetch errored with message: ${err.message}`);
    }
    if (res.status === 200) {
        return true;
    } else {
        throw new Error('fetch200 :: Fetch did not get 200 status');
    }
}

//
const FETCH_CWS = A`FETCH_CWS`;
type FetchCwsAction = { type:typeof FETCH_CWS, input:string, init?:{}, actionId:string };
const fetchCws = (actionId:Id, input:string, init?:{}): FetchCwsAction => ({ type:FETCH_CWS, actionId, input, init });

const fetchCwsWorker = function* fetchCwsWorker(action: FetchCwsAction): Generator<IOEffect, void, any> {
    const { updateThis, actionId } = yield call(standardApi, true, 'fetchCws', action.actionId);
    while (true) {
        if (call(isCwsDown)) {
            yield put(updateThis({ other:'pingCwsDown' }));
            yield take(CWS_UP);
        }

        let res;
        try {
            res = yield call(fetch, action.input, action.init);
        } catch(ex) {
            // is offline probably
            console.log('fetchCws :: fetch ex:', ex.message);
            yield put(pingOffline(ex.message));
            yield put(updateThis({ other:'pingOffline' }));
            continue;
        }

        if (res.status >= 500) {
            // yield put(pingCwsDown(ex.message));
            continue;
        }

        return res;
    }
}
const fetchCwsWatcher = function* fetchCwsWatcher() {
    yield takeEvery(FETCH_CWS, fetchCwsWorker);
}
sagas.push(fetchCwsWorker);

//
const VALIDATE = 'VALIDATE';
type ValidateAction = { type:typeof VALIDATE, actionId:Id, values:{| fileDataUrl?:string, storeUrl?:string, actionId?:Id |} };
const validate = (actionId, values): ValidateAction => ({ type:VALIDATE, values, actionId });

const validateWorker = function* validateWorker(action: ValidateAction): Generator<any, void, any> {

    const { updateThis, actionId } = yield call(standardApi, 'validate', action);

    console.log('received action:', action);

    yield put(updateThis({ code:'VALIDATING' }));

    try {
        yield call(canAdd, action);
    } catch(errors) {
        console.error('errors:', errors);
        yield put(updateThis({ errors }));
        return;
    }

    if (action.storeUrl) {
        const id = yield call(getId);
        const actionId = `fetchCws_${id}`;
        yield put(fetchCws(actionId, action.storeUrl))
        yield put(updateThis({ other:actionId }));
    }
    // // validate
    // let listingTitle;
    // {
    //     let res, timeout;
    //     try { ({ res, timeout } = yield race({ timeout:call(delay, 10000), res:call(fetch, storeUrlFixed) })) }
    //     catch(ex) { return resolve({ _error:'Unhandled error while validating URL: ' + ex.message }) }
    //     if (timeout) return resolve({ _error:'Connection timed out, please try again later.' });
    //     if (res.status !== 200) return resolve({ storeUrl:`Invalid status of "${res.status}" at URL.` });
    //     const html = yield call([res, res.text]);
    //     listingTitle = html.match(/<title>(.+?)<\/title>/)[1];
    // }

    // resolve();

    // const id = yield call(getIdSaga, 'extensions');
    // yield put(add({
    //     id,
    //     kind: storeName,
    //     storeUrl: storeUrlFixed,
    //     listingTitle,
    //     date: Date.now()
    // }));

    // yield put(process(id));

    yield call(delay, 5000);

    yield put(updateThis({ code:'OK' }));
}
const validateWatcher = function* validateWatcher() {
    yield takeEvery(VALIDATE, validateWorker);
}
sagas.push(validateWorker);

//
const DOWNLOAD = 'DOWNLOAD';
type DownloadAction = { type:typeof DOWNLOAD, values:{| actionId?:Id |} };
const download = (values): DownloadAction => ({ type:DOWNLOAD, values });

const downloadSaga = function* downloadSaga(): Generator<IOEffect, void, any> {
    while (true) {
        const action: DownloadAction = yield take(DOWNLOAD);
        const { values } = action;
        console.log('in download saga, values:', values);

        const { updateThis, actionId } = yield call(standardApi, 'download', action);

        yield put(updateThis({ code:'FETCHING' }));

        yield call(delay, 5000);

        yield put(updateThis({ code:'OK' }));
    }
}
sagas.push(downloadSaga);

//
type StepableAction = // an action that can be resumed? so actions should be split at which point data needs to be saved in order for a resume?
  | typeof VALIDATE
  | typeof SIGN
  | typeof VALIDATE
  | typeof DOWNLOAD;

//
type Action =
  | UpdateAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case UPDATE: {
            const { data } = action;

            console.log('in update reducer, data:', data);

            const stateNew = { ...state };
            const cleanKeys = {};

            console.log('will loop');

            for (const [keyFull, value] of Object.entries(data)) {
                const [key, id] = splitActionId(keyFull);
                if (id === undefined) {
                    const valueOld = state[key];
                    stateNew[key] = value === undefined ? undefined : { ...valueOld, ...value };
                } else {
                    console.log('building from valueOld');
                    const valueOld = state[key][id];
                    console.log('valueOld:', valueOld, 'value:', value);
                    cleanKeys[key] = 1;
                    stateNew[key] = {
                        ...state[key],
                        [id]: value === undefined ? undefined : {
                            ...valueOld,
                            ...value
                        }
                    };
                }
            }

            console.log('will deleteUndefined');
            for (const key of Object.keys(cleanKeys)) {
                deleteUndefined(stateNew[key]);
            }
            return deleteUndefined(stateNew);
        }
        case SET: {
            const { data } = action;
            return { ...state, ...data }
        }
        default: return state;
    }
}

export type { ActionStatus }
export { SERVER, validate, download, update }
