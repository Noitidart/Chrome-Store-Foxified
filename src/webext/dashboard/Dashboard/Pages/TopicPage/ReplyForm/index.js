// @flow

import React, { PureComponent } from 'react'
import { reduxForm, Field, SubmissionError } from 'redux-form'

import { fetchApi } from '../../../../../flow-control/utils'
import { normalizeUniversal } from '../../../../../flow-control/normalizers'

import './index.css'

import type { FormProps } from 'redux-form'

type Props = {
    name: string,
    kind: string,
    loadEntitys: () => void,
    // redux-form
    ...FormProps
}

class ReplyFormDumb extends PureComponent<Props> {

    constructor(props) {
        super(props);
        this.handleSubmit = props.handleSubmit(this.handleSubmit);
    }

    render() {
        const { name, kind, submitting, error } = this.props;

        return (
            <form className="Reply" onSubmit={this.handleSubmit}>
                { error && <span className="Field--error">{error}</span> }
                <Field name="body" className="Reply--field" component="textarea" disabled={submitting} />
                <button className="Reply--button" type="submit" disabled={submitting || error}>Post</button>
            </form>
        )
    }

    handleSubmit = async values => {
        const { name, kind, loadEntitys, reset } = this.props;

        if (!values.body.trim()) throw new SubmissionError({ _error:'Required' });

        const res = await fetchApi('comments', {
            method: 'POST',
            body: {
                body: values.body,
                forename: 'noit',
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

const ReplyForm = ReplyFormControlled(ReplyFormDumb)

export default ReplyForm
