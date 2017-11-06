// @flow

import type { PersistConfig } from './types'

import getStoredState from './getStoredState' // custom
import { getStorageKey } from '../filesTransform'  // custom

import { KEY_PREFIX } from './constants'

export default function purgeStoredState(config: PersistConfig) {
  const storage = config.storage
  const storageKey = `${config.keyPrefix !== undefined
    ? config.keyPrefix
    : KEY_PREFIX}${config.key}`;

  // custom
  (async function() {
    const state = await getStoredState(config);
    console.log('state:', state);

    if (state.files) {
      const deletes = Object.keys(state.files).map( id => new Promise( (resolve, reject) => storage.removeItem(getStorageKey(id), err => err ? reject(err) : resolve()) ) );
      await Promise.all(deletes);
      console.log('file deletions done');
    }

    storage.removeItem(storageKey, warnIfRemoveError)
  })()
  // end custom

  // return storage.removeItem(storageKey, warnIfRemoveError)
}

function warnIfRemoveError(err) {
  if (err && process.env.NODE_ENV !== 'production') {
    console.error('redux-persist/purgeStoredState: Error purging data stored state',err)
  }
}
