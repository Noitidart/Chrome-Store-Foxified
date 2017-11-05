// @flow

import React, { Component } from 'react'
import { isObject } from 'cmn/lib/all'

import proxy, { callInBackground } from '../../../connect'
import { get_webstore_url } from '../../../../cws_pattern'
import { getStatusMessage } from '../DashboardPage/Cards/Card'
import { process } from '../../../../flow-control/extensions'

import './index.css'

import type { Entry as Extension } from '../../../../flow-control/extensions'

type Props = {
    // router
    match: {
        params: {
            extid: string,
            kind: $PropertyType<Extension, 'kind'>
        }
    },
    // comm/redux
    dispatchProxied: *,
    extensions: Extension[]
}

type State = {
    id?: $PropertyType<Extension, 'id'>,
    error?: string
}

class InstallPageDumb extends Component<Props, State> {
    state = {}

    componentDidMount() {
        this.requestAdd();
    }
    render() {
        console.log('this.props:', this.props);
        const { extensions } = this.props;
        const { id, error } = this.state;


        const extension = id !== undefined ? extensions[id] : undefined;
        let statusMessage;
        if (id === undefined && error === undefined) statusMessage = 'Preparing to download and install...';
        else if (id !== undefined && error === undefined && getStatusMessage(extension.status, extension.statusExtra, this.retry)) statusMessage = getStatusMessage(extension.status, extension.statusExtra, this.retry);
        else if (error) statusMessage = error;
        else statusMessage = 'Installation Completed';

        return (
            <div>
                <div className="Page--intro">
                    { statusMessage }
                </div>
            </div>
        )
    }

    async requestAdd() {
        const {match:{params:{ kind, extid }}} = this.props;
        let storeUrl;
        switch (kind) {
            case 'cws': storeUrl = get_webstore_url(`https://chrome.google.com/webstore/detail/random/${extid}`); break;
            case 'ows': storeUrl = get_webstore_url(`https://addons.opera.com/en/extensions/details/${extid}`); break;
            default: throw new Error('bad kind');
        }
        const errorsOrId = await new Promise( resolve => callInBackground('dispatchSubmitAddForm', { storeUrl }, resolve) );

        console.log('errorsOrId:', errorsOrId);
        if (isObject(errorsOrId)) this.setState(() => ({ error:Object.values(errorsOrId)[0] }));
        else this.setState(() => ({ id:errorsOrId }));
    }

    retry = e => {
        const { dispatchProxied } = this.props;
        const { id } = this.state;
        e.preventDefault();
        e.stopPropagation();
        dispatchProxied(process(id));
    }
}

const InstallPageProxied = proxy(['extensions'])

const InstallPage = InstallPageProxied(InstallPageDumb)

export default InstallPage
