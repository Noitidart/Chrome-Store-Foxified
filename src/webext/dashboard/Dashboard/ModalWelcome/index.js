// @flow

import React, { PureComponent } from 'react'

import proxy from '../../connect'
import { install } from '../../../flow-control/extensions'

import Modal from '../Modal'

import './index.css'

import IMAGE_CLOSE from './close.png'
import IMAGE_FIND from './s1-Find.png'
import IMAGE_ADD from './s2-Add.png'
import IMAGE_INSTALL from './s3-Install.png'
import IMAGE_NEXT from './next.png'

import type { Shape as AccountShape } from '../../../flow-control/account'

class ModalWelcome extends PureComponent<void> {
    render() {
        return (
            <div>
                <input type="radio" id="radioNxt" />
                <div id="csfxPopUp" className="ModalWelcome">
                    <img onClick={this.hide} id="close" width="32px" src={IMAGE_CLOSE} />
                    <div id="csfxWelcome" className="">
                        <div className="heading xCenter">
                            Welcome
                        </div>
                        <br />
                        <div className="h2 xCenter">to Chrome Store Foxified.</div>
                        <br />
                        <div id="frontText">
                            {/* <a className="frontContext fc1">Install Chrome,</a>
                            <a className="frontContext fc2">Opera,</a>
                            <a className="frontContext fc3">and Edge extensions,</a>
                            <a className="frontContext fc4">right in Firefox.</a>  */}
                            <a className="frontContext fc1">Install Chrome</a>
                            <a className="frontContext fc2"> and Opera extensions, </a>
                            <a className="frontContext fc4">right in Firefox.</a>
                        </div>
                        <label id="nxt" htmlFor="radioNxt">
                            <img src={IMAGE_NEXT} />
                        </label>
                        <div id="instructionImg">
                            <img id="inst0" className="instruction" src={IMAGE_FIND} />
                            <img id="inst1" className="instruction" src={IMAGE_ADD} />
                            <img id="inst2" className="instruction" src={IMAGE_INSTALL} />

                            <b>
                                <a className="instText it0">Find an extension,</a>
                                <a className="instText it1">Add it to Firefox,</a>
                                <a className="instText it2">Sign, Download or Install.</a>
                            </b>
                        </div>
                        <div id="storeLinks">
                            <div>
                                <a id="chrome" href="https://chrome.google.com/webstore/category/extensions" target="_blank" rel="noopener noreferrer">Chrome Web Store</a>
                            </div>
                            <div>
                                <a id="opera" href="https://addons.opera.com/en/extensions/" target="_blank" rel="noopener noreferrer">Opera Addons Store</a>
                            </div>
                            {/* <div><a id="edge" href="https://www.microsoft.com/en-us/store/collections/edgeextensions/pc" target="_blank" rel="noopener noreferrer">Open the Microsoft Edge Store.</a></div> */}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    hide = e => {
        e.preventDefault();
        Modal.hide();
    }
}

export default ModalWelcome
