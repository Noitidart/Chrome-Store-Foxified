import React, { PureComponent } from 'react'
import { Provider } from 'react-redux'

import { gReduxServer } from '../'

import BrowserAction from './BrowserAction'

class Background extends PureComponent<void, void> {
    render() {
        return (
            <Provider store={gReduxServer.store}>
                <div>
                    <BrowserAction />
                </div>
            </Provider>
        )
    }
}

export default Background