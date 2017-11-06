// @flow

import React, { PureComponent } from 'react'

import proxy from '../../../../connect'

import Card from './Card'

import './index.css'

import type { Shape as AccountShape } from '../../../../../flow-control/account'
import type { Entry as Extension } from '../../../../../flow-control/extensions'

type Props = {
    dispatchProxied: *,
    extensions: Extension[],
    account: AccountShape
}

class CardsDumb extends PureComponent<Props, void> {
    render() {
        const { extensions, dispatchProxied, account:{ shouldShowUnsignedModal } } = this.props;
        console.log('Cards extensions:', extensions);

        return (
            <div className="Cards">
                { Object.values(extensions).sort((a, b)=>b.date-a.date).map( extension => <Card key={extension.id} {...extension} dispatchProxied={dispatchProxied} shouldShowUnsignedModal={shouldShowUnsignedModal} /> )}
            </div>
        )
    }
}

const CardsProxied = proxy(['account', 'extensions'])

const Cards = CardsProxied(CardsDumb)

export default Cards
