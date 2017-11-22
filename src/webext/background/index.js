// @flow

import 'cmn/lib/extension-polyfill'

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'

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
    render(
        <Provider store={store}>
            <Background />
        </Provider>
    , document.body);
}, { once:true });

(async function() {
    const platform = await extensiona('runtime.getPlatformInfo');
    console.log('platform.os:', platform.os);
    if (platform.os === 'android') {
        extension.webRequest.onBeforeSendHeaders.addListener(
            function(info) {
                const headers = info.requestHeaders;
                headers.forEach(header => {
                    if (header.name.toLowerCase() === 'user-agent') {
                        header.value = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:58.0) Gecko/20100101 Firefox/58.0';
                    }
                });
                return {requestHeaders: headers};
            },
            {
                // Modify the headers for these pages
                urls: [
                    'https://chrome.google.com/webstore/*',
                    'https://chrome.google.com/webstore/*'
                ],
                // In the main window and frames
                types: ['main_frame', 'sub_frame']
            },
            ['blocking', 'requestHeaders']
        );
    }
})();
