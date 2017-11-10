// @flow

import React, { PureComponent } from 'react'

import './index.css'

import type { Extension } from '../../../../flow-control/extensions'

type Props = {
    // router
    match: {
        params: {
            extid: string,
            kind: $PropertyType<Extension, 'kind'>
        }
    },
}

class TopicPage extends PureComponent<Props, void> {
    render() {
        const {match:{params:{ kind, extid }}} = this.props;

        return (
            <div>
                <p className="Page--intro">
                    Topic page
                </p>
            </div>
        )
    }
}

export default TopicPage
