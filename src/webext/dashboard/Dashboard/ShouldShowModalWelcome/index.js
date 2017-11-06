// @flow

import React, { PureComponent } from 'react'

import proxy from '../../connect'
import { set } from '../../../flow-control/account'

import Modal from '../Modal'
import ModalWelcome from '../ModalWelcome'

import type { Shape as AccountShape } from '../../../flow-control/account'

type Props = {
    dispatchProxied: () => void,
    account: AccountShape
}

class ShouldShowModalWelcomeDumb extends PureComponent<Props> {
    componentDidMount() {
        const {account:{ isFirstRun }, dispatchProxied } = this.props;
        if (isFirstRun) {
            Modal.show(<ModalWelcome />);
            dispatchProxied(set({ isFirstRun:false }));
        }
    }
    render() {
        console.log('this.props.account:', this.props.account);
        return null
    }
}

const ShouldShowModalWelcomeProxied = proxy(['account'])

const ShouldShowModalWelcome = ShouldShowModalWelcomeProxied(ShouldShowModalWelcomeDumb)

export default ShouldShowModalWelcome
