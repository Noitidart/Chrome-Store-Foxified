// @flow

import { createStore, combineReducers, applyMiddleware, compose } from 'redux'
import { persistStore, autoRehydrate } from 'redux-persist'
import createSagaMiddleware from 'redux-saga'
import { fork, all } from 'redux-saga/effects'

import AsyncBrowserExtensionStorage from './storage'

import browserAction from './browser-action'
import core from './core'
import counter, { sagas as counterSagas } from './counter'
import elements from 'cmn/lib/comm/redux/elements'
// import rehydrated from './rehydrated'

import type { Shape as CoreShape } from './core'
import type { Shape as CounterShape } from './counter'
import type { Shape as BrowserActionShape } from './browser-action'
import type { Shape as ElementsShape } from 'cmn/src/comm/redux/elements'
// import type { Shape as RehydratedShape } from './rehydrated'

export type Shape = {
    browserAction: BrowserActionShape,
    counter: CounterShape,
    core: CoreShape,
    elements: ElementsShape,
    // rehydrated: RehydratedShape
}

const sagaMiddleware = createSagaMiddleware();
const reducers = combineReducers({ browserAction, core, counter, elements/* , rehydrated */ });
const sagas = [ ...counterSagas ];

const store = createStore(reducers, compose(applyMiddleware(sagaMiddleware), autoRehydrate()));

function* rootSaga() {
    yield all(sagas.map(saga => fork(saga)));
}
sagaMiddleware.run(rootSaga);

export const persistor = persistStore(store, {
    // blacklist: ['elements', 'rehydrated'],
    whitelist: ['counter'],
    storage: new AsyncBrowserExtensionStorage()
});

// store.subscribe(function() {
//     console.log('store updated:', store.getState());
// })

export default store