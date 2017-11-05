// @flow

import { requestAdd } from '../flow-control/extensions'
import store, { persistor } from '../flow-control'

import DASHBOARD_PAGE from '../dashboard/index.html'

export function logIt(what) {
    console.log('logIt :: what:', what);
}

export function purgeStore() {
    persistor.purge();
}

export async function dispatchSubmitAddForm(values) {
    return await store.dispatch(requestAdd(values)).promise;
}

// content script backend

extension.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(sender.tab ? 'from a content script:' + sender.tab.url : 'from the extension');
    switch (request.action) {
        case 'request-add': {
                extension.tabs.create({ url:`${DASHBOARD_PAGE}#/install/${request.kind}/${request.extid}` });
                // /install/id
            break;
        }
    }
});
