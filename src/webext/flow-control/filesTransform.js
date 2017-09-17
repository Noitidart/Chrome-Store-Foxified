import { createTransform } from 'redux-persist'
import { storage } from './'

export function getStorageKey(fileId) {
    return 'persist::files:' + fileId;
}

console.error('RESETTING inbound outbout globals inbound.lastState:', inbound.lastState, 'outbound.lastState:', outbound.lastState, 'window.location.href:', window.location.href);

let LAST_STATE = {};

async function inbound(state, key) {
    // on save to file
    const lastState = LAST_STATE;
    LAST_STATE = state;
    console.error('async inbound, key:', key, 'state:', state, 'lastState:', lastState);
    const fileIds = {};

    // write/delete files in parallel
    const storageActions = [];

    Object.entries(state).forEach(([id, file]) => {
        fileIds[id] = '';
        let shouldWrite = false;
        if (id in lastState) {
            if (file !== lastState[id]) console.log('file id:', id, 'was edited!');
            shouldWrite = file !== lastState[id]; // lastFile; // file edited
        }
        else shouldWrite = true; // file added
        if (shouldWrite) storageActions.push( new Promise( (resolve, reject) => storage.setItem(getStorageKey(id), file.data, err => err ? reject(err) : resolve()) ) );
        if (shouldWrite) console.log('writing fileId:', id);
    });

    Object.entries(lastState).forEach(([id]) => {
        const shouldDelete = !(id in state); // file deleted
        if (shouldDelete) storageActions.push( new Promise( (resolve, reject) => storage.removeItem(getStorageKey(id), err => err ? reject(err) : resolve()) ) );
        if (shouldDelete) console.log('deleting fileId:', id);
    });

    await Promise.all(storageActions);
    console.log('now returning fileIds:', fileIds);
    return fileIds;
}

async function outbound(state, key) {
    // on read from file
    const lastState = LAST_STATE;
    console.error('async outbound, key:', key, 'state:', state, 'lastState:', lastState);

    let somethingRead = false;
    const fileIds = Object.keys(state);
    const stateNew = {};
    const reads = fileIds.map( id => {
        const shouldRead = !(id in lastState);
        console.log('shouldRead:', shouldRead);
        if (shouldRead) return new Promise( (resolve, reject) => storage.getItem(getStorageKey(id), (err, value) => {
            console.log('DID READ file id:', id);
            if (err) reject(err);
            else {
                somethingRead = true;
                LAST_STATE[id] = stateNew[id] = { data:value };
                resolve();
            }
        }) );
    });


    await Promise.all(reads);

    return somethingRead ? { ...LAST_STATE } : state;
}

export default createTransform(
    inbound,
    outbound,
    { whitelist:['files'] }
)
