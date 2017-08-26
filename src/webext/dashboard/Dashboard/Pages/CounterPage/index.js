// @flow

import React, { PureComponent } from 'react'

import Counter from './Counter'

import './index.css'

class CounterPage extends PureComponent<void, void> {
    render() {
        return (
            <div>
                <p className="App-intro">
                    Let's count... 1.. 2.. 3..
                </p>
                <Counter />
            </div>
        )
    }
}

export default CounterPage