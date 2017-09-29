import React, { PureComponent } from 'react'
import { Provider } from 'react-redux'

import { gReduxServer } from '../'

import BrowserAction from './BrowserAction'
import Resumer from './Resumer'

class Background extends PureComponent<void, void> {
    render() {
        return (
            <Provider store={gReduxServer.store}>
                <div>
                    <BrowserAction />
                    <Resumer />
                </div>
            </Provider>
        )
    }
}

export default Background
