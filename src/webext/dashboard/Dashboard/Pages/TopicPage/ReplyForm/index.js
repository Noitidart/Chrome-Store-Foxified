// @flow

import React, { PureComponent } from 'react'
import { reduxForm, Field, SubmissionError } from 'redux-form'
import { Link } from 'react-router-dom'

import proxy from '../../../../connect'
import { fetchApi } from '../../../../../flow-control/utils'
import { normalizeUniversal } from '../../../../../flow-control/normalizers'

import './index.css'

import type { Shape as AccountShape } from '../../../../../flow-control/account'
import type { FormProps } from 'redux-form'

type Props = {
    name: string,
    kind: string,
    loadEntitys: () => void,
    account: AccountShape,
    // redux-form
    ...FormProps
}

class ReplyFormDumb extends PureComponent<Props> {

    constructor(props) {
        super(props);
        this.handleSubmit = props.handleSubmit(this.handleSubmit);
    }

    render() {
        const { name, kind, submitting, error, account:{ forename } } = this.props;

        const hasForename = !!forename;
        return (
            <form className="ReplyForm" onSubmit={this.handleSubmit}>
                { !hasForename &&
                    <span className="Field--error">
                        You need to set a &quot;display name&quot; before commenting from the settings page.
                        &nbsp;
                        <Link className="Card--link Card--link--normal" to="/settings">Go To Setings</Link>
                    </span>
                }
                { error && <span className="Field--error">{error}</span> }
                <div className="ReplyForm--row">
                    <Field name="body" className="ReplyForm--field" component="textarea" disabled={submitting || !hasForename} />
                    <button className="ReplyForm--button" type="submit" disabled={submitting || error || !hasForename}>Post</button>
                </div>
            </form>
        )
    }

    handleSubmit = async values => {
        const { name, kind, loadEntitys, reset, account:{ forename } } = this.props;

        if (!values.body.trim()) throw new SubmissionError({ _error:'Required' });

        const res = await fetchApi('comments', {
            method: 'POST',
            body: {
                body: values.body,
                forename,
                name,
                kind
            }
        });

        if (res.status === 201) {
            reset();
            loadEntitys();
        } else {
            throw new SubmissionError({ _error:`Bad response status received - "${res.status}"`})
        }

    }
}

const ReplyFormControlled = reduxForm()

const ReplyFormProxied = proxy(['account']);

const ReplyForm = ReplyFormProxied(ReplyFormControlled(ReplyFormDumb))

export default ReplyForm
