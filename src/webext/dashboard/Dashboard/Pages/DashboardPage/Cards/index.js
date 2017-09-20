// @flow

import React, { PureComponent } from 'react'

import proxy from '../../../../connect'

import Card from './Card'

import './index.css'

import type { Entry as Extension } from '../../../../../flow-control/extensions'

type Props = {
    extensions: Extension[]
}

class CardsDumb extends PureComponent<Props, void> {
    render() {
        const { extensions } = this.props;
        console.log('Cards extensions:', extensions);

        return (
            <div className="Cards">
                { Object.values(extensions).map( extension => <Card key={extension.id} {...extension} /> )}
            </div>
        )
    }
}

const CardsProxied = proxy(['extensions'])

const Cards = CardsProxied(CardsDumb)

export default Cards
