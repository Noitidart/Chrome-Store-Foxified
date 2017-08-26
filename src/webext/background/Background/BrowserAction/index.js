// @flow

import { PureComponent } from 'react'
import { connect } from 'react-redux'

import DASHBOARD_PAGE from '../../../dashboard/index.html'

import type { Shape as BrowserActionShape } from '../../../flow-control/browser-action'
import type { Shape as AppShape } from '../../../flow-control'

type Props = {
    // redux
    // ...BrowserActionShape
}

const TRAITS = {
    BADGE_COLOR: 'badgeColor',
    BADGE_TEXT: 'badgeText',
    TITLE: 'title'
}

class BrowserActionDumb extends PureComponent<Props, void> {

    componentDidUpdate(propsOld) {
        console.log('in componentDidUpdate of BrowserAction, this.props:', this.props, 'propsOld:', propsOld);

        for (const [,trait] of Object.entries(TRAITS)) {
            const value = this.props[trait];
            const valueOld = propsOld[trait];
            if (value !== valueOld) BrowserActionDumb[`set${trait[0].toUpperCase()}${trait.substr(1)}`](value);
        }
    }
    componentDidMount() {
        extension.browserAction.onClicked.addListener(BrowserActionDumb.handleClick);
        this.componentDidUpdate({});
    }
    render() { return null }

    static handleClick() {
        extension.tabs.create({ url:DASHBOARD_PAGE });
    }

    static setTitle(title: string) {
        extension.browserAction.setTitle({ title })
    }
    static setBadgeText(text: string) {
        extension.browserAction.setBadgeText({ text })
    }
    static setBadgeColor(color: string) {
        extension.browserAction.setBadgeBackgroundColor({ color });
    }

}

const BrowserActionSmart = connect(
    function(state: AppShape) {
        return state.browserAction;
    }
)

const BrowserAction = BrowserActionSmart(BrowserActionDumb)

export default BrowserAction