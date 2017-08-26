// @flow

export type Shape = {
    badgeColor?: string,
    badgeText?: string,
    title?: string
};

const INITIAL = {
    title: extension.i18n.getMessage('browseraction_title'),
    badgeText: '?'
}

const A = ([actionType]: string[]) => 'BROWSER_ACTION_' + actionType; // Action type prefixer

//
const SET = A`SET`;
type Trait = 'badgeColor' | 'badgeText' | 'title';
type SetAction = { type:typeof SET, trait:Trait };
export function setBrowserActionTrait(trait: Trait): SetAction {
    return {
        type: SET,
        trait
    }
}

//
type Action =
  | SetAction;

export default function reducer(state: Shape = INITIAL, action:Action) {
    switch(action.type) {
        case SET: {
            const { trait } = action;
            return { ...state, trait };
        }
        default: return state;
    }
}