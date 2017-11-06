// @flow

import { delay } from 'redux-saga'
import { takeEvery, call, put } from 'redux-saga/effects'

export type Shape = {
    isFirstRun: boolean,
    shouldShowUnsignedModal: boolean
}

const INITIAL = {
    isFirstRun: true,
    shouldShowUnsignedModal: true
}
export const sagas = [];

const A = ([actionType]: string[]) => 'ACCOUNT_' + actionType; // Action type prefixer

//
const SET = A`SET`;
type SetAction = { type:typeof SET, data:$Shape<Shape> };
const set = (data: $Shape<Shape>): SetAction => ({ type:SET, data });

//
type Action =
  | SetAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case SET: {
            console.log('in set, action:', action);
            return { ...state, ...action.data };
        }
        default: return state;
    }
}

export { set }
