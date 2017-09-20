// @flow

import React, { PureComponent } from 'react'

import CWS_LOGO from './images/chrome-web-store-logo-2012-2015.svg'
import EXT_LOGO_GENERIC from './images/extension-generic-flat-black.svg'

import './index.css'

import type { Entry as Extension } from '../../../../../../flow-control/extensions'

type Props = {
    ...Extension
}

class Card extends PureComponent<Props, void> {
    render() {
        const { name, storeUrl, listingTitle } = this.props;
        return (
            <div className="Card">
                <div className="Card--background" />
                <div className="Card--header">
                    Downloading
                </div>
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
                <div className="Card--footer">
                    2 days ago
                </div>
            </div>
        )
    }
}

export default Card
