// @flow

import { delay } from 'redux-saga'
import { take, takeEvery, call, put, select, all } from 'redux-saga/effects'
import { depth0Or1Equal } from 'cmn/lib/recompose'
import shallowEqual from 'recompose/shallowEqual'

import { deleteUndefined, getId } from '../utils'
import { splitActionId } from './utils'

type ActionStatus = {
    code?: string,
    placeholders?: string[], // for use when do extension.i18n.getMessage(`PINGUP_${status}`, placeholders)
    other?: string, // `${key}_${id}` of other things status to show in here
    errors?: {} // for redux form
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
        code: 'CREDING' | 'MODING' | 'TIMING' | 'UPLOADING' | 'REVIEWING' | 'DOWNLOADING' | StatusDone,
        other?: 'pingDown' | 'pingLoggedIn' | 'pingAgree' | 'pingOffline',
        error?: string
    },
    validate?: {
        code: 'FETCHING',
        other?: 'pingCwsDown'
    },
    fetch: {
        [Id]: {
            code: 'FETCHING' | 'WAITING',
            other?: 'pingDown' | 'pingOffline'
        }
    }
}

const INITIAL = {}
export const sagas = [];

const A = ([actionType]: string[]) => 'API_' + actionType;

const SERVER = 'https://addons.mozilla.org';
const CWS_SERVER = 'https://chrome.google.com/';

// selector's
const isServerDown = function* isServerUp() { return yield select(state => state.api.isDown) }

// yielders/take's - can do like `yield take(SERVER_UP)`
const SERVER_UP = ({ type, data }) => type === UPDATE && 'isDown' in data && !data.isDown

const fetchApi = function* fetchApi(input:string, init={}, update) {
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

const pingOfflineSaga = function* pingOfflineSaga() {
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

const pingDownSaga = function* pingDownSaga() {
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

const pingCwsDownSaga = function* pingCwsDownSaga() {
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

const pingLoggedInSaga = function* pingLoggedInSaga() {

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
type RegisterAction = { type:typeof SIGN, values:{| name:string, email:string, password:string, passwordConfirmation:string |} };
const sign = (values): RegisterAction => ({ type:SIGN, values });

const signSaga = function* signSaga(actionId:string, action: RegisterAction) {

    if (typeof actionId === 'number') actionId = 'sign_' + actionId;

    const updateThis = (thisData?:{}, otherData?:{}) => update({ [actionId]:thisData, ...otherData });

    while (true) {
        const { values } = yield take(SIGN);
        console.log('in sign saga, values:', values);

        yield put(updateThis({ code:'FETCHING' }));

        yield call(delay, 5000);

        yield put(updateThis({ code:'OK' }));
    }
}
sagas.push(signSaga);

//
type StepableAction = // an action that can be resumed? so actions should be split at which point data needs to be saved in order for a resume?
  | SIGN
  | VALIDATE
  | DOWNLOAD;

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

            for (const [keyFull, value] of Object.entries(data)) {
                const [key, id] = splitActionId(keyFull);
                if (id === undefined) {
                    const valueOld = state[key];
                    stateNew[key] = value === undefined ? undefined : { ...valueOld, ...value };
                } else {
                    const valueOld = state[key][id];
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

            for (const key of Object.keys(cleanKeys)) {
                deleteUndefined(stateNew[key]);
            }
            return deleteUndefined(stateNew);
        }
        default: return state;
    }
}

export type { ActionStatus }
export { SERVER, sign }
