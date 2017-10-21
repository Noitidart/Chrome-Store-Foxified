// @flow

import React, { PureComponent } from 'react'
import classnames from 'cmn/lib/classnames'

import { blobToDataUrl } from '../../../../../../../flow-control/extensions/utils'

import './index.css'
import '../index.css'

import type { FieldProps } from 'redux-form'

type Props = {
    label: string,
    desc: string | Element,
    flexAnyField: string => void,
    ...FieldProps, // below are the FieldProps i actually touch
    meta: {
        error?: string
    },
    input: {}
}

type State = {
    fileName?: string
}

class FieldFile extends PureComponent<Props, State> {
    fileInput: HTMLButtonElement

    state = {
        fileName: undefined
    }

    render() {
        const {meta:{ error }, input, input:{ value }, label } = this.props;
        const { fileName } = this.state;

        return (
            <div className="Field">
                <div className="Field--col">
                    <label className={classnames('Field--label', error && 'Field--label--error')}>
                        {label}
                    </label>
                    <div style={{display:'flex'}}>
                        <input type="text" className="Field--input-text" readOnly onFocus={this.flexField} onBlur={this.unflexField} onClick={this.browse} value={!value ? 'No file selected - click here to browse' : `${fileName} - click here to change`} />
                        { value && <button onClick={this.clear}>Clear</button> }
                    </div>
                    <input type="file" ref={this.refFile} className={classnames('Field--input-file', !value && 'Field--input-text--italic')} onChange={this.handleBrowse} />
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
        this.props.input.onChange('');
        this.props.flexAnyField(undefined);
    }
    flexField = () => {
        console.log('in flexField');
        const { input:{ name }, flexAnyField } = this.props;
        flexAnyField(name);
    }
    unflexField = () => {
        const { input:{ name, value }, flexAnyField } = this.props;
        if (value) flexAnyField(name);
        else flexAnyField(undefined);
    }

    refFile = el => this.fileInput = el;
    browse = () => this.fileInput.click();
    handleBrowse = async e => {
        console.log('in browse');

        const files = e.target.files;
        console.log('files:', files);

        if (!files.length) return;

        const file = files[0];
        console.log('file:', file);

        const fileName = file.name;

        const fileDataUrl = await blobToDataUrl(file);
        console.log('fileDataUrl:', fileDataUrl);

        this.props.input.onChange(fileDataUrl);
        this.setState(() => ({ fileName }));
    }
}

export default FieldFile
