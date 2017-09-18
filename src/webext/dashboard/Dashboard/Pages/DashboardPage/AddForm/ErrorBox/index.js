import React, { PureComponent } from 'react'

import { isObjectEmpty } from 'cmn/lib/all'

import './index.css'

import type { FormProps } from 'redux-form'

type Props = {
    ...FormProps // below are the form props i actually touch
}

// works with redux form errors
// _error stays until submit is clicked
// non _error errors stay until field is changed
// clicking non _error errors will scroll to it and focus

class ErrorBox extends PureComponent<Props, void> {
    render() {
        const { submitting, ...errors } = this.props;
        if (isObjectEmpty(errors)) return null;

        return (
            <div className="ErrorBox">
                <div className="ErrorBox--title">Error</div>
                <div className="ErrorBox--body">Errors here</div>
            </div>
        )
    }
}

export default ErrorBox
