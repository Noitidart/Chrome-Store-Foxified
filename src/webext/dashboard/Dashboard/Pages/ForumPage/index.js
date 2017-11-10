// @flow

import React, { PureComponent } from 'react'
import { Link } from 'react-router-dom'
import moment from 'moment'
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
    displaynames: {},
    sortBy: 'name' | 'comments-recent' | 'thumbs' | 'thumbs-yes'
}

class ForumPage extends PureComponent<Props, State> {
    state = {
        isLoading: true,
        extensions: {},
        comments: {},
        thumbs: {},
        displaynames: {},
        sortBy: 'comments-recent'
    }
    componentDidMount() {
        this.refresh();
    }
    render() {
        const {match:{params:{ kind }}} = this.props;
        const { isLoading, extensions, sortBy } = this.state;

        const hasExtensions = extensions && !isObjectEmpty(extensions);

        const sorted = Object.values(extensions).map(({ name, latest_comment, thumbs_count, thumbs_yes_count }) => ({ name, latest_comment, thumbs_count, thumbs_yes_count }));
        switch (sortBy) {
            case 'name': sorted.sort(sortAscAlpha); break;
            case 'comments-recent': sorted.sort(sortDescComment); break;
            case 'thumbs': sorted.sort(sortDescThumbs); break;
            case 'thumbs-yes': sorted.sort(sortDescThumbsYes); break;
            // no default
        }
        return (
            <div className="Page--subwrap">
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
                    <div className="TopicsSort">
                        Sort by:
                        &nbsp;
                        { sortBy !== 'name' && <a className="Card--link" href="#" onClick={this.sortName}>Name</a> }
                        { sortBy === 'name' && <b>Name</b> }
                        &nbsp; | &nbsp;
                        { sortBy !== 'comments-recent' && <a className="Card--link" href="#" onClick={this.sortComments}>Recently Commented</a> }
                        { sortBy === 'comments-recent' && <b>Recently Commented</b> }
                        &nbsp; | &nbsp;
                        { sortBy !== 'thumbs' && <a className="Card--link" href="#" onClick={this.sortThumbs}>Votes</a> }
                        { sortBy === 'thumbs' && <b>Votes</b> }
                        &nbsp; | &nbsp;
                        { sortBy !== 'thumbs-yes' && <a className="Card--link" href="#" onClick={this.sortThumbsYes}>Yes Votes</a> }
                        { sortBy === 'thumbs-yes' && <b>Yes Votes</b> }
                    </div>
                }
                { !isLoading && hasExtensions &&
                    <div className="Topics">
                        { sorted.map(({ name, thumbs_count, thumbs_yes_count, latest_comment }) => ( // eslint-disable-line no-extra-parens
                            <div className="Topic" key={name}>
                                <Link to={`/topic/${kind}/${name}`}>{name}</Link>
                                { sortBy !== 'name' && '  -  ' }
                                { sortBy === 'comments-recent' ? latest_comment ? { moment.utc(latest_comment.created_at).fromNow() }
                                                                                : 'No Comments'
                                                               : undefined
                                }
                                { sortBy === 'thumbs' && `Total Votes: ${thumbs_count}` }
                                { sortBy === 'thumbs-yes' && `Total Votes Yes: ${thumbs_yes_count}` }
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

    sortName = e => {
        e.preventDefault();
        this.setState(() => ({ sortBy:'name' }));
    }
    sortComments = e => {
        e.preventDefault();
        this.setState(() => ({ sortBy:'comments-recent' }));
    }
    sortThumbs = e => {
        e.preventDefault();
        this.setState(() => ({ sortBy:'thumbs' }));
    }
    sortThumbsYes = e => {
        e.preventDefault();
        this.setState(() => ({ sortBy:'thumbs-yes' }));
    }
}

function sortAscAlpha({ name:nameA }, { name:nameB }) {
    return nameA.localeCompare(nameB);
}

function sortDescComment({ latest_comment:latestCommentA }, { latest_comment:latestCommentB }) {

    // latest_comment is null or object - thats why cant use default params

    const isoDateA = latestCommentA && latestCommentA.created_at;
    const isoDateB = latestCommentB && latestCommentB.created_at;

    if (!isoDateA) return 1;
    else if (!isoDateB) return -1;
    else if (!isoDateA && !isoDateB) return 0;

    const dateA = new Date(isoDateA);
    const dateB = new Date(isoDateB);
    return dateB - dateA;
}

function sortDescThumbs({ thumbs_count:thumbsCntA }, { thumbs_count:thumbsCntB }) {
    return thumbsCntB - thumbsCntA;
}

function sortDescThumbsYes({ thumbs_yes_count:thumbsCntA }, { thumbs_yes_count:thumbsCntB }) {
    return thumbsCntB - thumbsCntA;
}

export default ForumPage
