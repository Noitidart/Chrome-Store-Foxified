// @flow

import { wait } from 'cmn/lib/all'
import { takeEvery, call, put } from 'redux-saga/effects'

export type Shape = number;

const INITIAL = 10;
export const sagas = [];

const A = ([actionType]: string[]) => 'COUNTER_' + actionType; // Action type prefixer

//
const UP = A`UP`;
type UpAction = { type:typeof UP };
export function up(): UpAction {
    return {
        type: UP
    }
}

//
const UP_ASYNC = A`UP_ASYNC`;
type UpAsyncAction = { type:typeof UP_ASYNC, times:number };
export function upAsync(times: number = 1): UpAsyncAction {
    return {
        type: UP_ASYNC,
        times
    }
}
const upAsyncWorker = function* upAsyncWorker(action: UpAsyncAction) {
    for (let i=0; i<action.times; i++) {
        yield call(wait, 1000);
        yield put(up());
    }
}
const upAsyncWatcher = function* upAsyncWatcher() {
    yield takeEvery(UP_ASYNC, upAsyncWorker);
}
sagas.push(upAsyncWatcher);

//
const DN = A`DN`;
type DownAction = { type:typeof DN };
export function dn(): DownAction {
    return {
        type: DN
    }
}

//
type Action =
  | UpAction
  | UpAsyncAction
  | DownAction;

export default function reducer(state: Shape = INITIAL, action:Action) {
    switch(action.type) {
        case UP: return state + 1;
        case DN: return state - 1;
        default: return state;
    }
}