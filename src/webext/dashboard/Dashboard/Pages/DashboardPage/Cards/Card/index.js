// @flow

import React, { PureComponent } from 'react'
import moment from 'moment'

import { STATUS, installUnsigned, save } from '../../../../../../flow-control/extensions'

import IMAGE_CWS from './images/chrome-web-store-logo-2012-2015.svg'
import IMAGE_EXT_GENERIC from './images/extension-generic-flat-black.svg'
import IMAGE_FOLDER from './images/folder.svg'

import './index.css'

import type { Entry as Extension, Status } from '../../../../../../flow-control/extensions'

type Props = {
    ...Extension,
    dispatchProxied: *
}

type State = {
    ago: string
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

class Card extends PureComponent<Props, State> {
    agoInterval: number
    state = {
        ago: this.getAgo()
    }

    componentDidMount() {
        this.agoInterval = setInterval(() => this.setState(() => ({ ago:this.getAgo() })), 30000);
    }
    componentWillUnmount() {
        clearInterval(this.agoInterval);
    }
    render() {
        const { name, date, version, storeUrl, listingTitle, status, fileId, xpiFileId, signedFileId, kind } = this.props;
        const { ago } = this.state;

        return (
            <div className="Card">
                <div className="Card--background" />
                <div className="Card--row Card--row--title">
                    <img className="Card--logo" src={IMAGE_EXT_GENERIC} alt="" />
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
                        <img src={kind === 'file' ? IMAGE_FOLDER : IMAGE_CWS} alt="" className="Card--link-image" />
                        <span className="Card--link-label">
                        { kind === 'file' ? 'Your Computer' : listingTitle }
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
                { version !== undefined &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Version
                        </div>
                        <span className="Card--text">{version}</span>
                    </div>
                }
                { !status &&
                    <div className="Card--row Card--row--buttons">
                        { xpiFileId && !signedFileId && <a href="#" className="Card--link Card--link-button" onClick={this.handleClickInstallUnsigned}>Install Unsigned</a> }
                        { signedFileId && <a href="#" className="Card--link Card--link-button">Install</a> }
                        { !xpiFileId && !signedFileId && <span>Invalid status state</span> }
                    </div>
                }
                { status &&
                    <div className="Card--row">
                        { getStatusMessage(status) }
                    </div>
                }
                <div className="Card--footer">
                    { ago }
                </div>
            </div>
        )
    }

    handleClickInstallUnsigned = stopEvent(() => this.props.dispatchProxied(installUnsigned(this.props.id)) ) // TODO: show box explaining unsigned only installs in dev/nightly if they are beta/release/esr - and show directions on how to install it as temporary

    handleClickSaveExt = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'ext')) )
    handleClickSaveUnsigned = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'unsigned')) )
    handleClickSaveSigned = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'signed')) )

    getAgo() {
        return moment(this.props.date).fromNow();
    }
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
