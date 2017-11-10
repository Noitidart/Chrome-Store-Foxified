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

type State = {
    forename: string,
    isChecking: boolean,
    isTaken?: boolean
}

class RegisterFormDumb extends PureComponent<Props, State> {
    state = {
        forename: this.props.account.forename,
        isChecking: false
    }

    constructor(props) {
        super(props);
        this.handleSubmit = props.handleSubmit(this.handleSubmit);
    }

    render() {
        const { name, kind, submitting, error } = this.props;
        const { isChecking, isTaken } = this.state;

        return (
            <form className="RegisterForm Settings--row" onSubmit={this.handleSubmit}>
                <Field name="forename" component={FieldText} disabled={submitting} label="Display Name" onChange={this.handleChange} isChecking={isChecking} isTaken={isTaken} />
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
        const forename = valueNew.trim();
        dispatchProxied(set({ forename }));

        if (forename) {
            this.setState(() => ({ forename, isChecking:true, isTaken:undefined }))
            this.checkForename(forename);
        } else {
            this.setState(() => ({ forename, isChecking:false, isTaken:undefined }));
        }
    }
    async checkForename(forename) {
        const res = await fetchApi('displaynames', { qs:{ forename }});
        if (this.state.forename.trim() === forename) {
            console.log(`check resolved fore forename "${forename}", isTaken:`, res.status === 200, res.status);
            if (res.status === 404) this.setState(() => ({ isChecking:false, isTaken:false }));
            else if (res.status === 200) this.setState(() => ({ isChecking:false, isTaken:true }));
        }
        else console.log(`check for forename "${forename}" is no longer applicable becasue forename changed to "${this.state.forename}"`);
    }
    handleSubmit = values => {
        console.log('values:', values);
        const { dispatchProxied } = this.props;
        const { forename } = values;
        dispatchProxied(set({ forename }));
    }
}

// function validateWarnings({ forename }) {
//     const warnings = {};

//     if (['john', 'paul', 'george', 'ringo'].includes(forename)) {
//         warnings.forename = 'This display name already exists. If you are sure this is yours, then ignore this warning, otherwise please change it.';
//     }
//     return warnings;
// }

const RegisterFormControlled = reduxForm({
    form: 'register',
    // warn: validateWarnings
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
