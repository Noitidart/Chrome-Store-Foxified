// @flow

import { delay } from 'redux-saga'
import { take, takeEvery, call, put, select } from 'redux-saga/effects'
import { depth0Or1Equal } from 'cmn/lib/recompose'
import shallowEqual from 'recompose/shallowEqual'

import { deleteUndefined, getId } from '../utils'

type ActionStatus = {
    code?: string,
    placeholders?: string[], // for use when do extension.i18n.getMessage(`PINGUP_${status}`, placeholders)
    other?: string, // `${key}_${id}` of other things status to show in here
    errors?: {} // for redux form
}

type StatusError = 'ERROR' // | 'ERROR_*'
type StatusDone = 'OK' | StatusError;

export type Shape = {
    pendings: Array<{ id:Id, action:StepableAction }>,
    isDown?: string, // message for reason why i think its down
    pingUp?: {
        code: 'FETCHING' | 'WAITING' | StatusDone
    },
    pingAuth?: { // ping if logged in
        code: 'FETCHING' | 'WAITING' | StatusDone,
        other?: 'pingUp'
    },
    pingAgree?: {
        code: 'FETCHING' | 'WAITING' | StatusDone,
        other?: 'pingUp' | 'pingAuth'
    },
    sign?: {
        code: 'CREDING' | 'MODING' | 'TIMING' | 'UPLOADING' | 'REVIEWING' | 'DOWNLOADING' | StatusDone,
        other?: 'pingUp' | 'pingAuth' | 'pingAgree',
        error?: string
    }
}

const INITIAL = {}
export const sagas = [];

const A = ([actionType]: string[]) => 'API_' + actionType;

const SERVER = 'https://addons.mozilla.org';

// selector's
const isServerDown = function* isServerUp() { return yield select(state => state.api.isDown) }

// yielders/take's - can do like `yield take(SERVER_UP)`
const SERVER_UP = ({ type, id, }) => action.type === UPDATE && action.key === 'isDown' && 'isDown' in action.data && !action.data.isDown

// utils
const restartPendings = function* restartPendings() {
    const pendings = yield select(state => state.api.pendings);
    for (const pending of pendings) {
        yield put(pending.action);
    }
}

const fetchApi = function* fetchApi(input:string, init={}, update) {
    while (true) {
        if (call(isServerDown)) {
            yield put(update({ other:'pingUp' }));
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

//
const ADD_PENDING = A`ADD_PENDING`;
type AddPendingAction = { type:typeof ADD_PENDING, action:StepableAction };
const addPending = (action): AddPendingAction => ({ type:ADD_PENDING, action });

//
const REMOVE_PENDING = A`REMOVE_PENDING`;
type RemovePendingAction = { type:typeof REMOVE_PENDING, action:StepableAction };
const removePending = (id, data): RemovePendingAction => ({ type:REMOVE_PENDING, action });

// pings server until it is back up
const PING_UP = A`PING_UP`;
type PingUpAction = { type:typeof PING_UP };
const pingUp = (): PingUpAction => ({ type:PING_UP });

const pingUpSaga = function* pingUpSaga() {
    while (true) {
        yield take(PING_UP);

        let res;
        try {
            res = fetch(SERVER)
        } catch(ex) {
            console.warn('pingUpSaga fetch ex:', ex.message);
            yield call(delay, 5000)
            continue;
        }

        if (res.status === 200) {
            yield put(update({ isDown:undefined }));
            break;
        }
    }
}
sagas.push(pingUpSaga);

// pings server until it is logged in
const PING_AUTH = A`PING_AUTH`;
type PingAuthAction = { type:typeof PING_AUTH };
const pingAuth = (): PingAuthAction => ({ type:PING_AUTH });

const pingAuthSaga = function* pingAuthSaga() {

    const updateThis = (thisData?:{}, otherData?:{}) => update({ pingAuth:thisData, ...otherData });

    while (true) {
        yield take(PING_AUTH);

        yield put(updateThis({ code:'FETCHING' }));
        const res = yield call(fetchApi, SERVER);

        if (res.status === 401) {
            yield call(delay, 5000);
            console.warn('pingAuthSaga fetch ex:', ex.message);

            continue;
        }

        if (res.status === 200) {
            yield put(update({ isDown:undefined }));
            yield put(updateThis(undefined));
            break;
        }
    }
}
sagas.push(pingAuthSaga);

//
const SIGN = A`SIGN`;
type RegisterAction = { type:typeof SIGN, values:{| name:string, email:string, password:string, passwordConfirmation:string |} };
const sign = (values): RegisterAction => ({ type:SIGN, values });

const signSaga = function* signSaga(action: RegisterAction) {

    const updateThis = (thisData?:{}, otherData?:{}) => update({ sign:thisData, ...otherData });

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
  | SIGN;

//
type Action =
  | AddPendingAction
  | RemovePendingAction
  | UpdateAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case UPDATE: {
            const { data } = action;

            console.log('in update reducer, data:', data);

            const stateNew = { ...state };
            const cleanKeys = {};

            for (const [keyFull, value] of Object.entries(data)) {
                const [key, id] = keyFull.split('_');
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
        case ADD_PENDING: {
            // go through pendings, shallow comparing action
            const pendingsOld = state.pendings;
            const hasAction = pendingsOld.find(pending => shallowEqual(pending.action, action.action));
            return hasAction ? state : { ...state, pendings:[...pendingsOld, action.action] };
        }
        case REMOVE_PENDING: {
            const pendingsOld = state.pendings;
            return {
                ...state,
                pendings: pendingsOld.filter(pending => !shallowEqual(pending.action, action.action)) // keep pending if its action does not match action.action (triggerAction)
            }
        }
        default: return state;
    }
}

export type { ActionStatus }
export { SERVER, sign }
