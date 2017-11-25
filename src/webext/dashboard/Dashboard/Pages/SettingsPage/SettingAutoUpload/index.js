// @flow

import React, { PureComponent } from 'react'
import classnames from 'cmn/lib/classnames'

import proxy from '../../../../connect'
import { set } from '../../../../../flow-control/account'

import type { Shape as AccountShape } from '../../../../../flow-control/account'

type Props = {
    account: AccountShape,
    dispatchProxied: *
}

class SettingAutoUploadDumb extends PureComponent<Props, void> {
    render() {
        const { account:{ dontAutoUpload } } = this.props;
        return (
            <div className="Field--stack">
                <div className="Field--row">
                    <label className="Field--label">
                        Instant Upload
                    </label>
                    <a className={classnames('Card--link Card--link--normal', !dontAutoUpload && 'Card--link--button-danger')} href="#" onClick={this.toggle}>
                        { dontAutoUpload ? 'Enable' : 'Disable' }
                    </a>
                </div>
                <div className="Field--row">
                    <div className="Field--label" />
                    <div className="Field--desc">
                        After converting to &quot;Unsigned Extension&quot;, if enabled it will upload right away to turn into &quot;Signed Extension&quot; else you will have to click &quot;Sign Now&quot; button.
                    </div>
                </div>
            </div>
        )
    }

    toggle = e => {
        e.preventDefault();
        const { dispatchProxied, account:{ dontAutoUpload } } = this.props;
        dispatchProxied(set({ dontAutoUpload:!dontAutoUpload }));
    }
}

const SettingAutoUploadProxied = proxy(['account'])

const SettingAutoUpload = SettingAutoUploadProxied(SettingAutoUploadDumb)

export default SettingAutoUpload
