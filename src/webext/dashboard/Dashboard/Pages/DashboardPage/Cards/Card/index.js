// @flow

import React, { PureComponent } from 'react'
import moment from 'moment'

import { STATUS, installUnsigned, save } from '../../../../../../flow-control/extensions'

import CWS_LOGO from './images/chrome-web-store-logo-2012-2015.svg'
import EXT_LOGO_GENERIC from './images/extension-generic-flat-black.svg'

import './index.css'

import type { Entry as Extension, Status } from '../../../../../../flow-control/extensions'

type Props = {
    ...Extension,
    dispatchProxied: *
}

function getStatusMessage(status: Status) {
    switch (status) {
        case STATUS.DOWNLOADING: return 'Downloading';
        case STATUS.PARSEING: return 'Parsing';
        case STATUS.CONVERTING: return 'Converting';
        // no default
    }
}

function getName(name, listingTitle) {
    return name || listingTitle.substr(0, listingTitle.lastIndexOf(' - '));
}

class Card extends PureComponent<Props, void> {
    render() {
        const { name, date, storeUrl, listingTitle, status, fileId, xpiFileId, signedFileId } = this.props;
        return (
            <div className="Card">
                <div className="Card--background" />
                { status &&
                    <div className="Card--header">
                        { getStatusMessage(status) }
                    </div>
                }
                <div className="Card--row Card--row--title">
                    <img className="Card--logo" src={EXT_LOGO_GENERIC} alt="" />
                    <h3 className="Card--title">
                        { getName(name, listingTitle) }
                    </h3>
                </div>
                <hr className="Card--divider-title" />
                <div className="Card--row">
                    <div className="Card--label">
                        Source
                    </div>
                    <a href={storeUrl} target="_blank" className="Card--link">
                        <img src={CWS_LOGO} alt="" className="Card--link-image" />
                        <span className="Card--link-label">
                            {listingTitle}
                        </span>
                    </a>
                </div>
                { [fileId, xpiFileId, signedFileId].some( entry => entry ) &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Save to Disk
                        </div>
                        { fileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveExt}>CRX</a> }
                        { xpiFileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveUnsigned}>Unsigned</a> }
                        { signedFileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveSigned}>Signed</a> }
                    </div>
                }
                <div className="Card--row">
                    <a href="#" className="Card--link" onClick={this.handleClickInstallUnsigned}>Install Unsigned</a>
                    <a href="#" className="Card--link">Install</a>
                </div>
                <div className="Card--footer">
                    { moment(date).fromNow() }
                </div>
            </div>
        )
    }

    handleClickInstallUnsigned = stopEvent(() => this.props.dispatchProxied(installUnsigned(this.props.id)) ) // TODO: show box explaining unsigned only installs in dev/nightly if they are beta/release/esr - and show directions on how to install it as temporary

    handleClickSaveExt = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'ext')) )
    handleClickSaveUnsigned = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'unsigned')) )
    handleClickSaveSigned = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'signed')) )
}

function stopEvent(func) {
    return e => {
        e.preventDefault();
        e.stopPropagation();
        func(e);
    }
}

// function stopEvent(func<T: Node>: (e: SyntheticEvent<T>) => void) {
//     return e => {
//         e.preventDefault();
//         e.stopPropagation();
//         func(e);
//     }
// }

export default Card
