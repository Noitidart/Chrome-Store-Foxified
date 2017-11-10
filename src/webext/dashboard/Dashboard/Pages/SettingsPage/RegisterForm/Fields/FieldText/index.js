// @flow

import React, { PureComponent } from 'react'

import classnames from 'cmn/lib/classnames'

import './index.css'

import type { FieldProps } from 'redux-form'

type Props = {
    label: string,
    desc?: string | Element,
    isChecking: boolean,
    isTaken: boolean,
    ...FieldProps // below are the FieldProps i actually touch
}

class FieldText extends PureComponent<Props, void> {
    render() {
        const {meta:{ error, warning }, input, input:{ value }, label, isChecking, isTaken } = this.props;

        return (
            <div className="Field">
                <div className="Field--row">
                    <label className={classnames('Field--label', error && 'Field--label--error')}>
                        {label}
                    </label>
                    <input {...input} type="text" className={classnames('Field--input-text Field--input-text--noflex', error && 'Field--input-text--error', error && 'Field--input-text--warning')} />
                    { isChecking && 'Checking...' }
                </div>
                { isTaken &&
                    <div className="Field--row">
                        <div className="Field--label" />
                        <div className="Field--warning">This display name already exists. If you are sure this is yours, then ignore this warning, otherwise please change it.</div>
                    </div>
                }
                { warning &&
                    <div className="Field--row">
                        <div className="Field--label" />
                        <div className="Field--warning">{warning}</div>
                    </div>
                }
                { error &&
                    <div className="Field--row">
                        <div className="Field--label" />
                        <div className="Field--error">{error}</div>
                    </div>
                }
            </div>
        )
    }
}

export default FieldText
