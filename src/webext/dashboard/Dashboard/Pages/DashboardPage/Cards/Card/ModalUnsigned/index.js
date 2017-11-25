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
                <div className="ModalUnsigned--para">
                    <h3>Default / ESR / Beta</h3>
                    If your Firefox version is default, ESR, or beta, due to the change in the Firefox addon system, unsigned addons cannot <i>automatically</i> be installed by Chrome Store Foxified. You will have to first save to disk the &quot;Unsignd&quot; file, then go to <b>about:debugging</b> and then click on <b>&quot;Load Temporary Addon&quot;</b> and select the saved file.
                </div>
                <div className="ModalUnsigned--para">
                    <h3>Developer Edition / Nightly</h3>
                    In order to enable installing unsigned addons automatically, you have to first go to <b>about:config</b> and then toggle the <b>xpinstall.signatures.required</b> preference to <b>false</b>. Once you have done that, Chrome Store Foxified can automatically install unsigned addons.
                </div>

                <div className="ModalUnsigned--checkbox">
                    <input type="checkbox" onChange={this.handleChange} id="shouldShow" />
                    <label htmlFor="shouldShow"> Do not show this dialog again</label>
                </div>

                <a className="ModalUnsigned--button" href="#" onClick={this.confirm}>Yes, continue to install unsigned</a>
                <a className="ModalUnsigned--button" href="#" onClick={this.hide}>Cancel</a>
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
