// @flow

import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { getFormSyncErrors, getFormAsyncErrors, getFormSubmitErrors, getFormSyncWarnings, isSubmitting } from 'redux-form'

import { isObjectEmpty } from 'cmn/lib/all'

import './index.css'

import type { FormProps } from 'redux-form'

type OwnProps = {
    // form: $PropertyType<FormProps, 'form'>
}
type Props = {
    ...OwnProps,
    error?: string,
    syncErrors?: {},
    asyncErrors?: {},
    submitErrors?: {},
    submitting: boolean
}

// works with redux form errors
// _error stays until submit is clicked
    // after _error is shown, it is possible to click submit button again
// non _error errors stay until field is changed
// clicking non _error errors will scroll to it and focus
    // while any non _error errors exist, it cannot be submitted

class ErrorBoxDumb extends PureComponent<Props, void> {
    render() {
        const { submitting, error, syncErrors, asyncErrors, submitErrors } = this.props;
        // if (isObjectEmpty(errors)) return null;

        // console.log('ErroBox props:', this.props);

        const fieldErrors = !isObjectEmpty(syncErrors) || !isObjectEmpty(asyncErrors) || !isObjectEmpty(submitErrors) ? { ...syncErrors, ...asyncErrors, ...submitErrors } : null;
        console.log('fieldErrors:', fieldErrors);

        if (!error && !fieldErrors || error && !fieldErrors && submitting) {
            return null;
        } else {
            return (
                <div className="ErrorBox">
                    <div className="ErrorBox--title">Error</div>
                    <div className="ErrorBox--body">
                        { !!error && <div>{error}</div> }
                        { !!fieldErrors &&
                            <div>
                                The following fields need to be fixed:
                                <ul>
                                    { Object.entries(fieldErrors).map( ([fieldName, message]) =>
                                        <li key={fieldName}>{message}</li>
                                    )}
                                </ul>
                            </div>
                        }
                    </div>
                </div>
            )
        }
    }
}

const ErrorBoxSmart = connect(
    function(state, { form }: OwnProps) {
        return {
            syncErrors: getFormSyncErrors(form)(state),
            asyncErrors: getFormAsyncErrors(form)(state),
            submitErrors: getFormSubmitErrors(form)(state),
            submitting: isSubmitting(form)(state)
        }
    }
)

const ErrorBox = ErrorBoxSmart(ErrorBoxDumb)

export default ErrorBox
