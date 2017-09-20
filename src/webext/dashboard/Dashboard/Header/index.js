// @flow

import React, { PureComponent } from 'react'
import { withRouter } from 'react-router-dom'

import Nav from './Nav'

import LOGO from '../../../icon64.png'
import './index.css'

class Header extends PureComponent<void, void> {
    render() {
        return (
            <div className="Header">
                <img src={LOGO} className="Header--logo" />
                <h1 className="Header--title">Chrome Store Foxified</h1>
                <Nav />
            </div>
        )
    }
}

export default withRouter(Header)
