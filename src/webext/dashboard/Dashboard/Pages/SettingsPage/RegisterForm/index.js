// @flow

import React, { PureComponent } from 'react'
import { reduxForm, Field, SubmissionError } from 'redux-form'
import { connect } from 'react-redux'
import { delay } from 'redux-saga'

import { set } from '../../../../../flow-control/account'
import { fetchApi } from '../../../../../flow-control/utils'
import proxy from '../../../../connect'

import FieldText from './Fields/FieldText'

import './index.css'

import type { FormProps } from 'redux-form'
import type { Shape as AccountShape } from '../../../../../flow-control/account'

type OwnProps = {
    dispatchProxied: ()=>void,
    account: AccountShape
}

type Props = {
    ...OwnProps,
    // redux-form
    ...FormProps
}

class RegisterFormDumb extends PureComponent<Props> {

    constructor(props) {
        super(props);
        this.handleSubmit = props.handleSubmit(this.handleSubmit);
    }

    render() {
        const { name, kind, submitting, error } = this.props;

        return (
            <form className="RegisterForm Settings--row" onSubmit={this.handleSubmit}>
                <Field name="forename" component={FieldText} disabled={submitting} label="Display Name" onChange={this.handleChange} />
                <div className="Field--row">
                    <div className="Field--label" />
                    <div className="Field--desc">
                        Set a name here if you want to vote or leave comments on extensions
                    </div>
                </div>
                { error && <span className="Field--error">{error}</span> }
            </form>
        )
    }

    handleChange = (e, valueNew, value) => {
        const { dispatchProxied } = this.props;
        const forename = valueNew;
        dispatchProxied(set({ forename }));
    }
    handleSubmit = values => {
        console.log('values:', values);
        const { dispatchProxied } = this.props;
        const { forename } = values;
        dispatchProxied(set({ forename }));
    }
}

function validateWarnings({ forename }) {
    const warnings = {};

    if (['john', 'paul', 'george', 'ringo'].includes(forename)) {
        warnings.forename = 'This display name already exists. If you are sure this is yours, then ignore this warning, otherwise please change it.';
    }
    return warnings;
}

const RegisterFormControlled = reduxForm({
    form: 'register',
    warn: validateWarnings
})

const RegisterFormSmart = connect(
    function(state, { account }: OwnProps) {
        return {
            initialValues: {
                forename: account.forename
            }
        }
    }
)

const RegisterFormProxied = proxy(['account'])

const RegisterForm = RegisterFormProxied(RegisterFormSmart(RegisterFormControlled(RegisterFormDumb)))

export default RegisterForm
