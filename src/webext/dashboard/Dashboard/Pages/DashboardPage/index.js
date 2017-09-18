// @flow

import React, { PureComponent } from 'react'

import AddForm from './AddForm'

import './index.css'

class DashboardPage extends PureComponent<void, void> {
    render() {
        return (
            <div>
                <p className="Page--intro">
                    A panel to all your extension downloads
                </p>
                <AddForm />
            </div>
        )
    }
}

export default DashboardPage
