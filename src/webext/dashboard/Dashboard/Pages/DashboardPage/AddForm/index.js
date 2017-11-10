// @flow

import React, { PureComponent } from 'react'
import { reduxForm, Field, SubmissionError } from 'redux-form'
import classnames from 'cmn/lib/classnames'
import { isObject } from 'cmn/lib/all'

import { callInBackground } from '../../../../connect'

import ErrorBox from './ErrorBox'
import FieldText from './Fields/FieldText'
import FieldFile from './Fields/FieldFile'

import './index.css'

import type { FormProps } from 'redux-form'

type Props = {
    // redux-form
    ...FormProps,
    submitting: boolean,
    // comm-redux
    dispatchProxied: () => void
}

type State = {
    or?: 'computer' | 'storeUrl'
}

class AddFormDumb extends PureComponent<Props, State> {
    state = {
        or: undefined
    }

    constructor(props) {
        super(props);
        this.handleSubmit = props.handleSubmit(this.handleSubmit);
    }

    render() {
        const { submitting, form, error } = this.props;
        const { or } = this.state;

        return (
            <form onSubmit={this.handleSubmit} className="AddForm">
                <fieldset className="AddForm--fieldset">
                    <legend>Add New Extension</legend>
                    <ErrorBox form={form} error={error} />
                    <div className="Field--row">
                        <div className={classnames('AddForm--col', or === 'fileDataUrl' && 'AddForm--col--0')}>
                            <Field component={FieldText} name="storeUrl" disabled={submitting} label="Store URL" flexAnyField={this.flexAnyField} />
                            <div className="Field--col">
                                <div className="Field--desc">
                                    Example: <pre className="AddForm--pre-inline">https://chrome.google.com/webstore/detail/pull-refresh/ldmkbocokmbbffifgfoejohifpcienih</pre>
                                </div>
                            </div>
                        </div>
                        <div className={classnames('AddForm--or', or && 'AddForm--col--0')}>
                            <hr className="AddForm--hr" />
                            <span className="AddForm--or--label">OR</span>
                            <hr className="AddForm--hr" />
                        </div>
                        <div className={classnames('AddForm--col', or === 'storeUrl' && 'AddForm--col--0')}>
                            <Field component={FieldFile} name="fileDataUrl" disabled={submitting} label="My Computer" flexAnyField={this.flexAnyField} />
                            <div className="Field--row">
                                <div className="Field--desc">
                                    Select a extensison package file from your computer
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="AddForm--control">
                        <button type="submit" disabled={submitting} style={{fontSize:'1.1em',fontWeight:500}}>Add to Firefox</button>
                        { submitting && <span className="AddForm--status">Validating...</span> }
                    </div>
                </fieldset>
            </form>
        )
    }

    handleSubmit = async values => {
        console.log('in handle submit')
        const errorsOrId = await new Promise( resolve => callInBackground('dispatchSubmitAddForm', values, resolve) );
        if (isObject(errorsOrId)) throw new SubmissionError(errorsOrId);
        else {
            this.props.reset();
            this.setState(() => ({ or:undefined }));
        }
    }

    flexAnyField = name => this.setState(() => ({ or:name }))
}

const AddFormControlled = reduxForm({
    form: 'submit'
})

const AddForm = AddFormControlled(AddFormDumb)

export default AddForm
