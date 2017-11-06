// @flow

import React, { PureComponent } from 'react'

import proxy from '../../connect'
import { install } from '../../../flow-control/extensions'

import Modal from '../Modal'

import './index.css'

import type { Shape as AccountShape } from '../../../flow-control/account'

type State = {

}

class ModalWelcome extends PureComponent<void, State> {
    state = {

    }

    render() {
        return (
            <div className="ModalUnsigned">
                <a href="#" onClick={this.hide}>Hide</a>
                Weclome!
            </div>
        )
    }

    hide = e => {
        e.preventDefault();
        Modal.hide();
    }
}

export default ModalWelcome
