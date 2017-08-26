import React, { PureComponent } from 'react'

import proxy from '../../../../connect'
import { up, upAsync, dn } from '../../../../../flow-control/counter'

import type { Shape as CounterShape } from '../../../../../flow-control/counter'

type Props = {
    // comm/redux
    counter: CounterShape,
    dispatchProxied: *
}

class CounterDumb extends PureComponent<void, Props, void> {
    handleUp = () => this.props.dispatchProxied(up());
    handleUpAsync = () => this.props.dispatchProxied(upAsync(6));
    handleDn = () => this.props.dispatchProxied(dn());
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
}

const CounterProxied = proxy(['counter'])

const Counter = CounterProxied(CounterDumb)

export default Counter