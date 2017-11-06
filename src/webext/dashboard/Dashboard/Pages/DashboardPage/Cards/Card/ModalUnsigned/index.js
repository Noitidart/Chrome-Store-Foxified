// @flow

import React, { PureComponent } from 'react'

import { install } from '../../../../../../../flow-control/extensions'
import { set } from '../../../../../../../flow-control/account'

import Modal from '../../../../../Modal'

import './index.css'

import type { Entry as Extension } from '../../../../../../../flow-control/extensions'

type Props = {
    id: $PropertyType<Extension, 'id'>,
    dispatchProxied: () => void
}

class ModalUnsigned extends PureComponent<Props> {

    render() {
        return (
            <div className="ModalUnsigned">
                <a href="#" onClick={this.confirm}>Yes, continue to install unsigned</a>
                <a href="#" onClick={this.hide}>Cancel</a>

                <input type="checkbox" onChange={this.handleChange} id="shouldShow" />
                <label htmlFor="shouldShow"> Do not show this dialog again</label>
            </div>
        )
    }

    hide = e => {
        e.preventDefault();
        Modal.hide();
    }
    confirm = e => {
        e.stopPropagation();
        e.preventDefault();
        this.props.dispatchProxied(install(this.props.id, false));
        Modal.hide();
    }
    handleChange = e => this.props.dispatchProxied(set({ shouldShowUnsignedModal:!e.target.checked }))
}

export default ModalUnsigned
