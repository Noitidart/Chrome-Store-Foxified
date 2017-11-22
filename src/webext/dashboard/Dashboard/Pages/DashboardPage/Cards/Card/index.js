// @flow

import React, { PureComponent } from 'react'
import { Link } from 'react-router-dom'
import moment from 'moment'
import classnames from 'cmn/lib/classnames'

import { callInBackground } from '../../../../../connect'
import { fetchApi } from '../../../../../../flow-control/utils'
import { normalizeUniversal } from '../../../../../../flow-control/normalizers'
import { STATUS, install, save, process, deleteExtension } from '../../../../../../flow-control/extensions'

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
    forename: string,
    dispatchProxied: *,
    shouldShowUnsignedModal: boolean,
    push: () => void
}

type State = {
    ago: string,
    isLoading: boolean,
    extensions: {},
    comments: {},
    thumbs: {},
    displaynames: {},
    isChecking: boolean,
    isUpdateAvailable?: boolean
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
        ago: this.getAgo(),
        isLoading: true,
        displaynames: {},
        thumbs: {},
        comments: {},
        isChecking: false
    }

    componentDidUpdate(propsOld) {
        const { name } = this.props;
        const { name:nameOld } = propsOld;

        if (name !== nameOld) this.loadEntitys();

    }
    componentDidMount() {
        this.agoInterval = setInterval(() => this.setState(() => ({ ago:this.getAgo() })), 30000);
        if (this.props.name) this.loadEntitys();
    }
    componentWillUnmount() {
        clearInterval(this.agoInterval);
    }
    render() {
        const { name, date, version, storeUrl, listingTitle, status, fileId, xpiFileId, signedFileId, kind, forename } = this.props;
        const { ago, isLoading, thumbs, displaynames, comments, isChecking } = this.state;

        const hasForename = !!forename;
        const displayname = hasForename && Object.values(displaynames).find(displayname => displayname.forename === forename);
        const thumbUpCnt = Object.values(thumbs).reduce( (sum, { like }) => like ? ++sum : sum, 0 );
        const thumbDnCnt = Object.values(thumbs).reduce( (sum, { like }) => !like ? ++sum : sum, 0 );
        const thumb = displayname ? Object.values(thumbs).find(thumb => thumb.displayname_id === displayname.id) : null;
        const isThumbUp = thumb && thumb.like;
        const isThumbDn = thumb && !thumb.like;
        const commentsCnt = Object.values(comments).length;

        const hasFile = !!fileId;
        const hasXpi = !!xpiFileId;
        const hasSigned = !!signedFileId;
        const isFile = kind === 'file';

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
                    { !isFile &&
                        <a className="Card--link" href={storeUrl} target="_blank" rel="noopener noreferrer">
                            <img src={getSourceImage(kind)} alt="" className="Card--link-image" />
                            <span className="Card--link-label">
                                { isFile ? 'Your Computer' : listingTitle }
                            </span>
                        </a>
                    }
                    { isFile &&
                        <span className="Card--link">
                            <img src={IMAGE_FOLDER} alt="" className="Card--link-image" />
                            <span className="Card--link-label">
                                Your Computer
                            </span>
                        </span>
                    }
                </div>
                { (hasFile || hasXpi || hasSigned) &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Save to Disk
                        </div>
                        { pushAlternatingCallback([
                            hasFile && <a href="#" className="Card--link" onClick={this.handleClickSaveExt} key="file">Original</a>,
                            hasXpi && <a href="#" className="Card--link" onClick={this.handleClickSaveUnsigned} key="xpi">Unsigned</a>,
                            hasSigned && <a href="#" className="Card--link" onClick={this.handleClickSaveSigned} key="signed">Signed</a>
                        ].filter(el => el), ix => <span key={ix}>&nbsp;|&nbsp;</span>) }
                    </div>
                }
                { !!version &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Version
                        </div>
                        <span className="Card--text">{version}</span>
                    </div>
                }
                { !isFile && !status &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Update
                        </div>
                        <span className="Card--text">
                            { !isChecking && <a href="#" onClick={this.checkUpdate} className="Card--link Card--link--normal">Check for updates</a> }
                            { isChecking && 'Checking...' }
                        </span>
                    </div>
                }
                { !!name && !isFile &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Works for you?
                        </div>
                        { isLoading &&
                            <span className="Card--text">
                                Loading...
                            </span>
                        }
                        { !isLoading &&
                            <span className="Card--text">
                                <a href="#" onClick={this.thumbUp} className={classnames('Card--link Card--link--normal', isThumbUp && 'Thumb--green')}>Yes</a> ({thumbUpCnt})
                                &nbsp; | &nbsp;
                                <a href="#" onClick={this.thumbDn} className={classnames('Card--link Card--link--normal', isThumbDn && 'Thumb--red')}>No</a> ({thumbDnCnt})
                                &nbsp; | &nbsp;
                                <Link className="Card--link Card--link--normal" to={`/topic/${kind}/${name}`}>Discuss</Link> ({commentsCnt})
                            </span>
                        }
                    </div>
                }
                { hasFile &&
                    <div className="Card--row">
                        <div className="Card--label">
                            Update
                        </div>
                        <span className="Card--text">
                            { !isChecking && <a href="#" onClick={this.checkUpdate} className="Card--link Card--link--normal">Check for updates</a> }
                            { isChecking && 'Checking...' }
                        </span>
                    </div>
                }
                <div className="Card--row--spacer" />
                <div className="Card--row Card--row--buttons">
                    { hasSigned && <a href="#" className="Card--link Card--link--button" onClick={this.handleClickInstall}>Install</a> }
                    { hasXpi && !hasSigned && <a href="#" className="Card--link Card--link--button" onClick={this.handleClickInstallUnsigned}>Install Unsigned</a> }
                    { !status && !hasXpi && !hasSigned && <span>Possible invalid status state</span> }
                    &nbsp;&nbsp;&nbsp;
                    <a href="#" className="Card--link Card--link--button Card--link--button Card--link--button-danger" onClick={this.delete}>{ status ? 'Cancel' : 'Delete' }</a>
                </div>
                { (!status || (hasXpi || hasSigned)) && <div className="Card--row--spacer" /> }
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

    delete = e => {
        const { dispatchProxied, id } = this.props;
        e.preventDefault();
        dispatchProxied(deleteExtension(id));
    }

    thumbUp = async e => {
        const { dispatchProxied, id, name, kind, forename, push } = this.props;
        e.preventDefault();

        const hasForename = !!forename;

        if (!hasForename) {
            setTimeout(() => {
                const shouldGoToSettings = confirm('To be able to vote, you need to first set a "display name" from the settings page. Go there now?')
                if (shouldGoToSettings) push('settings');
            }, 0);
            return;
        }

        const { displaynames, thumbs } = this.state;
        const displayname = Object.values(displaynames).find(displayname => displayname.forename === forename);
        const thumb = displayname ? Object.values(thumbs).find(thumb => thumb.displayname_id === displayname.id) : null;
        const isThumbUp = thumb && thumb.like;
        const isThumbDn = thumb && !thumb.like;

        if (isThumbUp) {
            this.thumbDelete();
        } else {
            this.setState(() => ({ isLoading:true }));
            const res = await fetchApi(isThumbDn ? `thumbs/${thumb.id}` : 'thumbs', {
                method: isThumbDn ? 'PUT' : 'POST',
                body: {
                    name,
                    kind,
                    forename,
                    like: true
                }
            });
            console.log('res.status:', res.status);
            this.loadEntitys();
        }

    }
    thumbDn = async e => {
        const { dispatchProxied, id, name, kind, forename, push } = this.props;
        e.preventDefault();

        const hasForename = !!forename;

        if (!hasForename) {
            setTimeout(() => {
                const shouldGoToSettings = confirm('To be able to vote, you need to first set a "display name" from the settings page. Go there now?')
                if (shouldGoToSettings) push('settings');
            }, 0);
            return;
        }

        const { displaynames, thumbs } = this.state;
        const displayname = Object.values(displaynames).find(displayname => displayname.forename === forename);
        const thumb = displayname ? Object.values(thumbs).find(thumb => thumb.displayname_id === displayname.id) : null;
        const isThumbUp = thumb && thumb.like;
        const isThumbDn = thumb && !thumb.like;

        if (isThumbDn) {
            this.thumbDelete();
        } else {
            this.setState(() => ({ isLoading:true }));
            const res = await fetchApi(isThumbUp ? `thumbs/${thumb.id}` : 'thumbs', {
                method: isThumbUp ? 'PUT' : 'POST',
                body: {
                    name,
                    kind,
                    forename,
                    like: false
                }
            });
            console.log('res.status:', res.status);
            this.loadEntitys();
        }


    }
    thumbDelete = async e => {
        const { dispatchProxied, id, name, kind, forename } = this.props;
        if (e) e.preventDefault();

        const { displaynames, thumbs } = this.state;
        const displayname = Object.values(displaynames).find(displayname => displayname.forename === forename);
        if (!displayname) return; // not  thumbed by this forename
        const thumb = Object.values(thumbs).find(thumb => thumb.displayname_id === displayname.id);

        this.setState(() => ({ isLoading:true }));
        const res = await fetchApi(`thumbs/${thumb.id}`, { method:'DELETE', qs:{ forename } });

        console.log('res.status:', res.status);

        this.loadEntitys();
    }
    loadEntitys = async () => {
        const { name, kind } = this.props;
        const res = await fetchApi(`extension`, { qs:{ name, kind } });
        if (res.status === 404) {
            this.setState(() => ({ isLoading:false, comments:{}, thumbs:{}, displaynames:{} }));
        } else {
            const reply = await res.json();
            this.setState(() => ({ isLoading:false, ...normalizeUniversal(reply) }));
        }
    }

    checkUpdate = async () => {
        const { id, storeUrl, name } = this.props; // TODO: name is available whenever checkUpdate can run?
        this.setState(() => ({ isChecking:true }));

        const { isUpdateAvailable, versionNew } = await new Promise( resolve => callInBackground('dispatchCheckUpdate', id, resolve) );

        this.setState(() => ({ isChecking:false }));

        if (isUpdateAvailable) alert(`${name} :: An update is available (v${versionNew}). . To update, click on "Delete" then go back to extension page on the store and click "Add to Firefox".`);
        else alert(`${name} :: No update available`);
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
