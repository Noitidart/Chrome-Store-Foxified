// @flow

import { delay } from 'redux-saga'
import { take, takeEvery, call, put, select } from 'redux-saga/effects'

export type Shape = Action[]

const INITIAL = [];
export const sagas = [];

const A = ([actionType]: string[]) => 'PENDINGS_' + actionType;

//
const ADD = A`ADD`;
type AddAction = { type:typeof ADD, action:Action };
const addPending = (action): AddAction => ({ type:ADD, action });

//
const REMOVE = A`REMOVE`;
type RemoveAction = { type:typeof REMOVE, action:Action };
const removePending = (action): RemoveAction => ({ type:REMOVE, action });

//
const RESUME = A`RESUME`
type ResumeAction = { type:typeof RESUME };
const resumePendings = (): ResumeAction => ({ type:RESUME });
const resumeSaga = function* resumeSaga() {
    // on startup run resume, then re-run resume whenever resume action happens

    // wait for redux-persit rehydration
    while (true) {
        const action = yield take('*');
        console.log('will try to check rehydrated');
        const {_persist:{ rehydrated }} = yield select();
        console.log('resume saga rehydrated:', rehydrated);
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
        case ADD: return [ ...state, action.action ];
        case REMOVE: return state.filter( aAction => aAction !== action.action);
        default: return state;
    }
}

export { addPending, removePending, resumePendings }
