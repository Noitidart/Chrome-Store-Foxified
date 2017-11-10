// @flow

import React, { PureComponent } from 'react'

import proxy from '../../connect'
import { set } from '../../../flow-control/account'

import './index.css'

import type { Shape as AccountShape } from '../../../flow-control/account'

const REMIND_EVERY = 30 * 24 * 60 * 60 * 1000; // 30 days

type Props = {
    dispatchProxied: () => void,
    account: AccountShape
}

class DonateReminderDumb extends PureComponent<Props> {
    render() {
        window.dispatchProxied = this.props.dispatchProxied;
        const {account:{ nextDonateReminder }} = this.props;

        const isVisible = Date.now() > nextDonateReminder;

        return !isVisible ? null : ( // eslint-disable-line no-extra-parens
            <div className="Donate">
                <div className="Donate--message">
                    Please support the development and server costs. A server is used for the forum and voting features, $1/month would be very helpful!
                </div>
                <div className="Donate--buttons">
                    <a className="Donate--button" href="https://www.paypal.me/Noitidart" target="_blank" rel="noopener noreferrer">Support now on Paypal</a>
                    <a className="Donate--button" onClick={this.dismissCycle} href="#">I already supported this month</a>
                </div>
            </div>
        )
    }

    // dismissForever = () => this.props.dispatchProxied(set({ nextDonateReminder:Date.now() * 2 }));
    dismissCycle = e => {
        e.preventDefault();
        this.props.dispatchProxied(set({ nextDonateReminder:Date.now() + REMIND_EVERY }));
    }
}

const DonateReminderProxied = proxy(['account'])

const DonateReminder = DonateReminderProxied(DonateReminderDumb)

export default DonateReminder
