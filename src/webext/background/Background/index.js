import React, { PureComponent } from 'react'
import { Provider } from 'react-redux'

import store from '../../flow-control'

import ForRehydrated from '../../ForRehydrated'
import BrowserAction from './BrowserAction'

const renderProp = () => <div><BrowserAction /></div>;

class Background extends PureComponent<void, void> {
    render() {
        return (
            <Provider store={store}>
                <ForRehydrated>
                    { renderProp }
                </ForRehydrated>
            </Provider>
        )
    }
}

export default Background
