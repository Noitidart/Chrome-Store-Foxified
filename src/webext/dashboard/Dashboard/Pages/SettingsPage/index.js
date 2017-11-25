// @flow

import React, { PureComponent } from 'react'

import RegisterForm from './RegisterForm'
import SettingAutoUpload from './SettingAutoUpload'

import { callInBackground } from '../../../connect'

import './index.css'

class SettingsPage extends PureComponent<void, void> {
    render() {
        return (
            <div>
                <p className="Page--intro">
                    Customize your experience ^_^
                </p>
                <RegisterForm />
                <SettingAutoUpload />
                <div className="Field--stack">
                    <div className="Field--row">
                        <label className="Field--label">
                            Memory
                        </label>
                        <a className="Card--link Card--link--button-danger Card--link--normal" href="#" onClick={this.purgeStore}>
                            Clear Memory
                        </a>
                    </div>
                    <div className="Field--row">
                        <div className="Field--label" />
                        <div className="Field--desc">
                            If you are getting blank pages, or an error happend, clear memory then restart the extension or browser.
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    purgeStore(e) {
        e.preventDefault();
        callInBackground('purgeStore');
        alert('Memory was cleared! On the next load of extension (browser restart, or extension disable then re-enable), none of the current state will be restored. Unless you do more actions right now, that cause the state to be saved again.')
    }
}

export default SettingsPage
