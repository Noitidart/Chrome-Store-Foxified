(function(aAddonId){	
	window[aAddonId + '-AB'].contentMMForBrowser = function(aXULBrowser) {
		// aXULBrowser is something like gBrowser.selectedBrowser
		return aXULBrowser._docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIContentFrameMessageManager)
	};
	
	window[aAddonId + '-AB'].masterComponents = {
		Deck: 'notificationbox', // not a react component, just append this before inserting react component into it
		Notification: React.createClass({
			displayName: 'Notification',
			componentDidMount: function() {
				console.error('ok mounted'); // for some reason this doesnt trigger
				window[aAddonId + '-AB'].Insts[this.props.aId].setState = this.setState.bind(this);
				window[aAddonId + '-AB'].Node = node;
				
				var node = ReactDOM.findDOMNode(this);
				node.close = this.close;
			},
			close: function() {
				var myEvent = document.createEvent('CustomEvent');
				myEvent.initCustomEvent(aAddonId + '-AB', true, true, {
					browser: gBrowser.selectedBrowser,
					cbid: this.props.aId
				});
				window.dispatchEvent(myEvent);
				// window[aAddonId + '-AB'].contentMMForBrowser(gBrowser.selectedBrowser). (aAddonId + '-AB', this.props.aId);
			},
			getInitialState: function() {
				return {
					// matches cInstDefaults
					aId: this.props.aId,
					aTxt: this.props.aTxt,
					aPos: this.props.aPos,
					aIcon: this.props.aIcon,
					aPriority: this.props.aPriority,
					aBtns: this.props.aBtns,
					aId: this.props.aId,
					aHideClose: this.props.aHideClose
				}
			},
			render: function() {
				
				// incoming props
				// do not use props, use state

				var cBarProps = {
					pPriority: this.state.aPriority,
					// pType: // this is set below
					pTxt: this.state.aTxt,
					pIcon: this.state.aIcon,
				};
				
				if (this.state.aPriority <= 3) {
					cBarProps.pType = 'info';
				} else if (this.state.aPriority <= 6) {
					cBarProps.pType = 'warning';
				} else if (this.state.aPriority <= 10) {
					cBarProps.pType = 'critical';
				} else {
					throw new Error('Invalid notification priority');
				}
				
				cBarProps.pBtns = this.state.aBtns;
				cBarProps.pId = this.state.aId;
				cBarProps.pHideClose = this.state.aHideClose;
				
				return React.createElement(window[aAddonId + '-AB'].masterComponents.Bar, cBarProps);
			}
		}),
		Bar: React.createClass({
			displayName: 'Bar',
			componentDidMount: function() {
				this.shouldMirrorProps(this.props, true);
			},
			componentWillReceiveProps: function(aNextProps) {
				this.shouldMirrorProps(aNextProps);
			},
			customAttrs: { // works with this.shouldMirrorProps // these are properties that should be made into attributes on the element - key is the string as found in this.props and value is the attr it should be applied as
				pIcon: 'image',
				pPriority: 'priority',
				pHideClose: 'hideclose'
			},
			shouldMirrorProps: function(aNextProps, aIsMount) { // works with this.customAttrs
				var node = ReactDOM.findDOMNode(this);
				console.log('node:', node);
				
				for (var nProp in aNextProps) {
					if (nProp in this.customAttrs) {
						if (aIsMount || this.props[nProp] !== aNextProps[nProp]) { // // i do aIsMount check, because on mount, old prop is same as new prop, becase i call in componentDidMount shouldMirrorProps(this.props)
							console.log(['setting custom attr "' + nProp + '"','old: ' + this.props[nProp], 'new: ' + aNextProps[nProp]].join('\n'));
							if (!aIsMount && (aNextProps[nProp] === null || aNextProps[nProp] === undefined)) {
								node.removeAttribute(this.customAttrs[nProp]);
							} else {
								node.setAttribute(this.customAttrs[nProp], aNextProps[nProp]);
							}
						}
					}
				}
			},
			render: function() {
				// incoming props
				//	pPriority
				//	pTxt
				//	pIcon
				//	pType
				//	pBtns
				//	pId - this is just how normally the notification bar happens, it sets the value to this
				//	pHideClose
				var cChildren;
				if (this.props.pBtns && this.props.pBtns.length) {
					cChildren = [];
					for (var i=0; i<this.props.pBtns.length; i++) {
						var cButtonProps = {
							// key: this.props.pBtns[i].bId,
							pId: this.props.pBtns[i].bId,
							pKey: this.props.pBtns[i].bKey,
							pTxt: this.props.pBtns[i].bTxt,
							pMenu: this.props.pBtns[i].bMenu,
							pIcon: this.props.pBtns[i].bIcon,
							pType: this.props.pBtns[i].bType
						};
						cChildren.push(React.createElement(window[aAddonId + '-AB'].masterComponents.Button, cButtonProps));
					}
				}
				
				return React.createElement('notification', {label:this.props.pTxt, priority:this.props.pPriority, type:this.props.pType, image:this.props.pIcon, value:'notificationbox-' + this.props.pId + '--' + window[aAddonId + '-AB'].domIdPrefix},
					cChildren
				);
			}
		}),
		Button: React.createClass({
			displayName: 'Button',
			componentDidMount: function() {
				this.shouldMirrorProps(this.props, true);
				ReactDOM.findDOMNode(this).addEventListener('command', this.click);
			},
			componentWillReceiveProps: function(aNextProps) {
				this.shouldMirrorProps(aNextProps);
			},
			customAttrs: { // works with this.shouldMirrorProps // these are properties that should be made into attributes on the element - key is the string as found in this.props and value is the attr it should be applied as
				pIcon: 'image'
			},
			click: function() {
				var myEvent = document.createEvent('CustomEvent');
				myEvent.initCustomEvent(aAddonId + '-AB', true, true, {
					browser: gBrowser.selectedBrowser,
					cbid: this.props.pId
				});
				window.dispatchEvent(myEvent);
				// window[aAddonId + '-AB'].contentMMForBrowser(gBrowser.selectedBrowser).sendAsyncMessage(aAddonId + '-AB', this.props.pId);
			},
			shouldMirrorProps: function(aNextProps, aIsMount) { // works with this.customAttrs
				var node = ReactDOM.findDOMNode(this);
				console.log('node:', node);
				for (var nProp in aNextProps) {
					if (nProp in this.customAttrs) {
						if (aIsMount || this.props[nProp] !== aNextProps[nProp]) { // // i do aIsMount check, because on mount, old prop is same as new prop, becase i call in componentDidMount shouldMirrorProps(this.props)
							console.log(['setting custom attr "' + nProp + '"','old: ' + this.props[nProp], 'new: ' + aNextProps[nProp]].join('\n'));
							if (!aIsMount && (aNextProps[nProp] === null || aNextProps[nProp] === undefined)) {
								node.removeAttribute(this.customAttrs[nProp]);
							} else {
								node.setAttribute(this.customAttrs[nProp], aNextProps[nProp]);
							}
						}
					}
				}
			},
			render: function() {
				// incoming properties
				//	pTxt
				//	pKey - optional
				//	pIcon - optional
				//	pMenu
				//	pId

				var cAccesskey = this.props.pKey ? this.props.pKey : undefined;
				var cImage = this.props.pIcon ? this.props.pIcon : undefined;
				
				var cProps = {
					className: 'notification-button notification-button-default',
					label: this.props.pTxt,
					accessKey: cAccesskey,
					image: cImage,
					type: this.props.pType || undefined
				};
				
				// cProps.onClick = this.click; // moved to componentDidMount and as onCommand
				
				var cChildren;			
				if (this.props.pMenu && this.props.pMenu.length) {
					cProps.type = !cProps.type ? 'menu' : cProps.type;
					var cChildren = React.createElement(window[aAddonId + '-AB'].masterComponents.Menu, {pMenu:this.props.pMenu});
				}
				return React.createElement('button', cProps,
					cChildren
				);
			}
		}),
		Menu: React.createClass({
			displayName: 'Menu',
			render: function() {
				// incoming props
				//	pMenu - a array of menu items
				
				var cChildren = [];
				for (var i=0; i<this.props.pMenu.length; i++) {
					cChildren.push(React.createElement(window[aAddonId + '-AB'].masterComponents.MenuItem, this.props.pMenu[i]));
				}
				
				return React.createElement('menupopup', {},
					cChildren
				);
			}
		}),
		MenuItem: React.createClass({
			displayName: 'MenuItem',
			componentDidMount: function() {
				this.shouldMirrorProps(this.props, true);
				if (!this.props.cMenu) {
					console.log('ok its a menuitem so attach command listener');
					ReactDOM.findDOMNode(this).addEventListener('command', this.click);
				}
				else { console.log('will not add event listener for command because its a menu NOT a menuitem') }
			},
			componentWillReceiveProps: function(aNextProps) {
				this.shouldMirrorProps(aNextProps);
			},
			customAttrs: { // works with this.shouldMirrorProps // these are properties that should be made into attributes on the element - key is the string as found in this.props and value is the attr it should be applied as
				cIcon: 'image'
			},
			shouldMirrorProps: function(aNextProps, aIsMount) { // works with this.customAttrs
				var node = ReactDOM.findDOMNode(this);
				console.log('node:', node);
				for (var nProp in aNextProps) {
					if (nProp in this.customAttrs) {
						if (aIsMount || this.props[nProp] !== aNextProps[nProp]) { // // i do aIsMount check, because on mount, old prop is same as new prop, becase i call in componentDidMount shouldMirrorProps(this.props)
							console.log(['setting custom attr "' + nProp + '"','old: ' + this.props[nProp], 'new: ' + aNextProps[nProp]].join('\n'));
							if (!aIsMount && (aNextProps[nProp] === null || aNextProps[nProp] === undefined)) {
								node.removeAttribute(this.customAttrs[nProp]);
							} else {
								node.setAttribute(this.customAttrs[nProp], aNextProps[nProp]);
							}
						}
					}
				}
			},
			click: function(e) {
				e.stopPropagation(); // if i dont do this, then it also triggers the click of the button. as this whole menu is appended as child in the button
				// window[aAddonId + '-AB'].contentMMForBrowser(gBrowser.selectedBrowser).sendAsyncMessage(aAddonId + '-AB', this.props.cId);
				var myEvent = document.createEvent('CustomEvent');
				myEvent.initCustomEvent(aAddonId + '-AB', true, true, {
					browser: gBrowser.selectedBrowser,
					cbid: this.props.cId
				});
				window.dispatchEvent(myEvent);
			},
			render: function() {
				// incoming props
				//	anything in a pMenu array. currently only cImage, cMenu, cIcon, cId, cClass do anything (cClass because you may want to menuitem-non-iconic) per https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/menuitem#Style_classes
				
				var cProps = {
					label: this.props.cTxt,
					className: this.props.cClass ? this.props.cClass : undefined
				};

				if (this.props.cMenu) {
					// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/menu#Style_classes
					if (this.props.cIcon) {
						cProps.className = (cProps.className ? cProps.className + ' ' : '') + 'menu-iconic';
					}
					
					return React.createElement('menu', cProps,
						React.createElement(window[aAddonId + '-AB'].masterComponents.Menu, {pMenu:this.props.cMenu})
					);
				} else {
					// per mdn docs https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/menuitem#a-image if you want icon to show you have to set this class
					if (this.props.cIcon) {
						cProps.className = (cProps.className ? cProps.className + ' ' : '') + 'menuitem-iconic';
					}
					
					// cProps.onClick = this.click; // moved to componentDidMount and as onCommand
					
					return React.createElement('menuitem', cProps);
				}
			}
		})
	};
})('Chrome-Store-Foxified@jetpack');