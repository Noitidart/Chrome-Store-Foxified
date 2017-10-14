// @flow

import React, { Component } from 'react'
import { connect } from 'react-redux'
import wrapDisplayName from 'recompose/wrapDisplayName'

import type { Shape as AppShape } from '../flow-control'

type RenderProp = (rehydrated: boolean) => Element
type LoadingProps = {
    rehydrated: false
}
type OwnProps =
  {
    LoadingComponent?: ComponentType<LoadingProps>,
    render: RenderProp
  } &
  {
    LoadingComponent?: ComponentType<LoadingProps>,
    children: RenderProp
  }

type Props = {
    ...OwnProps,
    rehydrated: boolean
}

class ForRehydratedDumb extends Component<Props> {
    render() {
        const { render, children, rehydrated, LoadingComponent } = this.props;

        const renderProp = render || children;

        console.log('rehydrated:', rehydrated);

        if (rehydrated) {
            return renderProp(rehydrated);
        } else {
            return LoadingComponent ? <LoadingComponent rehydrated={false} /> : null;
        }
    }
}

const withRedux = connect(
    function({_persist:{ rehydrated }}: AppShape) {
        return {
            rehydrated
        }
    }
)

const ForRehydrated = withRedux(ForRehydratedDumb)

export default ForRehydrated
