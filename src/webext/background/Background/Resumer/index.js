// @flow

import { PureComponent } from 'react'
import { connect } from 'react-redux'

import { STATUS, requestDownload, requestParse, requestConvert, requestSign } from '../../../flow-control/extensions'

import type { Shape as ExtensionsShape } from '../../../flow-control/extensions'
import type { Shape as AppShape } from '../../../flow-control'

type Props = {
    // redux
    // dispatch: Dispatch,
    ...ExtensionsShape,
    rehydrated: boolean
}

class ResumerDumb extends PureComponent<Props, void> {
    dead: boolean = false

    componentDidMount() {
        this.check();
    }
    componentDidUpdate() {
        this.check();
    }

    render() { return null }

    check() {
        if (this.dead) return console.log('dead');
        const { extensions, dispatch, rehydrated } = this.props;
        if (!rehydrated) return console.log('not yet rehydrated');
        this.dead = true;
        console.log('extensions:', extensions);
        Object.entries(extensions).map(([id, { status }]) => {
            switch (status) {
                case STATUS.DOWNLOADING: return dispatch(requestDownload(id));
                case STATUS.PARSEING: return dispatch(requestParse(id));
                case STATUS.CONVERTING: return dispatch(requestConvert(id));
                case STATUS.SIGNING: return dispatch(requestSign(id));
                // no default
            }
        })
    }
}

const ResumerSmart = connect(
    function({ extensions, _persist:{ rehydrated } }: AppShape) {
        return { extensions, rehydrated }
    }
)

const Resumer = ResumerSmart(ResumerDumb)

export default Resumer
