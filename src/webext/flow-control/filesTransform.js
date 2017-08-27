import { createTransform } from 'redux-persist'
import { storage } from './'

export function getStorageKey(fileId) {
    return 'persist::files:' + fileId;
}

let inboundLastState = {};
async function inbound(state, key) {
    // on save to file
    const lastState = inboundLastState;
    inboundLastState = state;
    console.log('async inbound, key:', key, 'state:', state, 'lastState:', lastState);
    const fileIds = [];

    // write/delete files in parallel
    const storageActions = [];

    Object.entries(state).forEach(([id, file]) => {
        fileIds.push(id);
        let shouldWrite = false;
        if (id in lastState) shouldWrite = file !== lastState[id]; // lastFile; // file edited
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

let outboundLastState = [];
async function outbound(state, key) {
    // on read from file
    const lastState = outboundLastState;
    outboundLastState = state;
    console.log('async outbound, key:', key, 'state:', state, 'lastState:', lastState);

    const fileIds = state;
    const stateNew = {};
    const reads = fileIds.map( id => {
        const shouldRead = !lastState.includes(id);
        console.log('shouldRead:', shouldRead);
        if (shouldRead) return new Promise( (resolve, reject) => storage.getItem(getStorageKey(id), (err, value) => {
            console.log('DID READ file id:', id);
            if (err) reject(err);
            else {
                stateNew[id] = { data:value };
                resolve();
            }
        }) );
    });


    await Promise.all(reads);

    return stateNew;
}

export default createTransform(
    inbound,
    outbound,
    { whitelist:['files'] }
)