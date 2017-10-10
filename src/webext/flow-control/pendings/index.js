// @flow

import { delay } from 'redux-saga'
import { take, takeEvery, call, put, select } from 'redux-saga/effects'

import { deleteUndefined, getId } from '../utils'

export type Shape = {
    [Id]: { id:Id, action:Action }
}

const INITIAL = {};
export const sagas = [];

const A = ([actionType]: string[]) => 'PENDINGS_' + actionType;

//
const ADD = A`ADD`;
type AddAction = { type:typeof ADD, action:Action, id:Id };
const add = (action, id): AddAction => ({ type:ADD, action, id });

//
const REMOVE = A`REMOVE`;
type RemoveAction = { type:typeof REMOVE, id:Id };
const remove = (id): RemoveAction => ({ type:REMOVE, id });

//
const REQUEST_ADD = A`REQUEST_ADD`;
type RequestAddAction = { type:typeof REQUEST_ADD, action:Action }
const requestAdd = (action): RequestAddAction => ({ type:REQUEST_ADD, action });

const requestAddSaga = function* requestAddSaga() {
    // re-run resume whenever resume action happens
    while (true) {
        yield take(REQUEST_ADD);
        const id = call(getId, 'pendings');
        yield put(add(action.action, id));
    }
}
sagas.push(requestAddSaga);

//
const RESUME = A`RESUME`
type ResumeAction = { type:typeof RESUME };
const resume = (): ResumeAction => ({ type:RESUME });
const resumeSaga = function* resumeSaga() {
    // on startup run resume, then re-run resume whenever resume action happens

    // wait for redux-persit rehydration
    while (true) {
        const action = yield take('*');
        const {_persist:{ rehydrated }} = yield select();
        if (rehydrated) {
            console.log('action that caused rehydrated to be set to true, action:', action);
            yield call(resumeTask);
            break;
        }
    }

    // re-run resume whenever resume action happens
    while (true) {
        yield take(RESUME);
        yield call(resumeTask);
    }
}
sagas.push(resumeSaga);

const resumeTask = function* resumeTask() {
    const { pendings } = yield select();

    // TODO: test if it passes checks once I implement that wait thingy - for now it is a simple iterate and put

    for (const pending of pendings) {
        yield put(pending.action);
    }
}

//
type Action =
  | AddAction
  | RemoveAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case ADD: {
            const pending = { ...action };
            delete pending.type;
            return { ...state, [pending.id]:pending };
        }
        case REMOVE: {
            const { id } = action;
            const stateNew = { ...state };
            delete stateNew[id];
            return stateNew;
        }
        default: return state;
    }
}
