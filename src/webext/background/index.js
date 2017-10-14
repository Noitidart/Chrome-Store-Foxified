// @flow

import 'cmn/lib/extension-polyfill'

import React from 'react'
import { render } from 'react-dom'

import { Server as PortsServer } from 'cmn/lib/comm/webext-ports'
import { callInTemplate } from 'cmn/lib/comm/comm'
import ReduxServer from 'cmn/lib/comm/redux'
import store from '../flow-control'
import * as BACKEND from './backend'

import Background from './Background'

// gPortsComm is needed because gReduxServer gets incoming through this. Meaning "things like ./app use callInBackground to connect to redux server"
const gPortsComm = new PortsServer(BACKEND);
export const callInPort = BACKEND.callInPort = callInTemplate.bind(null, gPortsComm, null);
export let gReduxServer; // needed export so it can be tapped by redux-comm

document.addEventListener('DOMContentLoaded', () => {
    BACKEND.gReduxServer = gReduxServer = new ReduxServer(store, ()=>null)
    render(<Background />, document.body);
}, { once:true });
