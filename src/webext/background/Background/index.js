// @flow

import React, { PureComponent } from 'react'
import { connect } from 'react-redux'

import BrowserAction from './BrowserAction'

import DASHBOARD_PAGE from '../../dashboard/index.html'

type Props = {
    isRehydrated: boolean,
    isFirstRun: boolean
}

class BackgroundDumb extends PureComponent<Props> {
    componentDidUpdate(propsOld) {
        const { isRehydrated, isFirstRun } = this.props;
        const { isRehydrated:isRehydratedOld } = propsOld

        if (isRehydrated && !isRehydratedOld) {
            if (isFirstRun) this.openDashboard();
        }
    }
    componentDidMount() {
        const { isRehydrated, isFirstRun } = this.props;

        if (isRehydrated) {
            if (isFirstRun) this.openDashboard();
        }
    }
    render() {
        return (
            <div>
                <BrowserAction />
            </div>
        )
    }

    openDashboard() {
        extension.tabs.create({ url:DASHBOARD_PAGE });
    }
}

const BackgroundSmart = connect(
    function({ _persist:{ rehydrated }, account:{ isFirstRun }}) {
        return {
            isRehydrated: rehydrated,
            isFirstRun
        }
    }
)

const Background = BackgroundSmart(BackgroundDumb)

export default Background
