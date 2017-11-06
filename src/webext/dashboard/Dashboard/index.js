import React, { PureComponent } from 'react'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'

import store from './subflow'

import DonateReminder from './DonateReminder'
import ShouldShowModalWelcome from './ShouldShowModalWelcome'
import Modal from './Modal'
import Header from './Header'
import Pages from './Pages'

import './theme-default.css'
import './index.css'

class Dashboard extends PureComponent<void, void, void> {
    render() {
        return (
            <Provider store={store}>
                <HashRouter>
                    <div className="App">
                        <Modal />
                        <ShouldShowModalWelcome />
                        <DonateReminder />
                        <Header />
                        <Pages />
                    </div>
                </HashRouter>
            </Provider>
        )
    }
}

export default Dashboard
