// @flow

import { delay } from 'redux-saga'
import { takeEvery, call, put } from 'redux-saga/effects'

import { deleteUndefined } from '../extensions/utils'

export type Shape = {
    amoServerStatus?: ServerStatus,
    amoLoggedIn?: boolean,
}

const INITIAL = {};
export const sagas = [];

const A = ([actionType]: string[]) => 'API_' + actionType; // Action type prefixer

const SERVER_STATUS = {
    DOWN: 'DOWN',
    UP: 'UP'
}
type ServerStatus = string; // $Keys<typeof SERVER_STATUS>

const UPDATE = A`UPDATE`;
// type UpdateAction = { type:typeof UPDATE, id:Id, data:$Shape<Shape> };
type UpdateAction = { type:typeof UPDATE, id:Id, data:Shape };
const update = (id, data): UpdateAction => ({ type:UPDATE, data });

//
const UP_ASYNC = A`UP_ASYNC`;
type UpAsyncAction = { type:typeof UP_ASYNC, times:number };
const upAsync = (times=1): UpAsyncAction => ({ type:UP_ASYNC, times });

const upAsyncWorker = function* upAsyncWorker(action: UpAsyncAction) {
    for (let i=0; i<action.times; i++) {
        yield call(delay, 1000);
        yield put(up());
    }
}
const upAsyncWatcher = function* upAsyncWatcher() {
    yield takeEvery(UP_ASYNC, upAsyncWorker);
}
sagas.push(upAsyncWatcher);

//
type Action =
  | UpdateAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case UPDATE: {
            const { data } = action;
            return deleteUndefined({ ...state, ...data });
        }
        default: return state;
    }
}

export { update }
