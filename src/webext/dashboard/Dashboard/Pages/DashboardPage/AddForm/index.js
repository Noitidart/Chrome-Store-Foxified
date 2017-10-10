import React, { PureComponent } from 'react'
import { SubmissionError, Field, reduxForm } from 'redux-form'
import classnames from 'cmn/lib/classnames'

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

const FORM_NAME = 'add-ext';

class AddFormDumb extends PureComponent<Props, State> {
    state = {
        or: undefined
    }

    constructor(props) {
        super(props);
        this.handleSubmit = this.props.handleSubmit(this.handleSubmit);
    }

    componentDidUpdate() {
        console.log('this.props:', this.props);
    }
    render() {
        const { submitting, form, error } = this.props;
        const { or } = this.state;
        const { handleSubmit } = this;

        console.log('or:', or);
        return (
            <form onSubmit={handleSubmit} className="AddForm">
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

    flexAnyField = name => this.setState(() => ({ or:name }))
}

const AddFormControlled = reduxForm()

const AddForm = AddFormControlled(AddFormDumb)

export default AddForm
