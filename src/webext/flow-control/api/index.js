// @flow

import { delay } from 'redux-saga'
import { take, takeEvery, call, put, select, all } from 'redux-saga/effects'
import { depth0Or1Equal } from 'cmn/lib/recompose'
import shallowEqual from 'recompose/shallowEqual'

import { deleteUndefined, getId, getIdSync } from '../utils'
import { splitActionId } from './utils'

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
    isLoggedIn?: boolean,
    isOffline?: boolean,
    isDown?: string, // message for reason why i think its down
    isCwsDown?: string, // message for reason down
    pingCwsDown?: {
        code: 'FETCHING' | 'WAITING' | StatusDone,
        other?: 'pingOffline'
    },
    pingOffline: {
        code: 'FETCHING' | 'WAITING' | StatusDone
    },
    pingCwsDown?: {
        code: 'FETCHING' | 'WAITING' | StatusDone,
        other?: 'pingOffline'
    },
    pingDown?: {
        code: 'FETCHING' | 'WAITING' | StatusDone,
        other?: 'pingOffline'
    },
    pingLoggedIn?: { // ping if logged in
        code: 'FETCHING' | 'WAITING' | StatusDone,
        other?: 'pingDown' | 'pingOffline'
    },
    pingAgree?: {
        code: 'FETCHING' | 'WAITING' | StatusDone,
        other?: 'pingDown' | 'pingLoggedIn' | 'pingOffline'
    },
    sign?: {
        [Id]: {
            code: 'CREDING' | 'MODING' | 'TIMING' | 'UPLOADING' | 'REVIEWING' | 'DOWNLOADING' | StatusDone,
            other?: 'pingDown' | 'pingLoggedIn' | 'pingAgree' | 'pingOffline',
            error?: string
        }
    },
    validate?: {
        [Id]: {
            code: 'FETCHING',
            other?: 'pingCwsDown'
        }
    },
    fetch: {
        [Id]: {
            code: 'FETCHING' | 'WAITING',
            other?: 'pingDown' | 'pingOffline'
        }
    },
    download: {
        [Id]: {
            code: 'FETCHING' | 'WAITING',
            other?: 'pingCwsDown' | 'pingOffline'
        }
    }
}

const INITIAL = { // crossfile-link18381000 - must delcare empty objets for ones with `[Id]` - multi in parallel stuff
    download: {},
    fetch: {},
    sign: {},
    validate: {}
}
export const sagas = [];

const A = ([actionType]: string[]) => 'API_' + actionType;

const SERVER = 'https://addons.mozilla.org';
const CWS_SERVER = 'https://chrome.google.com/';

// selector's
const isServerDown = function* isServerUp() { return yield select(state => state.api.isDown) }

// yielders/take's - can do like `yield take(SERVER_UP)`
const SERVER_UP = ({ type, data }) => type === UPDATE && 'isDown' in data && !data.isDown

const fetchApi = function* fetchApi(input:string, init={}, update): Generator<IOEffect, void, any> {
    while (true) {
        if (call(isServerDown)) {
            yield put(update({ other:'pingDown' }));
            yield take(SERVER_UP);
        }

        init.headers = Object.assign({ Accept:'application/json', 'Content-Type':'application/json' }, init.headers);
        if (init.body) init.body = JSON.stringify(init.body);
        if (!input.startsWith('http')) input = `${SERVER}/api/${input}`;

        let res;
        try {
            res = yield call(fetch, input, init);
        } catch(ex) {
            // is offline probably
            console.log('fetchApi :: fetch ex:', ex.message);
            yield put(update({ isDown:ex.message }));
        }

        return res;
    }
}

//
const UPDATE = A`UPDATE`;
type UpdateAction = { type:typeof UPDATE, key?:string, data:$Shape<Shape> };
const update = (data): UpdateAction => ({ type:UPDATE, data });

// pings server until it is back up
const PING_OFFLINE = A`PING_OFFLINE`;
type PingOfflineAction = { type:typeof PING_OFFLINE };
const pingOffline = (): PingOfflineAction => ({ type:PING_OFFLINE });

