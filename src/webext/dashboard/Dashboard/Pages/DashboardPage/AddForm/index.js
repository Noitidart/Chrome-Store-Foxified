import React, { PureComponent } from 'react'
import { SubmissionError, Field, reduxForm } from 'redux-form'

import proxy from '../../../../connect'
import { requestAdd } from '../../../../../flow-control/extensions'

import ErrorBox from './ErrorBox'
import FieldText from './Fields/FieldText'

import './index.css'

type Props = {
    // redux-form
    submitting: boolean,
    // comm-redux
    dispatchProxied: () => void
}

class AddFormDumb extends PureComponent<Props, void> {
    constructor(props) {
        super(props);
        this.handleSubmit = this.props.handleSubmit(this.handleSubmit);
    }

    render() {
        const { submitting } = this.props;
        const { handleSubmit } = this;

        return (
            <form onSubmit={handleSubmit} className="AddForm">
                <ErrorBox {...this.props} />
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

        console.log('dispatchProxied:', dispatchProxied);
        const res = dispatchProxied(requestAdd(values.storeUrl));
        console.log('res:', res);
        const errors = await res.promise;
        if (errors) throw new SubmissionError(errors);
        else this.props.reset();
    }
}

const AddFormControlled = reduxForm({ form:'add-ext' })

const AddFormProxied = proxy()

const AddForm = AddFormProxied(AddFormControlled(AddFormDumb))

export default AddForm
