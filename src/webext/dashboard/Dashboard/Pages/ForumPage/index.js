// @flow

import React, { PureComponent } from 'react'
import { Link } from 'react-router-dom'
import { isObjectEmpty } from 'cmn/lib/all'

import { fetchApi } from '../../../../flow-control/utils'
import { normalizeUniversal } from '../../../../flow-control/normalizers'

import './index.css'
import IMAGE_OWS from '../DashboardPage/Cards/Card/images/opera-addons-logo.svg'
import IMAGE_CWS from '../DashboardPage/Cards/Card/images/chrome-web-store-logo-2012-2015.svg'

import type { Extension } from '../../../../flow-control/extensions'

type Props = {
    // router
    match: {
        params: {
            kind: $PropertyType<Extension, 'kind'>
        }
    }
}

type State = {
    isLoading: boolean,
    extensions: {},
    comments: {},
    thumbs: {},
    displaynames: {}
}

class ForumPage extends PureComponent<Props, State> {
    state = {
        isLoading: true,
        extensions: {},
        comments: {},
        thumbs: {},
        displaynames: {}
    }
    componentDidMount() {
        this.refresh();
    }
    render() {
        const {match:{params:{ kind }}} = this.props;
        const { isLoading, extensions } = this.state;

        const hasExtensions = extensions && !isObjectEmpty(extensions);
        return (
            <div>
                <p className="Page--intro">
                    { kind === 'cws' && <img src={IMAGE_CWS} alt="" className="Page--intro--icon" /> }
                    { kind === 'ows' && <img src={IMAGE_OWS} alt="" className="Page--intro--icon" /> }
                    { kind === 'cws' && 'Chrome Extensions' }
                    { kind === 'ows' && 'Opera Extensions' }
                </p>
                { isLoading &&
                    <div className="ForumMessage">
                        Loading...
                    </div>
                }
                { !isLoading && !hasExtensions &&
                    <div className="ForumMessage">
                        No extensions found
                    </div>
                }
                { !isLoading && hasExtensions &&
                    <div className="Topics">
                        { Object.values(extensions).map(({ name }) => ( // eslint-disable-line no-extra-parens
                            <div className="Topic" key={name}>
                                <Link to={`/topic/${kind}/${name}`}>{name}</Link>
                            </div>
                        ) )}
                    </div>
                }
            </div>
        )
    }

    refresh = async () => {
        const {match:{params:{ kind }}} = this.props;
        const res = await fetchApi('extensions', { qs:{kind} });
        if (res.status === 200) {
            const reply = await res.json();
            this.setState(() => ({ isLoading:false, ...normalizeUniversal(reply) }));
        } else {
            this.setState(() => ({ isLoading:false }));
        }
    }
}

export default ForumPage
