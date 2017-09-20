import React, { PureComponent } from 'react'
import { SubmissionError, Field, reduxForm } from 'redux-form'

import { requestAdd } from '../../../../../flow-control/extensions'
import { callInBackground } from '../../../../connect'

import ErrorBox from './ErrorBox'
import FieldText from './Fields/FieldText'

import './index.css'

import type { FormProps } from 'redux-form'

type Props = {
    // redux-form
    ...FormProps,
    submitting: boolean,
    // comm-redux
    dispatchProxied: () => void
}

const FORM_NAME = 'add-ext';

class AddFormDumb extends PureComponent<Props, void> {
    constructor(props) {
        super(props);
        this.handleSubmit = this.props.handleSubmit(this.handleSubmit);
    }

    render() {
        const { submitting, form, error } = this.props;
        const { handleSubmit } = this;

        console.log('this.props:', this.props);
        return (
            <form onSubmit={handleSubmit} className="AddForm">
                <ErrorBox form={form} error={error} />
                <Field type="text" component={FieldText} name="storeUrl" disabled={submitting} label="Extension URL" />
                <div className="Field--row">
                    <div className="Field--label" />
                    <div className="Field--desc">
                        Example: <pre className="AddForm--pre-inline">https://chrome.google.com/webstore/detail/pull-refresh/ldmkbocokmbbffifgfoejohifpcienih</pre>
                    </div>
                </div>
                <div>
                    <button disabled={submitting}>Download</button>
                    { submitting && <span>Validating with server...</span> }
                </div>
            </form>
        )
    }

    handleSubmit = async values => {
        console.log('values:', values);
        const { dispatchProxied } = this.props;

        const errors = await new Promise( resolve => callInBackground('dispatchSubmitAddForm', values.storeUrl, resolve) );
        console.log('errors:', errors);
        if (errors) throw new SubmissionError(errors);
        else this.props.reset();
    }
}

const AddFormControlled = reduxForm({ form:FORM_NAME })

const AddForm = AddFormControlled(AddFormDumb)

export default AddForm
