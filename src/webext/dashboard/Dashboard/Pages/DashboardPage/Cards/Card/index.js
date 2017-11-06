// @flow

import React, { PureComponent } from 'react'
import moment from 'moment'
import { pushAlternating } from 'cmn/lib/all'

import { STATUS, install, save, process } from '../../../../../../flow-control/extensions'

import Modal from '../../../../Modal'
import ModalUnsigned from './ModalUnsigned'

import IMAGE_OWS from './images/opera-addons-logo.svg'
import IMAGE_CWS from './images/chrome-web-store-logo-2012-2015.svg'
import IMAGE_EXT_GENERIC from './images/extension-generic-flat-black.svg'
import IMAGE_FOLDER from './images/folder.svg'

import './index.css'

import type { Entry as Extension, Status } from '../../../../../../flow-control/extensions'

type Props = {
    ...Extension,
    dispatchProxied: *,
    shouldShowUnsignedModal: boolean
}

type State = {
    ago: string
}

function pushAlternatingCallback(aTargetArr, aCallback: (index:number) => any) {
    // mutates aTargetArr
	// pushes into an array aEntry, every alternating
		// so if aEntry 0
			// [1, 2] becomes [1, 0, 2]
			// [1] statys [1]
			// [1, 2, 3] becomes [1, 0, 2, 0, 3]
	let l = aTargetArr.length;
	for (let i=l-1; i>0; i--) {
		aTargetArr.splice(i, 0, aCallback(i));
	}

	return aTargetArr;
}

function getSourceImage(kind) {
    switch (kind) {
        case 'cws': return IMAGE_CWS;
        case 'ows': return IMAGE_OWS;
        case 'file': return IMAGE_FOLDER;
        // no default
    }
}

function getName(name, listingTitle) {
    return name || listingTitle.substr(0, listingTitle.lastIndexOf(' - '));
}

