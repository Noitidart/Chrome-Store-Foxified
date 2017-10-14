// @flow

import React, { Component } from 'react'
import { connect } from 'react-redux'
import wrapDisplayName from 'recompose/wrapDisplayName'

import type { Shape as AppShape } from '../flow-control'

type OwnProps = {
    LoadingComponent?: ComponentType
}

type Props = {
    ...OwnProps,
    rehydrated: boolean
}

const withRedux = connect(
    function({_persist:{ rehydrated }}: AppShape) {
        return {
            rehydrated
        }
    }
)

function withRehydrated(WrappedComponent: ComponentType) {
    class WithRehydrated extends Component<Props> {
        static displayName = wrapDisplayName(WrappedComponent, 'withRehydrated')

        render() {
            const { rehydrated, LoadingComponent } = this.props;
            if (rehydrated) {
                return <WrappedComponent />
            } else {
                return LoadingComponent ? <LoadingComponent /> : null;
            }
        }

    }

    return withRedux(WithRehydrated)
}

export default withRehydrated
