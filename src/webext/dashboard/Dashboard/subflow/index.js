// @flow

import { createStore, combineReducers } from 'redux'
import { reducer as form } from 'redux-form'

export type Shape = {
    form: *
}

const reducers = combineReducers({ form });
const store = createStore(reducers);

// store.subscribe(function() {
//     console.log('store updated:', store.getState());
// })

export default store