// @flow

import React, { PureComponent } from 'react'

import './index.css'

type State = {
    isVisible: boolean,
    Content?: Element
}

class Modal extends PureComponent<void, State> {
    static show: void | () => void
    static hide: void | () => void

    state = {
        isVisible: false
    }

    constructor(props) {
        super(props);
        Modal.show = this.show;
        Modal.hide = this.hide;
    }
    // componentDidUpdate() {
    //     const { isVisible, Content } = this.state;
    //     const { isVisible:isVisibleOld } = this.state;

    //     if (isVisible !== isVisibleOld) {
    //         if (!isVisible) {
    //             if (Content) {
    //                 // lets clear out content
    //                 this.setState(() => ({ Content:undefiend }));
    //             }
    //         }
    //     }
    // }
    render() {
        const { isVisible, Content } = this.state;

        return !isVisible ? null : ( // eslint-disable-line no-extra-parens
            <div className="Modal">
                <div className="Modal--background" onClick={this.hide} />
                <div className="Modal--dialog">
                    { Content || <a href="#" onClick={this.hide}>This is a modal with no content, click to close</a> }
                </div>
            </div>
        )
    }

    show = (Content?: Element) => this.setState(() => ({ isVisible:true, Content }))
    hide = () => this.setState(() => ({ isVisible:false }))
}

export default Modal
