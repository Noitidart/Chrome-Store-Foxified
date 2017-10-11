// @flow

import React, { PureComponent } from 'react'

import proxy from '../../../../connect'
import { up, upAsync, dn } from '../../../../../flow-control/counter'
import { addFile, deleteFile, editFile } from '../../../../../flow-control/files'

import type { Shape as CounterShape } from '../../../../../flow-control/counter'

type Props = {
    // comm/redux
    counter: CounterShape,
    dispatchProxied: *
}

class CounterDumb extends PureComponent<Props, void> {
    render () {
        const { counter } = this.props;
        return (
            <div>
                <div>
                    Count: {counter}
                </div>
                <button onClick={this.handleUp}>Up</button>
                <button onClick={this.handleUpAsync}>Up Async</button>
                <button onClick={this.handleDn}>Dn</button>
            </div>
        )
    }

    handleUp = () => this.props.dispatchProxied(up());
    handleUpAsync = () => this.props.dispatchProxied(upAsync(6));
    handleDn = () => this.props.dispatchProxied(dn());

    addFile = () => this.props.dispatchProxied(addFile(new Date().toLocaleTimeString()));
}

const CounterProxied = proxy(['counter'])

const Counter = CounterProxied(CounterDumb)

export default Counter
