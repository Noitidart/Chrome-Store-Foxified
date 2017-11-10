// @flow

import React, { PureComponent } from 'react'
import { Link } from 'react-router-dom'

import './index.css'
import IMAGE_OWS from '../DashboardPage/Cards/Card/images/opera-addons-logo.svg'
import IMAGE_CWS from '../DashboardPage/Cards/Card/images/chrome-web-store-logo-2012-2015.svg'

class ForumsPage extends PureComponent<void> {
    render() {
        // const { } = this.props;

        return (
            <div>
                <p className="Page--intro">
                    Extensions are split into categories, choose a category:
                </p>
                <div className="Forum--badges">
                    <Link className="Forum--badge" to="/forum/cws">
                        <img src={IMAGE_CWS} alt="" className="Forum--badge--logo" />
                        <div className="Forum--badge--title">
                            Chrome Extensions
                        </div>
                    </Link>
                    <Link className="Forum--badge"  to="/forum/ows">
                        <img src={IMAGE_OWS} alt="" className="Forum--badge--logo" />
                        <div className="Forum--badge--title">
                            Opera Extensions
                        </div>
                    </Link>
                </div>
            </div>
        )
    }
}

export default ForumsPage
