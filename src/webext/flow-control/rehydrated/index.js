// @flow

export type Shape = boolean;

const INITIAL = false;

const A = ([actionType]: string[]) => 'REHYDRATED_' + actionType; // Action type prefixer

const REHYDRATED = A`REHYDRATED`;
type RehydratedAction = { type:typeof REHYDRATED };
export function rehydrated(): RehydratedAction {
    return {
        type: REHYDRATED
    }
}

type Action = RehydratedAction;

export default function reducer(state: Shape = INITIAL, action:Action) {
    switch(action.type) {
        case REHYDRATED: return true; // i dont care if error happens on rehydrate, but if it does, maybe i should purge the store TODO:
        default: return state;
    }
}