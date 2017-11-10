// @flow

import React, { PureComponent } from 'react'
import { Link } from 'react-router-dom'

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
    topics: { name:string, kind:string }[]
}

class ForumPage extends PureComponent<Props, State> {
    state = {
        isLoading: true,
        topics: []
    }
    componentDidMount() {
        this.refresh();
    }
    render() {
        const {match:{params:{ kind }}} = this.props;
        const { isLoading, topics } = this.state;

        const hasTopics = topics && !!topics.length;
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
                { !isLoading && !hasTopics &&
                    <div className="ForumMessage">
                        No extensions found
                    </div>
                }
                { !isLoading && hasTopics &&
                    <div className="Topics">
                        { topics.map(({ name }) => <Link className="Topic" to={`/topic/${name}`} key={name}>{name}</Link> )}
                    </div>
                }
            </div>
        )
    }

    refresh = async () => {
        const {match:{params:{ kind }}} = this.props;
        const res = fetch(`http://localhost:8000/api/entitys/${kind}`);
        if (res.status === 200) {
            const topics = await res.json();
            this.setState(() => ({ isLoading:false, topics }));
        } else {
            this.setState(() => ({ isLoading:false }));
        }
    }
}

export default ForumPage
