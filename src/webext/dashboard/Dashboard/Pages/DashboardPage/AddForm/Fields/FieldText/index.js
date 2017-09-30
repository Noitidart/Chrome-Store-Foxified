import React, { PureComponent } from 'react'

import classnames from 'cmn/lib/classnames'

import './index.css'
import '../index.css'

import type { FieldProps } from 'redux-form'

type Props = {
    label: string,
    desc: string | Element,
    ...FieldProps, // below are the FieldProps i actually touch
    meta: {
        error?: string
    },
    input: {}
}

class FieldText extends PureComponent<Props, void> {
    render() {
        const {meta:{ error }, input, input:{ value }, label } = this.props;

        console.log('field text props:', this.props);
        return (
            <div className="Field">
                <div className="Field--col">
                    <label className={classnames('Field--label', error && 'Field--label--error')}>
                        {label}
                    </label>
                    <div style={{display:'flex'}}>
                        <input {...input} type="text" className={classnames('Field--input-text', error && 'Field--input-text--error')} onFocus={this.flexField} onBlur={this.unflexField} />
                        { value && <button onClick={this.clear}>Clear</button> }
                    </div>
                </div>
                { error &&
                    <div className="Field--row">
                        <div className="Field--error">{error}</div>
                    </div>
                }
            </div>
        )
    }

    clear = () => {
        this.props.input.onChange('')
        this.props.flexAnyField(undefined);
    }
    flexField = () => {
        const { input:{ name }, flexAnyField } = this.props;
        flexAnyField(name);
    }
    unflexField = () => {
        const { input:{ name, value }, flexAnyField } = this.props;
        if (value) flexAnyField(name);
        else flexAnyField(undefined);
    }
}

export default FieldText
