// @flow

import { omit } from 'cmn/lib/all'

type FileId = string;
type DataUrl = string;
export type Shape = {
    [FileId]: {
        data: DataUrl
    }
}

const INITIAL = {}

const A = ([actionType]: string[]) => 'FILES_' + actionType; // Action type prefixer

//
const ADD = A`ADD`;
type AddAction = { type:typeof ADD, data:DataUrl };
export function addFile(data: DataUrl): AddAction {
    return {
        type: ADD,
        data
    }
}

//
const EDIT = A`EDIT`;
type EditAction = { type:typeof EDIT, id:FileId, data:DataUrl };
export function editFile(id: FileId, data: DataUrl): EditAction {
    return {
        type: EDIT,
        id,
        data
    }
}

//
const DELETE = A`DELETE`;
type DeleteAction = { type:typeof DELETE, id:FileId };
export function deleteFile(id: FileId): DeleteAction {
    return {
        type: DELETE,
        id
    }
}

//
type Action =
  | AddAction
  | EditAction
  | DeleteAction;

export default function reducer(state: Shape = INITIAL, action:Action) {
    switch(action.type) {
        case ADD: {
            const { data } = action;
            const ids = Object.keys(state);
            const id = ids.length ? Math.max(...ids) + 1 : 0;
            return { ...state, [id]:{ data } };
        }
        case EDIT: {
            const { data, id } = action;
            return { ...state, [id]:{ data } };
        }
        case DELETE: return omit({...state}, action.id);
        default: return state;
    }
}