import 'cmn/lib/extension-polyfill'
console.log('hi');

(async function() {
    extension.notifications.create({ type:'basic', title:'hi', message:'there' });

    try {
        const windows = await extensiona('windows.getAll');
        console.log('windows:', windows);
    } catch(ex) {
        console.error('ex:', ex);
    }
})()
// import { Server as PortsServer } from '../common/comm/webext-ports'
// import { callInTemplate } from '../common/comm/comm'
// import renderProxiedElement, { Server as ReduxServer } from '../common/comm/redux'

// import * as reducers from '../flows'

// import BackgroundElement from './BackgroundElement'

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

// export function logIt(what) {
//     console.log('what:', what);
// }