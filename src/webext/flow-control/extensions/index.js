// @flow

import { select, takeEvery, call, put, race } from 'redux-saga/effects'
import { delay } from 'redux-saga'

import { get_webstore_url, get_crx_url, get_webstore_name } from '../../cws_pattern'
import { omit } from 'cmn/lib/all'
import { injectStatusPromise } from './utils'

import type { StatusInjection } from './utils'

const A = ([actionType]: string[]) => 'EXTENSIONS_' + actionType; // Action type prefixer

export const sagas = [];

type Id = string;
type Kind = 'cws' | 'amo' | 'ows';
type Entry = {
    kind: Kind,
    date: number, // listing check date - udated when donwnload is started
    storeUrl: string,
    listingTitle: string, // title of the listing on the store
    // present only after download
    name?: string,
    version?: string,
    size?: number,
    isDownloading?: boolean,
    progress?: number // percent 0-100
}

export type Shape = {
    [Id]: Entry
}

const INITIAL = {};

//
const ADD = A`ADD`;
type AddAction = { type:typeof ADD, entry:Entry };
const add = (entry): AddAction => ({ type:ADD, entry });

//
const DELETE = A`DELETE`;
type DeleteAction = { type:typeof DELETE, idOrIds:Id|Id[] };
const del = (idOrIds): DeleteAction => ({ type:DELETE, idOrIds });

//
const UPDATE = A`UPDATE`;
// type UpdateAction = { type:typeof UPDATE, id:Id, data:$Shape<Entry> };
type UpdateAction = { type:typeof UPDATE, id:Id, data:Entry };
const update = (id, data): UpdateAction => ({ type:UPDATE, id, data });

//
// storeUrl is webstore url - one that matches return of cws_pattern.js :: get_webstore_url
const REQUEST_ADD = A`REQUEST_ADD`;
type RequestAddAction = { type:typeof REQUEST_ADD, storeUrl:string, ...StatusInjection };
const requestAdd = (storeUrl): RequestAddAction => injectStatusPromise({ type:REQUEST_ADD, storeUrl });

function* requestAddWorker(action: RequestAddAction) {
    const { storeUrl, resolve } = action;


    const storeUrlFixed = get_webstore_url(storeUrl);
    if (!storeUrlFixed) return resolve({ storeUrl:'Not a valid store URL.' });
    console.log('storeUrlFixed:', storeUrlFixed);

    const storeName = get_webstore_name(storeUrl);
    if (!['cws'].includes(storeName)) return resolve({ storeUrl:`Extensions from ${storeName.toUpperCase()} are not supported.` });

    // check for duplicates
    const { extensions } = yield select();
    const exists = !!Object.values(extensions).find( ({ storeUrl:aStoreUrl }) => aStoreUrl === storeUrlFixed );
    if (exists) return resolve({ storeUrl:'You have previously already downloaded this extension' });

    let listingTitle;
    {
        let res, timeout;
        try { ({ res, timeout } = yield race({ timeout:call(delay, 10000), res:call(fetch, storeUrlFixed) })) }
        catch(ex) { return resolve({ _error:'Unhandled error while validating URL: ' + ex.message }) }
        if (timeout) return resolve({ _error:'Connection timed out, please try again later.' });
        if (res.status !== 200) return resolve({ storeUrl:`Invalid status of "${res.status}" at URL.` });
        const html = yield call([res, res.text]);
        listingTitle = html.match(/<title>(.+?)<\/title>/)[1];
    }

    yield put(add({
        id: yield call(getId),
        kind: storeName,
        storeUrl: storeUrlFixed,
        listingTitle,
        date: Date.now()
    }));

    resolve();
}
function* requestAddWatcher() {
    yield takeEvery(REQUEST_ADD, requestAddWorker);
}
sagas.push(requestAddWatcher);

let NEXT_ID = -1;
function* getId() {
    if (NEXT_ID === -1) {
        const { extensions } = yield select();
        const ids = Object.keys(extensions);
        if (ids.length) NEXT_ID = Math.max(...ids);
    }
    return ++NEXT_ID;
}

//
type Action =
  | AddAction
  | DeleteAction
  | UpdateAction;

export default function reducer(state: Shape = INITIAL, action:Action): Shape {
    switch(action.type) {
        case DELETE: {
            const { idOrIds } = action;
            const ids = !Array.isArray(idOrIds) ? [idOrIds] : idOrIds;
            return omit({ ...state }, ...ids);
        }
        case ADD: {
            const { entry, entry:{ id } } = action;
            return { ...state, [id]:entry };
        }
        case UPDATE: {
            const { id, data } = action;
            const dataOld = state[id];
            const idNew = 'id' in data ? data.id : id;
            return { ...state, [idNew]:{ ...dataOld, ...data } };
        }
        default: return state;
    }
}

export type { Entry }
export { requestAdd }
