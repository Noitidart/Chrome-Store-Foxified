import { Client as PortsClient } from 'cmn/lib/comm/webext-ports'
import { callInTemplate } from 'cmn/lib/comm/comm'
import proxyFactory from 'cmn/lib/comm/redux/proxy-hoc'

type Endpoints = {
    loadSettings?: () => void
}

const ENDPOINTS:Endpoints = {};

const gBgComm = new PortsClient(exports, 'app');
const callInBackground = callInTemplate.bind(null, gBgComm, null, null);

const proxy = proxyFactory.bind(null, callInBackground, 'gReduxServer');

export { ENDPOINTS }
export default proxy