function getStatusMessage(status, statusExtra, retry) {
    switch (status) {
        case undefined: return undefined;
        case STATUS.DOWNLOADING: return `Downloading from store...`;
        case STATUS.PARSEING: return 'Parsing';
        case STATUS.CONVERTING: return 'Converting';
        case 'CREDENTIALING': return 'Checking AMO Credentials';
        case 'NOT_LOGGED_IN': return (
            <div className="Card--status-wrap">
                <span className="Card--status--bad">You are not logged in on AMO</span>
                <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                <a className="Card--link Card--link--retry" href="https://addons.mozilla.org/" target="_blank" rel="noopener noreferrer">Login Now</a>
                &nbsp;
                <a href="#" className="Card--link Card--link--retry" onClick={retry}>Retry Now</a>
            </div>
        );
        case 'NEEDS_AGREE': return (
            <div className="Card--status-wrap">
                <span className="Card--status--bad">You need to accept AMO agreement</span>
                <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                <a className="Card--link Card--link--retry" href="https://addons.mozilla.org/en-US/developers/addon/api/key/" target="_blank" rel="noopener noreferrer">View Agreement</a>
                &nbsp;
                <a href="#" className="Card--link Card--link--retry" onClick={retry}>Retry Now</a>
            </div>
        );
        case 'GENERATING_KEYS': return 'Generating AMO Credentials';
        case 'MODING': return 'Preparing presigned package';
        case 'UPLOADING': return `Uploading for review...`;
        case 'CHECKING_REVIEW': return 'Checking review progress';
        case 'WAITING_REVIEW': return `Waiting for review - ${statusExtra.sec}s`;
        case 'FAILED_UPLOAD': return (
            <div className="Card--status-wrap">
                <span className="Card--status--bad">
                    Failed to upload to AMO. {statusExtra.error}
                    { statusExtra.resStatus === 500 && 'Internal server error occured, this extension is likely unsupported by the review system and will even fail manual upload. ' }
                    { statusExtra.resStatus === 500 && <a className="Card--link Card--link--retry" href="https://github.com/mozilla/addons-server/issues/6833" target="_blank" rel="noopener noreferrer">View Github Issue</a> }
                </span>
                <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                <a href="#" className="Card--link Card--link--retry" onClick={retry}>Retry Now</a>
                &nbsp;
                <a className="Card--link Card--link--retry" href="https://addons.mozilla.org/en-US/developers/addon/submit/upload-unlisted" target="_blank" rel="noopener noreferrer">Try Manual Upload</a>
            </div>
        );
        case 'FAILED_REVIEW': return (
            <div className="Card--status-wrap">
                <span className="Card--status--bad">AMO validation failed</span>
                <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                <a className="Card--link Card--link--retry" href={statusExtra.validationUrl} target="_blank" rel="noopener noreferrer">View Validation Results</a>
                &nbsp;
                <a href="#" className="Card--link Card--link--retry" onClick={retry}>Retry Now</a>
                &nbsp;
                <a className="Card--link Card--link--retry" href="https://addons.mozilla.org/en-US/developers/addon/submit/upload-unlisted" target="_blank" rel="noopener noreferrer">Try Manual Upload</a>
            </div>
        );
        case 'DOWNLOADING_SIGNED': return `Downloading signed extension...`;
        default: return (
            <div className="Card--status-wrap">
                <span className="Card--status--bad">{status}</span>
                <span className="Card--status--bad">&nbsp;-&nbsp;</span>
                <a className="Card--link Card--link--retry" onClick={retry} href="#">Retry Now</a>
                &nbsp;
                <a className="Card--link Card--link--retry" href="https://addons.mozilla.org/en-US/developers/addon/submit/upload-unlisted" target="_blank" rel="noopener noreferrer">Try Manual Upload</a>
            </div>
        );
    }
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
                    <a className="Card--link" href={storeUrl} target="_blank" rel="noopener noreferrer">
                        <img src={getSourceImage(kind)} alt="" className="Card--link-image" />
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
                        { pushAlternatingCallback([
                            fileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveExt} key="file">Original</a>,
                            xpiFileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveUnsigned} key="xpi">Unsigned</a>,
                            signedFileId !== undefined && <a href="#" className="Card--link" onClick={this.handleClickSaveSigned} key="signed">Signed</a>
                        ].filter(el => el), ix => <span key={ix}>&nbsp;|&nbsp;</span>) }
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
                <div className="Card--row--spacer" />
                { (!status || (xpiFileId || signedFileId)) &&
                    <div className="Card--row Card--row--buttons">
                        { signedFileId && <a href="#" className="Card--link Card--link-button" onClick={this.handleClickInstall}>Install</a> }
                        { xpiFileId && !signedFileId && <a href="#" className="Card--link Card--link-button" onClick={this.handleClickInstallUnsigned}>Install Unsigned</a> }
                        { !xpiFileId && !signedFileId && <span>Invalid status state</span> }
                    </div>
                }
                { (!status || (xpiFileId || signedFileId)) && <div className="Card--row--spacer" /> }
                { status &&
                    <div className="Card--row">
                        <div className="Card--status-wrap">
                            { getStatusMessage(status, this.props.statusExtra, this.retry) }
                        </div>
                    </div>
                }
                { status && <div className="Card--row--spacer" /> }
                <div className="Card--footer">
                    { ago }
                </div>
            </div>
        )
    }

    handleClickInstallUnsigned = stopEvent(() => {
        const { id, dispatchProxied, shouldShowUnsignedModal } = this.props;
        // TODO: show box explaining unsigned only installs in dev/nightly if they are beta/release/esr - and show directions on how to install it as temporary
        // dev/nightly can enable "do not show dialog again", if thats the case go straight to install
        if (shouldShowUnsignedModal) Modal.show(<ModalUnsigned id={id} dispatchProxied={dispatchProxied} />)
        else dispatchProxied(install(id, false));
    })
    handleClickInstall = stopEvent(() => {
        const { id, dispatchProxied } = this.props;
        dispatchProxied(install(id, true));
    })

    handleClickSaveExt = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'ext')) )
    handleClickSaveUnsigned = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'unsigned')) )
    handleClickSaveSigned = stopEvent(() => this.props.dispatchProxied(save(this.props.id, 'signed')) )

    getAgo() {
        return moment(this.props.date).fromNow();
    }

    retry = e => {
        const { dispatchProxied, id } = this.props;
        e.preventDefault();
        dispatchProxied(process(id));
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

export { getStatusMessage }
export default Card
