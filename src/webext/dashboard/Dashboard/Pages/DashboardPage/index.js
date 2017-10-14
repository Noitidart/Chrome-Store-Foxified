// @flow

import React, { PureComponent } from 'react'

import AddForm from './AddForm'
import Cards from './Cards'

import './index.css'

type Props = {
    location: {
        state?: {
            key: string
        }
    }
}

class DashboardPage extends PureComponent<Props, void> {
    render() {
        // const {location:{state:{ key }}} = this.props;
        console.log('props:', this.props);
        return (
            <div>
                <p className="Page--intro">
                    A panel to all your extension downloads
                </p>
                <AddForm />
                <Cards />
            </div>
        )
    }
}

export default DashboardPage
