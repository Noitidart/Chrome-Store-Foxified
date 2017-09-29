// @flow

import React, { PureComponent } from 'react'
import moment from 'moment'

import { STATUS } from '../../../../../../flow-control/extensions'

import CWS_LOGO from './images/chrome-web-store-logo-2012-2015.svg'
import EXT_LOGO_GENERIC from './images/extension-generic-flat-black.svg'

import './index.css'

import type { Entry as Extension, Status } from '../../../../../../flow-control/extensions'

type Props = {
    ...Extension
}

function getStatusMessage(status: Status) {
    switch (status) {
        case STATUS.DOWNLOADING: return 'Downloading';
        case STATUS.PARSEING: return 'Parsing';
        case STATUS.CONVERTING: return 'Converting';
        // no default
    }
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
                        { name || listingTitle.substr(0, listingTitle.lastIndexOf(' - ')) }
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
                        { fileId !== undefined &&
                            <a href="#" className="Card--link">
                                <span className="Card--link-label">
                                    CRX
                                </span>
                            </a>
                        }
                        { xpiFileId !== undefined &&
                            <a href="#" className="Card--link">
                                Unsigned
                            </a>
                        }
                        { signedFileId !== undefined &&
                            <a href="#" className="Card--link">
                                Signed
                            </a>
                        }
                    </div>
                }
                <div className="Card--row">
                    <a href="#" className="Card--link">Install Temporary</a>
                    <a href="#" className="Card--link">Install</a>
                </div>
                <div className="Card--footer">
                    { moment(date).fromNow() }
                </div>
            </div>
        )
    }
}

export default Card
