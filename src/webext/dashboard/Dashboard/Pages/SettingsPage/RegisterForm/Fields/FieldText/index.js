// @flow

import React, { PureComponent } from 'react'

import classnames from 'cmn/lib/classnames'

import './index.css'

import type { FieldProps } from 'redux-form'

type Props = {
    label: string,
    desc?: string | Element,
    onChange?: () => void,
    ...FieldProps // below are the FieldProps i actually touch
}

class FieldText extends PureComponent<Props, void> {
    render() {
        const {meta:{ asyncValidating, error, warning }, input, input:{ value }, label } = this.props;

        return (
            <div className="Field">
                <div className="Field--row">
                    <label className={classnames('Field--label', error && 'Field--label--error')}>
                        {label}
                    </label>
                    <input {...input} type="text" className={classnames('Field--input-text Field--input-text--noflex', error && 'Field--input-text--error', error && 'Field--input-text--warning')} />
                    { asyncValidating && 'Checking...' }
                </div>
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
