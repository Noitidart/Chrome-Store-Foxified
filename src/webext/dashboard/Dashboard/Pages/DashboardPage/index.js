// @flow

import React, { PureComponent } from 'react'

import proxy from '../../../connect'

import AddForm from './AddForm'
import Cards from './Cards'

import './index.css'

type Props = {
    location: {
        state?: {
            key: string
        }
    },
    // proxy
    dispatchProxied: () => void
}

const DATE_PAGE_LOADED = Date.now().toString();

class DashboardPageDumb extends PureComponent<Props, void> {
    render() {
        const {location:{state:{ key:pageKey=DATE_PAGE_LOADED }={}}, dispatchProxied, api } = this.props;

        console.log('pageKey:', pageKey, 'dispatchProxied:', dispatchProxied);
        return (
            <div>
                <p className="Page--intro">
                    A panel to all your extension downloads
                </p>
                <AddForm form={`register_${pageKey}`} actionId={`register_${pageKey}`} dispatch={dispatchProxied} api={api} />
                <Cards />
            </div>
        )
    }
}

const DashboardPageProxied = proxy(['api'])

const DashboardPage = DashboardPageProxied(DashboardPageDumb)

export default DashboardPage
