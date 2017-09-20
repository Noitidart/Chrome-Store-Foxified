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
                <div className="Card--header">
                    <img className="Card--header-logo" src={EXT_LOGO_GENERIC} alt="" />
                    <h3 className="Card--header-title">
                        { name || listingTitle.substr(0, listingTitle.lastIndexOf(' - ')) }
                    </h3>
                </div>
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
            </div>
        )
    }
}

export default Card
