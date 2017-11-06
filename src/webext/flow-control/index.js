// @flow

import { createStore, combineReducers, applyMiddleware } from 'redux'
import { persistStore, persistReducer } from './redux-persist'
import createSagaMiddleware from 'redux-saga'
import { fork, all } from 'redux-saga/effects'

import AsyncBrowserExtensionStorage from './storage'
import filesTransform from './filesTransform.js'

// import api, { sagas as apiSagas } from './api'
import account from './account'
import browserAction from './browser-action'
import core from './core'
import counter, { sagas as counterSagas } from './counter'
import elements from 'cmn/lib/comm/redux/elements'
import extensions, { sagas as extensionsSagas } from './extensions'
import files from './files'
import pendings, { sagas as pendingsSagas } from './pendings'

// import type { Shape as ApiShape } from './api'
import type { Shape as AccountShape } from './account'
import type { Shape as BrowserActionShape } from './browser-action'
import type { Shape as CoreShape } from './core'
import type { Shape as CounterShape } from './counter'
import type { Shape as ElementsShape } from 'cmn/src/comm/redux/elements'
import type { Shape as FilesShape } from './files'
import type { Shape as ExtensionsShape } from './extensions'
import type { Shape as PendingsShape } from './pendings'

export type Shape = {
    _persist: { version:number, rehydrated:boolean },
    account: AccountShape,
    // api: ApiShape,
    browserAction: BrowserActionShape,
    counter: CounterShape,
    core: CoreShape,
    elements: ElementsShape,
    extensions: ExtensionsShape,
    files: FilesShape,
    pendings: PendingsShape
}

console.log('process.env.NODE_ENV:', process.env.NODE_ENV, process.env.NODE_ENV !== 'production');

export const storage = new AsyncBrowserExtensionStorage();

const persistConfig = {
    key: 'primary',
    debug: process.env.NODE_ENV !== 'production',
    whitelist: ['account', 'counter', 'extensions', 'files', 'pendings'],
    storage,
    transforms: [ filesTransform ]
}

const sagaMiddleware = createSagaMiddleware();
const reducers = persistReducer(persistConfig, combineReducers({ account, /* api, */ browserAction, core, counter, elements, extensions, files, pendings }));
const sagas = [ /*...apiSagas,*/ ...counterSagas, ...extensionsSagas, ...pendingsSagas ];

const store = createStore(reducers, applyMiddleware(sagaMiddleware));

export const persistor = persistStore(store);
function* rootSaga() {
    yield all(sagas.map(saga => fork(saga)));
}
sagaMiddleware.run(rootSaga);

// store.subscribe(function() {
//     console.log('store updated:', store.getState());
// })

export default store
