import React, { PureComponent } from 'react'
import { SubmissionError, Field, reduxForm } from 'redux-form'

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
                <fieldset className="AddForm--fieldset">
                    <legend>Add New Extension</legend>
                    <ErrorBox form={form} error={error} />
                    <div className="Field--row">
                        <div className="AddForm--col">
                            <Field type="text" component={FieldText} name="storeUrl" disabled={submitting} label="Store URL" />
                            <div className="Field--col">
                                <div className="Field--label" />
                                <div className="Field--desc">
                                    Example: <pre className="AddForm--pre-inline">https://chrome.google.com/webstore/detail/pull-refresh/ldmkbocokmbbffifgfoejohifpcienih</pre>
                                </div>
                            </div>
                        </div>
                        <div className="AddForm--or">
                            <hr className="AddForm--hr" />
                            <span className="AddForm--or--label">OR</span>
                            <hr className="AddForm--hr" />
                        </div>
                        <div className="AddForm--col">
                            <div className="Field--col">
                                <div className="Field--label">My Computer</div>
                                <input className="Field--input-text" readOnly defaultValue="No file selected - click here to browse" />
                            </div>
                            <div className="Field--row">
                                <div className="Field--desc">
                                    Select a extensison package file from your computer
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="AddForm--control">
                        <button disabled={submitting} style={{fontSize:'1.1em',fontWeight:500}}>Add to Firefox</button>
                        { submitting && <span>Validating with server...</span> }
                    </div>
                </fieldset>
            </form>
        )
    }

    handleSubmit = async values => {
        const errors = await new Promise( resolve => callInBackground('dispatchSubmitAddForm', values.storeUrl, resolve) );
        if (errors) throw new SubmissionError(errors);
        else this.props.reset();
    }
}

const AddFormControlled = reduxForm({ form:FORM_NAME })

const AddForm = AddFormControlled(AddFormDumb)

export default AddForm
