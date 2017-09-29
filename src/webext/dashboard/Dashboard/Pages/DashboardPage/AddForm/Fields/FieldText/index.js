import React, { PureComponent } from 'react'

import classnames from 'cmn/lib/classnames'

import './index.css'

import type { FieldProps } from 'redux-form'

type Props = {
    label: string,
    desc: string | Element,
    ...FieldProps, // below are the FieldProps i actually touch
    meta: {
        error?: string
    },
    input: {},
}

class FieldText extends PureComponent<Props, void> {
    render() {
        const {meta:{ error }, input, label } = this.props;

        return (
            <div className="Field">
                <div className="Field--col">
                    <label className={classnames('Field--label', error && 'Field--label--error')}>
                        {label}
                    </label>
                    <input {...input} type="text" className={classnames('Field--input-text', error && 'Field--input-text--error')} />
                </div>
                { error &&
                    <div className="Field--row">
                        <div className="Field--error">{error}</div>
                    </div>
                }
            </div>
        )
    }
}

export default FieldText
