import React, { PureComponent } from 'react'

import proxy from '../../../../connect'
import { up, upAsync, dn } from '../../../../../flow-control/counter'
import { addFile, deleteFile, editFile } from '../../../../../flow-control/files'

import type { Shape as CounterShape } from '../../../../../flow-control/counter'

type Props = {
    // comm/redux
    counter: CounterShape,
    dispatchProxied: *
}

class CounterDumb extends PureComponent<Props, void> {
    render () {
        const { counter, files={} } = this.props;
console.log('files:', files);
        return (
            <div>
                <div>
                    Count: {counter}
                </div>
                <button onClick={this.handleUp}>Up</button>
                <button onClick={this.handleUpAsync}>Up Async</button>
                <button onClick={this.handleDn}>Dn</button>
                <div>
                    <b>Add File</b> <button onClick={this.addFile}>Add</button>
                    { Object.entries(files).map( ([id, { data }]) => <button key={id} onClick={()=>this.props.dispatchProxied(editFile(id, new Date().toLocaleTimeString()))}>&#35;{id} {data}</button> )}
                </div>
            </div>
        )
    }

    handleUp = () => this.props.dispatchProxied(up());
    handleUpAsync = () => this.props.dispatchProxied(upAsync(6));
    handleDn = () => this.props.dispatchProxied(dn());

    addFile = () => this.props.dispatchProxied(addFile(new Date().toLocaleTimeString()));
}

const CounterProxied = proxy(['counter', 'files'])

const Counter = CounterProxied(CounterDumb)

export default Counter