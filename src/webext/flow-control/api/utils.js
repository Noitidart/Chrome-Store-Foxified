// @flow

import { SERVER } from './'

import type { Shape as ApiShape, ActionStatus } from './'

export function fetchApi(input:string, init={}) {
    // if init.body is object, then it JSON.stringify's it
    // if input is string, and doesnt start with http, then `https://${fetchApi.SERVER}/api/` is prefixed to it
        // and adds the default api headers in but doesnt overwrite if it already has those keys

    // currently only supports string `input`

    if (!input.startsWith('http')) {
        init.headers = Object.assign({ Accept:'application/json', 'Content-Type':'application/json' }, init.headers);
        input = `${SERVER}/api/${input}`;
    }

    if (init.body) init.body = JSON.stringify(init.body);


    return fetch(input, init);
}

// iterates other until it gets final status
// type StatusProps = {||} |
//     {
//         status: string,
//         statusMessage: string,
//         statusErrors?: {}
//     };

export function getStatus(keyFull: string, api: ApiShape, isNotTopLevel?: boolean): void | ActionStatus {
    // isNotTopLevel is programatic, devuser should never set
    // console.log('getStatus :: keyFull:', keyFull, 'api:', api);
    // real status, is the deepest stauts, following "other"
    const [key, id] = splitActionId(keyFull);
    const value = id === undefined ? api[key] : api[key][id];

    const isTopLevel = !isNotTopLevel;
    if (isTopLevel && !value ) return undefined; // if top level, meaning first iteration of extractStatus, then it is possible that an entry does not exist. all sublevels MUST exist though

    // const { status, placeholders, other, errors } = value;
    const { other } = value;
    if (other) {
        return getStatus(other, api, true);
    } else {
        console.log('getStatus :: returning, value:', value);
        return value;
        // let statusMessage = status;
        // // if (placeholders) {
        // //     for (const placeholder of placeholders) {
        // //         statusMessage = statusMessage.replace('%%%', placeholder);
        // //     }
        // // }
        // console.log('returning:', { status, statusMessage, statusErrors:errors });
        // return { status, statusMessage, statusErrors:errors };
    }
}

export function isStatusBusy(status: ActionStatus) {
    if (!status) return false;
    const { code='OK' } = status;
    return !code.startsWith('OK') && !code.startsWith('ERROR');
}

export function splitActionId(actionId: string) {
    const ix = actionId.indexOf('_');
    const name = ix === -1 ? actionId : actionId.substr(0, ix);
    const id = ix === -1 ? undefined : actionId.substr(ix + 1);
    return [name, id];
}
