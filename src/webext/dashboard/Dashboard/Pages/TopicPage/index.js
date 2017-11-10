// @flow

import React, { PureComponent } from 'react'
import moment from 'moment'
import { isObjectEmpty } from 'cmn/lib/all'

import { DATE_PAGE_LOADED } from '../DashboardPage'

import { fetchApi } from '../../../../flow-control/utils'
import { normalizeUniversal } from '../../../../flow-control/normalizers'

import ReplyForm from './ReplyForm'

import './index.css'

import type { Extension } from '../../../../flow-control/extensions'

type Props = {
    // router
    match: {
        params: {
            name: string,
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

class TopicPage extends PureComponent<Props, State> {
    state = {
        isLoading: true,
        extensions: {},
        comments: {},
        thumbs: {},
        displaynames: {}
    }

    componentDidMount() {
        this.loadEntitys();
    }
    render() {
        const {location:{state:{ key:pageKey=DATE_PAGE_LOADED }={}}} = this.props;
        const {match:{params:{ kind, name }}} = this.props;
        const { extensions, isLoading, comments, displaynames, thumbs } = this.state;

        const hasTopic = !isObjectEmpty(extensions);
        const extension = hasTopic && Object.values(extensions)[0];
        const hasComments = hasTopic && !isObjectEmpty(comments);

        const thumbUpCnt = Object.values(thumbs).reduce( (sum, { like }) => like ? ++sum : sum, 0 );
        const thumbDnCnt = Object.values(thumbs).reduce( (sum, { like }) => !like ? ++sum : sum, 0 );

        const commenterThumbs = {}; // [comment.displayname_id]: true/false/undefined
        for (const thumb of Object.values(thumbs)) {
            if (thumb.extension_id === extension.id) {
                commenterThumbs[thumb.displayname_id] = thumb.like;
            }
        }

        return (
            <div>
                { !isLoading && !hasTopic &&
                    <p className="Page--intro">
                        No extension named &quot;{extension ? extension.name : name}&quot; in
                        &nbsp;
                        { kind === 'ows' && 'Opera' }
                        { kind === 'cws' && 'Chrome' }
                        { kind === 'amo' && 'Firefox' }
                        { kind === 'msft' && 'Edge' }
                        &nbsp;
                        category
                    </p>
                }
                { hasTopic &&
                    <p className="Page--intro">
                        {name} for
                        &nbsp;
                        { kind === 'ows' && 'Opera' }
                        { kind === 'cws' && 'Chrome' }
                        { kind === 'amo' && 'Firefox' }
                        { kind === 'msft' && 'Edge' }
                    </p>
                }
                { isLoading &&
                    <div className="ForumMessage">
                        Loading...
                    </div>
                }
                { !isLoading && hasTopic &&
                    <div className="TopicMetas">
                        <div className="TopicMeta">
                            <b className="TopicMeta--label">Extension:</b>
                            &nbsp;
                            <span>{ extension.name }</span>
                        </div>
                        <div className="TopicMeta">
                            <b className="TopicMeta--label">For:</b>
                            &nbsp;
                            <span>
                                { kind === 'ows' && 'Opera' }
                                { kind === 'cws' && 'Chrome' }
                                { kind === 'amo' && 'Firefox' }
                                { kind === 'msft' && 'Edge' }
                            </span>
                        </div>
                        <div className="TopicMeta">
                            <b className="TopicMeta--label">Created At:</b>
                            &nbsp;
                            <span>{ moment.utc(extension.created_at).fromNow() }</span>
                        </div>
                        <div className="TopicMeta">
                            <b className="TopicMeta--label">Total Votes:</b>
                            &nbsp;
                            <span>{ Object.keys(thumbs).length }</span>
                        </div>
                        <div className="TopicMeta">
                            <b className="TopicMeta--label">Works for them:</b>
                            &nbsp;
                            <span>{ thumbUpCnt } people vote this works</span>
                        </div>
                        <div className="TopicMeta">
                            <b className="TopicMeta--label">Broken for them:</b>
                            &nbsp;
                            <span>{ thumbDnCnt } people voted this doesn&apos;t work</span>
                        </div>
                    </div>
                }
                { !isLoading && hasTopic && !hasComments &&
                    <div className="ForumMessage">
                        No comments yet, be the first to comment!
                    </div>
                }
                { !isLoading && hasTopic && hasComments &&
                    <div className="Comments">
                        { Object.values(comments).sort(sortAscCreated).map(comment =>
                            <div className="Comment" key={comment.id}>
                                <div className="Comment--meta">
                                    <div className="Comment--avatar">
                                        { displaynames[comment.displayname].forename.match(/(\w)(?:\w*\s(\w))?/).slice(1).join('').toUpperCase() }
                                    </div>
                                    <div className="Comment--displayname">
                                        { displaynames[comment.displayname].forename }
                                    </div>
                                    <div className="Comment--date">
                                        { moment.utc(extensions.created_at).fromNow() }
                                    </div>
                                    { comment.displayname_id in commenterThumbs &&
                                        <div className="Comment--thumb">
                                            { commenterThumbs[comment.displayname_id]
                                                ? 'Works for me!!!'
                                                : `It's broken =(`
                                            }
                                        </div>
                                    }
                                </div>
                                <div className="Comment--body">
                                    { comment.body }
                                </div>
                            </div>
                        ) }
                    </div>
                }
                { !isLoading && hasTopic &&
                    <ReplyForm form={`comment-reply-${pageKey}`} loadEntitys={this.loadEntitys} name={name} kind={kind} />
                }
            </div>
        )
    }

    loadEntitys = async () => {
        const {match:{params:{ kind, name }}} = this.props;
        const res = await fetchApi(`extension`, { qs:{ name, kind } });
        if (res.status === 404) {
            this.setState(() => ({ isLoading:false, comments:{}, thumbs:{}, displaynames:{} }));
        } else {
            const reply = await res.json();
            this.setState(() => ({ isLoading:false, ...normalizeUniversal(reply) }));
        }
    }
}

function sortAscCreated({ created_at:createdAtA }, { created_at:createdAtB }) {
    return new Date(createdAtA) - new Date(createdAtB);
}

export default TopicPage