const pingOfflineSaga = function* pingOfflineSaga(): Generator<IOEffect, void, any> {
    const updateThis = (thisData?:{}, otherData?:{}) => update({ isOffline:thisData, ...otherData });

    while (true) {
        yield take(PING_OFFLINE);

        while(true) {
            const OFFLINE_SERVERS = ['http://duckduckgo.com/'];

            yield put(updateThis({ code:'FETCHING', placeholders:undefined }));
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

// pings server until it is back up
const PING_DOWN = A`PING_DOWN`;
type PingDownAction = { type:typeof PING_DOWN };
const pingDown = (): PingDownAction => ({ type:PING_DOWN });

const pingDownSaga = function* pingDownSaga(): Generator<IOEffect, void, any> {
    const updateThis = (thisData?:{}, otherData?:{}) => update({ isLoggedIn:thisData, ...otherData });

    while (true) {
        yield take(PING_DOWN);

        while(true) {
            yield put(updateThis({ code:'FETCHING', placeholders:undefined }));

            let res;
            try {
                res = fetch(SERVER)
            } catch(ex) {
                console.warn('pingDownSaga fetch ex:', ex.message);
                yield put(updateThis({ code:'WAITING', placeholders:['5'] }));
                yield call(delay, 5000);
            }

            if (res.status === 200) {
                yield put(updateThis(undefined));
                break;
            }
        }
    }
}
sagas.push(pingDownSaga);

// pings server until it is back up
const PING_CWS_DOWN = A`PING_CWS_DOWN`;
type PingCwsDownAction = { type:typeof PING_CWS_DOWN };
const pingCwsDown = (): PingCwsDownAction => ({ type:PING_CWS_DOWN });

const pingCwsDownSaga = function* pingCwsDownSaga(): Generator<IOEffect, void, any> {
    const updateThis = (thisData?:{}, otherData?:{}) => update({ isCwsDown:thisData, ...otherData });

    while (true) {
        yield take(PING_CWS_DOWN);

        while (true) {
            yield put(updateThis({ code:'FETCHING', placeholders:undefined }));

            let res;
            try {
                res = fetch(CWS_SERVER)
            } catch(ex) {
                console.warn('pingCwsDownSaga fetch ex:', ex.message);
                yield call(delay, 5000)
                continue;
            }

            if (res.status === 200) {
                yield put(updateThis(undefined));
                break;
            }
        }
    }
}
sagas.push(pingCwsDownSaga);

// pings server until it is logged in
const PING_LOGGEDIN = A`PING_LOGGEDIN`;
type PingLoggedInAction = { type:typeof PING_LOGGEDIN };
const pingLoggedIn = (): PingLoggedInAction => ({ type:PING_LOGGEDIN });

const pingLoggedInSaga = function* pingLoggedInSaga(): Generator<IOEffect, void, any> {

    const updateThis = (thisData?:{}, otherData?:{}) => update({ isLoggedIn:thisData, ...otherData });

    while (true) {
        yield take(PING_LOGGEDIN);

        while (true) {
            yield put(updateThis({ code:'FETCHING' }));
            const res = yield call(fetchApi, SERVER);

            if (res.status === 401) {
                console.warn('pingLoggedInSaga still logged out, got 401');
                yield call(delay, 5000);
                continue;
            }

            if (res.status === 200) {
                yield put(updateThis(undefined));
                break;
            }
        }
    }
}
sagas.push(pingLoggedInSaga);

//
const SIGN = A`SIGN`;
type SignAction = { type:typeof SIGN, values:{| name:string, email:string, password:string, passwordConfirmation:string |} };
const sign = (values): SignAction => ({ type:SIGN, values });

const signSaga = function* sign(action: SignAction): Generator<IOEffect, void, any> {
    while (true) {
        const action: SignAction = yield take(SIGN);
        const { values } = action;
        console.log('in sign saga, values:', values);

        const { updateThis, actionId } = yield call(standardApi, 'validate', action);

        yield put(updateThis({ code:'FETCHING' }));

        yield call(delay, 5000);

        yield put(updateThis({ code:'OK' }));
    }
}
sagas.push(signSaga);

//
const VALIDATE = 'VALIDATE';
type ValidateAction = { type:typeof VALIDATE, values:{| fileDataUrl?:string, storeUrl?:string, actionId?:Id |} };
const validate = (values, actionId): ValidateAction => ({ type:VALIDATE, values, actionId });

const validateSaga = function* validateSaga(): Generator<IOEffect, void, any> {
    while (true) {
        const action: ValidateAction = yield take(VALIDATE);
        const { values } = action;
        console.log('in validate saga, values:', values);

        const { updateThis, actionId } = yield call(standardApi, 'validate', action);

        console.log('updateThis:', updateThis, 'actionId:', actionId);

        yield put(updateThis({ code:'FETCHING' }));

        yield call(delay, 5000);

        yield put(updateThis({ code:'OK' }));
    }
}
sagas.push(validateSaga);

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

type ApiAction = Action | { actionId?:string }
type UpdateThis = (thisData?:{}, otherData?:{}) => UpdateAction
const standardApi = function* standardApi(verb: string, action:ApiAction): Generator<IOEffect, { actionId:Id, updateThis:UpdateThis }, any> {
    let {values:{ actionId }} = action;
    if (!actionId) actionId = yield call(getIdSync);
    if (!actionId.startsWith(`${verb}_`)) actionId = `${verb}_${actionId}`;

    const updateThis: UpdateThis = (thisData, otherData) => update({ [actionId]:thisData, ...otherData });

    return { actionId, updateThis };
}

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
        default: return state;
    }
}

export type { ActionStatus }
export { SERVER, sign, validate, download, update }
