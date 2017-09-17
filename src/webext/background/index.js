// @flow

import 'cmn/lib/extension-polyfill'

import React from 'react'
import { render } from 'react-dom'

import { Server as PortsServer } from 'cmn/lib/comm/webext-ports'
import { callInTemplate } from 'cmn/lib/comm/comm'
import ReduxServer from 'cmn/lib/comm/redux'
import store, { persistor } from '../flow-control'

import Background from './Background'

// gPortsComm is needed because gReduxServer gets incoming through this. Meaning "things like ./app use callInBackground to connect to redux server"
const gPortsComm = new PortsServer(exports);
export const callInPort = callInTemplate.bind(null, gPortsComm, null);
export let gReduxServer;

document.addEventListener('DOMContentLoaded', () => {
    gReduxServer = new ReduxServer(store, ()=>null)
    render(<Background />, document.body);
}, { once:true });

export function logIt(what) {
    console.log('logIt :: what:', what);
}

export function purgeStore() {
    console.log('will purge');
    persistor.purge();
    console.log('did purge');
}
// const gPortsComm = new PortsServer(exports ); // eslint-disable-line no-unused-vars
// export const callInPort = callInTemplate.bind(null, gPortsComm, null);
// export const callIn = (...args) => new Promise(resolve => exports['callIn' + args.shift()](...args, val=>resolve(val))); // must pass undefined for aArg if one not provided, due to my use of spread here. had to do this in case first arg is aMessageManagerOrTabId

// export const gReduxServer = new ReduxServer(reducers);

// // let ELEMENT_ID;
// renderProxiedElement(gReduxServer, BackgroundElement, document.getElementById('root'), [
//     'browser_action',
//     'core'
// ]);
// // ]).then(id => ELEMENT_ID = id);

