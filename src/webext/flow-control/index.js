// @flow

import { createStore, combineReducers, applyMiddleware } from 'redux'
import { persistStore, persistReducer } from './redux-persist'
import storage from 'redux-persist/es/storage'
import createSagaMiddleware from 'redux-saga'
import { fork, all } from 'redux-saga/effects'

import counter, { sagas as counterSagas } from './counter'
import api, { sagas as apiSagas } from './api'
import pendings, { sagas as pendingsSagas } from './pendings'

import type { Shape as ApiShape } from './api'
import type { Shape as CounterShape } from './counter'
import type { Shape as PendingsShape } from './pendings'

export type Shape = {
    _persist: { version:number, rehydrated:boolean },
    api: ApiShape,
    counter: CounterShape,
    pendings: PendingsShape
}

console.log('process.env.NODE_ENV:', process.env.NODE_ENV, process.env.NODE_ENV !== 'production');

const persistConfig = {
    key: 'primary',
    debug: process.env.NODE_ENV !== 'production',
    whitelist: ['counter', 'pendings'],
    storage
}

const sagaMiddleware = createSagaMiddleware();
const reducers = persistReducer(persistConfig, combineReducers({ api, counter, pendings }));
const sagas = [ ...apiSagas, ...counterSagas, ...pendingsSagas ];

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
