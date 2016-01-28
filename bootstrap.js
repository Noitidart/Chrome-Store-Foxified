// Imports
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
const PromiseWorker = Cu.import('resource://gre/modules/PromiseWorker.jsm').BasePromiseWorker;
Cu.import('resource://gre/modules/Services.jsm');
// Cu.import('resource://gre/modules/XPCOMUtils.jsm');
// Cu.importGlobalProperties(['Blob', 'File']);

var devtools;
try {
	var { devtools } = Cu.import('resource://devtools/shared/Loader.jsm', {});
} catch(ex) {
	var { devtools } = Cu.import('resource://gre/modules/devtools/Loader.jsm', {});
}

var beautify1 = {};
var beautify2 = {};
devtools.lazyRequireGetter(beautify1, 'beautify', 'devtools/jsbeautify');
devtools.lazyRequireGetter(beautify2, 'beautify', 'devtools/shared/jsbeautify/beautify');
function BEAUTIFY() {
	try {
		beautify1.beautify.js('""');
		return beautify1.beautify;
	} catch (ignore) {}
	try {
		beautify2.beautify.js('""');
		return beautify2.beautify;
	} catch (ignore) {}
}

// Globals
const core = {
	addon: {
		name: 'Chrome-Store-Foxified',
		id: 'Chrome-Store-Foxified@jetpack',
		path: {
			name: 'chrome-store-foxified',
			content: 'chrome://chrome-store-foxified/content/',
			images: 'chrome://chrome-store-foxified/content/resources/images/',
			locale: 'chrome://chrome-store-foxified/locale/',
			resources: 'chrome://chrome-store-foxified/content/resources/',
			scripts: 'chrome://chrome-store-foxified/content/resources/scripts/',
			modules: 'chrome://chrome-store-foxified/content/modules/',
			workers: 'chrome://chrome-store-foxified/content/modules/workers/',
		},
		cache_key: 'v1.7' // set to version on release
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase(),
		toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version
	}
};

const JETPACK_DIR_BASENAME = 'jetpack';
const myPrefBranch = 'extensions.' + core.addon.id + '.';

var gL10N = {};

var bootstrap = this;

// Lazy Imports
const myServices = {};
// XPCOMUtils.defineLazyGetter(myServices, 'hph', function () { return Cc['@mozilla.org/network/protocol;1?name=http'].getService(Ci.nsIHttpProtocolHandler); });

// START - Addon Functionalities					

// END - Addon Functionalities
function setupMainWorkerCustomErrors() {
	// Define a custom error prototype.
	function MainWorkerError(name, msg) {
		this.msg = msg;
		this.name = name;
	}
	MainWorkerError.fromMsg = function(aErrParams) {
		return new MainWorkerError(aErrParams.name, aErrParams.msg);
	};

	// Register a constructor.
	MainWorker.ExceptionHandlers['MainWorkerError'] = MainWorkerError.fromMsg;
}

var MainWorkerMainThreadFuncs = {
	installXpi: function(aXpiPlatPath) {
		
		var deferredMain_installXpi = new Deferred();
		
		var installListener = {
			onInstallEnded: function(aInstall, aAddon) {
			   var str = [];
			   //str.push('"' + aAddon.name + '" Install Ended!');
			   if (aAddon.appDisabled) {
				   //str.push('appDisabled: ' + aAddon.appDisabled);
				   // jsWin.addMsg('<red>Addon is disabled by application');
				   // deferredMain_installXpi.resolve([true, myServices.sb.GetStringFromName('addon-installed-appdisabled')]);
				   deferredMain_installXpi.resolve([{
					   status: false, // false for fail
					   reason: 'addon-installed-appdisabled'
				   }]);
			   }
			   if (aAddon.userDisabled) {
				   //str.push('userDisabled: ' + aAddon.userDisabled);
				   //jsWin.addMsg('userDisabled: ' + aAddon.userDisabled);
				   // jsWin.addMsg('<orange>Addon is currently disabled - go to addon manager to enable it');
				   // deferredMain_installXpi.resolve([true, myServices.sb.GetStringFromName('addon-installed-userdisabled')]);
				   deferredMain_installXpi.resolve([{
					   status: false, // false for fail
					   reason: 'addon-installed-userdisabled'
				   }]);
			   }
			   if (aAddon.pendingOperations != AddonManager.PENDING_NONE) {
				   //str.push('NEEDS RESTART: ' + aAddon.pendingOperations);
				   //jsWin.addMsg('NEEDS RESTART: ' + aAddon.pendingOperations);
				   // jsWin.addMsg('Needs to RESTART to complete install...');
				   // deferredMain_installXpi.resolve([true, 'this should never happen, webexts are restartless']);
				   deferredMain_installXpi.resolve([{
					   status: false, // false for fail
					   reason: 'addons-installed-needsrestart'
				   }]);
			   }
			   if (aInstall.state != AddonManager.STATE_INSTALLED) {
				   //str.push('aInstall.state: ' + aInstall.state)
				   //jsWin.addMsg('aInstall.state: ' + aInstall.state);
				   // jsWin.addMsg('<red>Addon Install Failed - Status Code: ' + aInstall.state);
				   // deferredMain_installXpi.resolve([true, myServices.sb.GetStringFromName('addon-install-failed') + aInstall.state]);
				   deferredMain_installXpi.resolve([{
					   status: false, // false for fail
					   reason: 'addon-install-failed'
				   }]);
			   } else {
				   //str.push('aInstall.state: Succesfully Installed')
				   //jsWin.addMsg('aInstall.state: Succesfully Installed')
				   // jsWin.addMsg('<green>Addon Succesfully Installed!');
				   // deferredMain_installXpi.resolve([true, myServices.sb.GetStringFromName('addon-installed')]);
				   deferredMain_installXpi.resolve([{
					   status: true, // true for success
					   reason: 'addon-installed'
				   }]);
			   }
			   //alert(str.join('\n'));
			   aInstall.removeListener(installListener);
			},
			onInstallStarted: function(aInstall) {
				// jsWin.addMsg('"' + aInstall.addon.name + '" Install Started...');
			}
		};
		
		var xpiNsiFile = new FileUtils.File(aXpiPlatPath);
		AddonManager.getInstallForFile(xpiNsiFile, function(aInstall) {
		  // aInstall is an instance of AddonInstall
			aInstall.addListener(installListener);
			aInstall.install(); //does silent install
			// AddonManager.installAddonsFromWebpage('application/x-xpinstall', Services.wm.getMostRecentWindow('navigator:browser').gBrowser.selectedBrowser, null, [aInstall]); //does regular popup install
		}, 'application/x-xpinstall');
					
		return deferredMain_installXpi.promise;
		
	},
	updateAttnBar: function(aAttnBarInfoObj, aLocalizedKey, aExtName, aXpiId) { // aXpiId, aLocalizedKey and aExtName only used when addon is found to be user disabled
		if (aLocalizedKey == 'addon-installed-userdisabled') {
			aAttnBarInfoObj.aBtns = [
				{
					bTxt: justFormatStringFromName(gL10N.bootstrap['enable-now']),
					bClick: function(doClose, aBrowser) {
						AddonManager.getAddonByID(aXpiId, function(addon) {
						  addon.userDisabled = false;
						});
						this.inststate.aBtns = [];
						this.inststate.aTxt = justFormatStringFromName(gL10N.bootstrap['attn-enabled'], [aExtName]);
						AB.setState(this.inststate);
					}
				}
			];
		} else if (aLocalizedKey == 'attn-failed-signing') {
			aAttnBarInfoObj.aBtns = [
				{
					bTxt: justFormatStringFromName(gL10N.bootstrap['show-failed-json']),
					bClick: function(doClose, aBrowser) {
						var jsonObj = aXpiId;
						// Services.prompt.alert(Services.wm.getMostRecentWindow('navigator:browser'), justFormatStringFromName(gL10N.bootstrap['addon_name']), BEAUTIFY().js(JSON.stringify(aExtName)));
						aBrowser.ownerDocument.defaultView.gBrowser.loadOneTab('data:text/plain,' + BEAUTIFY().js(JSON.stringify(jsonObj)).replace(/\n/g, '%0A'), {inBackground:false, relatedToCurrent:true});
					}
				}
			];
		}
		AB.setState(aAttnBarInfoObj);
	}
};

var AB = { // AB stands for attention bar
	// based on https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/notificationbox#Methods && https://dxr.mozilla.org/mozilla-central/source/toolkit/content/widgets/notification.xml#79
	Insts: {
		/*
		##: {
			state: avail in bootstrap only. the dom does a JSON.parse(JSON.stringify()) on this when updating from it
			setState: avail only in dom, its the react connection to it
			callbackids: {}, only in bootstrap, used for help cleaning up on destroy. key is id of callback, value is meaningless
		}
		*/
	}, // holds all instances
	domIdPrefix: core.addon.id.replace(/[^a-z0-9-_\:\.]/ig,'AB'), // The ID and NAME elements must start with a letter i.e. upper case A to Z or lower case a to z; a number is not allowed. After the first letter any number of letters (a to z, A to Z), digits (0 to 9), hyphens (-), underscores (_), colons (:) and periods (.) are allowed. // http://www.electrictoolbox.com/valid-characters-html-id-attribute/
	Callbacks: {},
	// key is nid, if nid is of a notification then the callback is a close callback, else it is of a click callback.
	// all Callbacks have last arg of aBrowser which is the xul browser element that was focused when user triggered the cb
	// click callbacks have first arg doClose, you should call doClose(aBrowser) if you want to close out the AB
	// callbacks this is bound to useful stuff. all are passed by reference so modifying that modfieis the entry in AB.Insts
		// for example clicking a menu item:
			// this: Object { inststate: Object, btn: Object, menu: Array[2], menuitem: Object } bootstrap.js:501
		// clicking btn, inst will have inststate and btn
		// closing this has inststate only
	nid: -1, // stands for next_id, used for main toolbar, and also for each button, and also each menu item
	/*
	{
		id: genned id, each id gets its own container in aDOMWindow
		desc: aDesc,
		comp: stands for react component, this gets rendered
	}
	*/
	setStateDestroy: function(aInstId) {
		// destroys, and cleans up, this does not worry about callbacks. the nonDevUserSpecifiedCloseCb actually calls this
		
		// unmount from all windows dom && delete from all windows js
		var doit = function(aDOMWindow) {
			// start - copy block link77728110
			if (!aDOMWindow.gBrowser) {
				return; // because i am targeting cDeck, windows without gBrowser won't have it
			}
			var winAB = aDOMWindow[core.addon.id + '-AB'];
			if (winAB) {
				if (aInstId in winAB.Insts) {
					// unmount this

					var cNotificationBox = aDOMWindow.document.getElementById('notificationbox-' + aInstId + '--' + AB.domIdPrefix);
					aDOMWindow.ReactDOM.unmountComponentAtNode(cNotificationBox);
					cNotificationBox.parentNode.removeChild(cNotificationBox);
					delete winAB.Insts[aInstId];
				}
			}
			// end - copy block link77728110
		};
		
		var DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			var aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				doit(aDOMWindow);
			}//  else { // not complete means its impossible it has this aInstId mounted in here
				// // aDOMWindow.addEventListener('load', function () {
				// // 	aDOMWindow.removeEventListener('load', arguments.callee, false);
				// // 	doit(aDOMWindow);
				// // }, false);
			//}
		}
		
		// delete callbacks
		for (var aCallbackId in AB.Insts[aInstId].callbackids) {
			delete AB.Callbacks[aCallbackId];
		}
		
		// delete from bootstrap js
		delete AB.Insts[aInstId];
	},
	setState: function(aInstState) { // :note: aInstState is really aInstStateState
		// this function will add to aInstState and all bts in aInstState.aBtns a id based on this.genId()
		// this function also sends setState message to all windows to update this instances
		// aInstState should be strings only, as it is sent to all windows
		
		// :note: to remove a callback you have to set it to an empty function - ```getScope().AB.Insts[0].state.aClose = function() {}; getScope().AB.setState(getScope().AB.Insts[0].state);```
		
		// RETURNS
			// updated aInstState

		
		var cInstDefaults = {
			// aId: this is auto added in
			aTxt: '', // this is the message body on the toolbar
			aPos: 0, // 1 for top, on where to append it
			aIcon: 'chrome://mozapps/skin/places/defaultFavicon.png', // icon on the toolbar
			aPriority: 1, // valid values 1-10
			aBtns: [], // must be array
			aHideClose: undefined // if set to string 'true' or bool true, in dom it will get converted to string as 'true'. setting to 1 int will not work.
		};
		
		/*
		aBtns: array of objects
		[
			{
				// bId - this is auto generated and stuck in here, with this.nid
				bIcon: optional, string to image path
				bTxt: required, text shown on button
				bKey: 'B', // access key
				bMenu: [
					{
						//mId: this is auto genned and added in here,
						mTxt: 'string'
					}
				]
			},
			{
				...
			}
		]
		*/
		
		if (!('aId' in aInstState)) {
			validateOptionsObj(aInstState, cInstDefaults);
			aInstState.aId = AB.genId();
			AB.Insts[aInstState.aId] = {
				state: aInstState,
				callbackids: {}
			};
			AB.Callbacks[aInstState.aId] = function(aBrowser) {
				AB.nonDevUserSpecifiedCloseCb(aInstState.aId, aBrowser); // this one doesnt need bind, only devuser callbacks are bound
			};
			AB.Insts[aInstState.aId].callbackids[aInstState.aId] = 1; // the close callback id
		}
		if (aInstState.aClose) {
			var aClose = aInstState.aClose.bind({inststate:aInstState});
			delete aInstState.aClose;
			
			AB.Callbacks[aInstState.aId] = function(aBrowser) {
				var rez_aClose = aClose(aBrowser);
				if (rez_aClose !== false) { // :note: if onClose returns false, it cancels the closing
					AB.nonDevUserSpecifiedCloseCb(aInstState.aId, aBrowser); // this one doesnt need bind, only devuser callbacks are bound
				}
			};
			
		}
		
		// give any newly added btns and menu items an id		
		if (aInstState.aBtns) {
			for (var i=0; i<aInstState.aBtns.length; i++) {
				if (!('bId' in aInstState.aBtns[i])) {
					aInstState.aBtns[i].bId = AB.genId();
				}
				if (aInstState.aBtns[i].bClick) { // i dont do this only if bId is not there, because devuser can change it up. i detect change by presenence of the bClick, because after i move it out of state obj and into callbacks obj, i delete it from state obj. so its not here unless changed
					AB.Insts[aInstState.aId].callbackids[aInstState.aBtns[i].bId] = 1; // its ok if it was already there, its the same one ill be removing
					AB.Callbacks[aInstState.aBtns[i].bId] = aInstState.aBtns[i].bClick.bind({inststate:aInstState, btn:aInstState.aBtns[i]}, AB.Callbacks[aInstState.aId]);
					delete aInstState.aBtns[i].bClick; // AB.Callbacks[aInstState.aId] is the doClose callback devuser should call if they want it to close out
				}
				if (aInstState.aBtns[i].bMenu) {
					AB.iterMenuForIdAndCbs(aInstState.aBtns[i].bMenu, aInstState.aId, aInstState.aBtns[i]);
				}
			}
		}
		
		// go through all windows, if this id is not in it, then mount it, if its there then setState on it
		
		var doit = function(aDOMWindow) {
			// start - orig block link181888888
			if (!aDOMWindow.gBrowser) {
				return; // because i am targeting cDeck, windows without gBrowser won't have it
			}
			AB.ensureInitedIntoWindow(aDOMWindow);
			
			if (aInstState.aId in aDOMWindow[core.addon.id + '-AB'].Insts) {
				aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].state = aDOMWindow.JSON.parse(aDOMWindow.JSON.stringify(aInstState));
				aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].setState(JSON.parse(JSON.stringify(aInstState)));
			} else {
				// mount it
				aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId] = {};
				aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].state = aDOMWindow.JSON.parse(aDOMWindow.JSON.stringify(aInstState));
				var cDeck = aDOMWindow.document.getElementById('content-deck');
				var cNotificationBox = aDOMWindow.document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'notificationbox');

				cNotificationBox.setAttribute('id', 'notificationbox-' + aInstState.aId + '--' + AB.domIdPrefix);
				if (!aInstState.aPos) {
					cDeck.parentNode.appendChild(cNotificationBox);
				} else {
					cDeck.parentNode.insertBefore(cNotificationBox, cDeck); // for top
				}
				aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].relement = aDOMWindow.React.createElement(aDOMWindow[core.addon.id + '-AB'].masterComponents.Notification, aInstState);
				aDOMWindow.ReactDOM.render(aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].relement, cNotificationBox);
			}
			// end - orig block link181888888
		};
		
		// have to do this, because if i call setState with a new object, one that is not AB.Insts[aId] then it wont get updated, and when loadInstancesIntoWindow it will not have the updated one
		AB.Insts[aInstState.aId].state = aInstState;
		
		var DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			var aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				doit(aDOMWindow);
			} else {
				aDOMWindow.addEventListener('load', function () {
					aDOMWindow.removeEventListener('load', arguments.callee, false);
					doit(aDOMWindow);
				}, false);
			}
		}
		
		return aInstState;
	},
	nonDevUserSpecifiedCloseCb: function(aInstId, aBrowser) {
		// this does the unmounting from all windows, and deletes entry from this.Insts
		
		// aBrowser.contentWindow.alert('ok this tab sent the close message for aInstId ' + aInstId);
		// on close go through and get all id's in there and remove all callbacks for it. and then unmount from all windows.
		AB.setStateDestroy(aInstId, true);
	},
	genId: function() {
		AB.nid++;
		return AB.nid;
	},
	iterMenuForIdAndCbs: function(jMenu, aCloseCallbackId, aBtnEntry) {
		// aCloseCallbackId is same as aInstId
		// aBtnArrEntry is reference as its the btn object in the .aBtns arr
		// goes through and gives every menuitem and submenu item (anything that has cTxt) an id, as they are clickable
		// ALSO moves cClick callbacks into AB.Callbacks
		jMenu.forEach(function(jEntry, jIndex, jArr) {
			if (!jEntry.cId && jEntry.cTxt) { // cId will NEVER be 0 but if it does it would be a problem with !jEntry.cId because first the notification bar is genId and the button is genId and nid starts at 0 so its at least 2 by first jMenu
				jEntry.cId = AB.genId();
				if (jEntry.cMenu) {
					AB.iterMenuForIdAndCbs(jEntry.cMenu, aCloseCallbackId, aBtnEntry);
				}
			}
			if (jEntry.cClick) { // i dont do this only if bId is not there, because devuser can change it up. i detect change by presenence of the bClick, because after i move it out of state obj and into callbacks obj, i delete it from state obj. so its not here unless changed
				AB.Insts[aCloseCallbackId].callbackids[jEntry.cId] = 1; // its ok if it was already there, its the same one ill be removing
				AB.Callbacks[jEntry.cId] = jEntry.cClick.bind({inststate:AB.Insts[aCloseCallbackId].state, btn:aBtnEntry, menu:jMenu, menuitem:jEntry}, AB.Callbacks[aCloseCallbackId]);
				delete jEntry.cClick; // AB.Callbacks[aInst.aId] is the doClose callback devuser should call if they want it to close out
			}
		});
	},
	uninitFromWindow: function(aDOMWindow) {
		if (!aDOMWindow[core.addon.id + '-AB']) {
			return;
		}

		// start - original block link77728110
		var winAB = aDOMWindow[core.addon.id + '-AB'];
		for (var aInstsId in winAB.Insts) {
			// unmount this

			var cNotificationBox = aDOMWindow.document.getElementById('notificationbox-' + aInstsId + '--' + AB.domIdPrefix);
			aDOMWindow.ReactDOM.unmountComponentAtNode(cNotificationBox);
			cNotificationBox.parentNode.removeChild(cNotificationBox);
		}
		// end - original block link77728110
		delete aDOMWindow[core.addon.id + '-AB'];

	},
	ensureInitedIntoWindow: function(aDOMWindow) {
		// dont run this yoruself, ensureInstancesToWindow runs this. so if you want to run yourself, then run ensureInstancesToWindow(aDOMWindow)
		if (!aDOMWindow[core.addon.id + '-AB']) {
			aDOMWindow[core.addon.id + '-AB'] = {
				Insts: {},
				domIdPrefix: AB.domIdPrefix
			}; // ab stands for attention bar
			if (!aDOMWindow.React) {

				Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react.js?' + core.addon.cache_key, aDOMWindow); // even if i load it into aDOMWindow.blah and .blah is an object, it goes into global, so i just do aDOMWindow now
			}
			if (!aDOMWindow.ReactDOM) {

				Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react-dom.js?' + core.addon.cache_key, aDOMWindow);
			}
			Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ab-react-components.js?' + core.addon.cache_key, aDOMWindow);
		}
	},
	init: function() {
		Services.mm.addMessageListener(core.addon.id + '-AB', AB.msgListener);
		
		Services.wm.addListener(AB.winListener);
		
		// i dont iterate all windows now and do ensureInitedIntoWindow, because i only run ensureInitedIntoWindow when there is something to add, so its lazy
		
		// and its impossible that Insts exists before Init, so no need to iterate through all windows.
	},
	uninit: function() {
		Services.mm.removeMessageListener(core.addon.id + '-AB', AB.msgListener);
		
		Services.wm.removeListener(AB.winListener);
		
		// go through all windows and unmount
		var DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			var aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow[core.addon.id + '-AB']) {
				AB.uninitFromWindow(aDOMWindow);
			}
		}
	},
	msgListener: {
		receiveMessage: function(aMsgEvent) {
			var aMsgEventData = aMsgEvent.data;

			// this means trigger a callback with id aMsgEventData
			var cCallbackId = aMsgEventData;
			var cBrowser = aMsgEvent.target;
			if (AB.Callbacks[cCallbackId]) { // need this check because react components always send message on click, but it may not have a callback
				AB.Callbacks[cCallbackId](cBrowser);
			}
		}
	},
	loadInstancesIntoWindow: function(aDOMWindow) {
		// this function is called when there may be instances in AB.Insts but and it needs to be verified that its mounted in window
		// basically this is called when a new window is opened
		
		var idsInsts = Object.keys(AB.Insts);
		if (!idsInsts.length) {
			return;
		}
		
		var doit = function(aDOMWindow) {
			// check again, in case by the time window loaded, AB.Insts changed
			var idsInsts = Object.keys(AB.Insts);
			if (!idsInsts.length) {
				return;
			}
			
			// start - copy of block link181888888
			if (!aDOMWindow.gBrowser) {
				return; // because i am targeting cDeck, windows without gBrowser won't have it
			}

			AB.ensureInitedIntoWindow(aDOMWindow);

			for (var aInstId in AB.Insts) {
				var aInstState = AB.Insts[aInstId].state;
				if (aInstState.aId in aDOMWindow[core.addon.id + '-AB'].Insts) {

					aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].state = aDOMWindow.JSON.parse(aDOMWindow.JSON.stringify(aInstState));
					aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].setState(JSON.parse(JSON.stringify(aInstState)));
				} else {
					// mount it
					aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId] = {};
					aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].state = aDOMWindow.JSON.parse(aDOMWindow.JSON.stringify(aInstState));
					var cDeck = aDOMWindow.document.getElementById('content-deck');
					var cNotificationBox = aDOMWindow.document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'notificationbox');

					cNotificationBox.setAttribute('id', 'notificationbox-' + aInstState.aId + '--' + AB.domIdPrefix);
					if (!aInstState.aPos) {
						cDeck.parentNode.appendChild(cNotificationBox);
					} else {
						cDeck.parentNode.insertBefore(cNotificationBox, cDeck); // for top
					}
					aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].relement = aDOMWindow.React.createElement(aDOMWindow[core.addon.id + '-AB'].masterComponents.Notification, aInstState);
					aDOMWindow.ReactDOM.render(aDOMWindow[core.addon.id + '-AB'].Insts[aInstState.aId].relement, cNotificationBox);
				}
				// end - copy of block link181888888
			}
		};
		

		if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
			doit(aDOMWindow);
		} else {
			aDOMWindow.addEventListener('load', function () {
				aDOMWindow.removeEventListener('load', arguments.callee, false);
				doit(aDOMWindow);
			}, false);
		}
		
	},
	winListener: {
		onOpenWindow: function (aXULWindow) {
			// Wait for the window to finish loading
			var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			aDOMWindow.addEventListener('load', function () {
				aDOMWindow.removeEventListener('load', arguments.callee, false);
				AB.loadInstancesIntoWindow(aDOMWindow);
			}, false);
		},
		onCloseWindow: function (aXULWindow) {},
		onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	}
};

function install() {}

function uninstall(aData, aReason) {
	if (aReason == ADDON_UNINSTALL) {
		// delete prefs
		try {
			Services.prefs.clearUserPref('extensions.chrome-store-foxified@jetpack.save');
		} catch(ignore) {}
		try {
			Services.prefs.clearUserPref('extensions.chrome-store-foxified@jetpack.save-path');
		} catch(ignore) {}
	}
}

function startup(aData, aReason) {
	// core.addon.aData = aData;
	// extendCore();

	AB.init();
		
	// set preferences defaults
	try {
		Services.prefs.getBoolPref('extensions.chrome-store-foxified@jetpack.save');
	} catch(ex) {
		Services.prefs.setBoolPref('extensions.chrome-store-foxified@jetpack.save', true);
	}
	try {
		Services.prefs.getCharPref('extensions.chrome-store-foxified@jetpack.save-path');
	} catch (ex) {
		Services.prefs.setCharPref('extensions.chrome-store-foxified@jetpack.save-path', OS.Constants.Path.desktopDir);
	}
	
	var afterWorker = function(aInitObj) { // because i init worker, then continue init
	
		gL10N = aInitObj.l10n;
		
		var aTimer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
		aTimer.initWithCallback({
			notify: function() {

				// register framescript listener
				Services.mm.addMessageListener(core.addon.id, fsMsgListener);
				
				// register framescript injector
				Services.mm.loadFrameScript(core.addon.path.scripts + 'fsInlay.js?' + core.addon.cache_key, true);
			}
		}, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
	};
	
	// startup worker
	var promise_initMainWorker = SIPWorker('MainWorker', core.addon.path.modules + 'MainWorker/MainWorker.js?' + core.addon.cache_key, core, MainWorkerMainThreadFuncs);
	promise_initMainWorker.then(
		function(aInitObj) {

			// start - do stuff here - promise_initMainWorker
			setupMainWorkerCustomErrors();
			afterWorker(aInitObj);
			// end - do stuff here - promise_initMainWorker
		},
		function(aReason) {
			var rejObj = {
				name: 'promise_initMainWorker',
				aReason: aReason
			};

		}
	).catch(
		function(aCaught) {
			var rejObj = {
				name: 'promise_initMainWorker',
				aCaught: aCaught
			};

		}
	);
	
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) { return }
	
	AB.uninit();
	
	// unregister framescript injector
	Services.mm.removeDelayedFrameScript(core.addon.path.scripts + 'fsInlay.js?' + core.addon.cache_key);
	
	// kill framescripts
	Services.mm.broadcastAsyncMessage(core.addon.id, ['destroySelf']);
	
	// unregister framescript listener
	Services.mm.removeMessageListener(core.addon.id, fsMsgListener);
	
	// terminate worker
	if (typeof(MainWorker) != 'undefined') {
		MainWorker._worker.terminate();

	}
}

// start - server/framescript comm layer
// functions for framescripts to call in main thread
var fsFuncs = { // can use whatever, but by default its setup to use this
	requestInit: function(aMsgEvent) {
		// start - l10n injection into fs
		

		
		return [{
			aCore: core,
			aL10n: {
				inlay: gL10N.inlay
			}
		}];
	},
	callInPromiseWorker: function(returnToFramescript, aArrOfWorker_FuncnameThenArgs) {
		// for use with sendAsyncMessageWithCallback from framescripts
		
		if (returnToFramescript) {
			var mainDeferred_callInPromiseWorker = new Deferred();
		}
		
		// start - chrome store foxified specific stuff
		var cPrefs = {};
		
		// save pref
		try {
			cPrefs.save = Services.prefs.getBoolPref('extensions.chrome-store-foxified@jetpack.save');
		} catch(ex) {
			// set default avlue as apparently pref is not existing
			Services.prefs.setBoolPref('extensions.chrome-store-foxified@jetpack.save', true);
			cPrefs.save = Services.prefs.getBoolPref('extensions.chrome-store-foxified@jetpack.save');
		}
		
		// save-path pref
		try {
			cPrefs['save-path'] = Services.prefs.getCharPref('extensions.chrome-store-foxified@jetpack.save-path');
		} catch (ex) {
			// set default avlue as apparently pref is not existing
			Services.prefs.setCharPref('extensions.chrome-store-foxified@jetpack.save-path', OS.Constants.Path.desktopDir);
			cPrefs['save-path'] = Services.prefs.getCharPref('extensions.chrome-store-foxified@jetpack.save-path');
		}
		
		aArrOfWorker_FuncnameThenArgs.push(cPrefs);
		
		var cAttnBarInstState = AB.setState({
			aPriority: 1,
			aPos: 1,
			aHideClose: true
		});
		
		aArrOfWorker_FuncnameThenArgs.push(cAttnBarInstState);
		// end - chrome store foxified specific stuff
		
		var rez_pwcall = MainWorker.post(aArrOfWorker_FuncnameThenArgs.shift(), aArrOfWorker_FuncnameThenArgs);
		rez_pwcall.then(
			function(aVal) {

				if (returnToFramescript) {
					if (Array.isArray(aVal)) {
						mainDeferred_callInPromiseWorker.resolve(aVal);
					} else {
						mainDeferred_callInPromiseWorker.resolve([aVal]);
					}
				}
			},
			function(aReason) {
				var rejObj = {
					name: 'rez_pwcall',
					aReason: aReason
				};

				if (returnToFramescript) {
					mainDeferred_callInPromiseWorker.resolve([rejObj]);
				}
			}
		).catch(
			function(aCaught) {
				var rejObj = {
					name: 'rez_pwcall',
					aCaught: aCaught
				};

				if (returnToFramescript) {
					mainDeferred_callInPromiseWorker.resolve([rejObj]);
				}
			}
		);
		
		if (returnToFramescript) {
			return mainDeferred_callInPromiseWorker.promise;
		}
	}
};
var fsMsgListener = {
	funcScope: fsFuncs,
	receiveMessage: function(aMsgEvent) {
		var aMsgEventData = aMsgEvent.data;

		// aMsgEvent.data should be an array, with first item being the unfction name in bootstrapCallbacks
		
		var callbackPendingId;
		if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SAM_CB_PREFIX) == 0) {
			callbackPendingId = aMsgEventData.pop();
		}
		
		aMsgEventData.push(aMsgEvent); // this is special for server side, so the function can do aMsgEvent.target.messageManager to send a response
		
		var funcName = aMsgEventData.shift();
		if (funcName in this.funcScope) {
			var rez_parentscript_call = this.funcScope[funcName].apply(null, aMsgEventData);
			
			if (callbackPendingId) {
				// rez_parentscript_call must be an array or promise that resolves with an array
				if (rez_parentscript_call.constructor.name == 'Promise') {
					rez_parentscript_call.then(
						function(aVal) {
							// aVal must be an array
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, aVal]);
						},
						function(aReason) {

							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aReason]]);
						}
					).catch(
						function(aCatch) {

							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aCatch]]);
						}
					);
				} else {
					// assume array

					aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, rez_parentscript_call]);
				}
			}
		}

		
	}
};
// end - server/framescript comm layer

// start - common helper functions
function aReasonMax(aReason) {
	var deepestReason = aReason;
	while (deepestReason.hasOwnProperty('aReason') || deepestReason.hasOwnProperty()) {
		if (deepestReason.hasOwnProperty('aReason')) {
			deepestReason = deepestReason.aReason;
		} else if (deepestReason.hasOwnProperty('aCaught')) {
			deepestReason = deepestReason.aCaught;
		}
	}
	return deepestReason;
}

// sendAsyncMessageWithCallback - rev3
const SAM_CB_PREFIX = '_sam_gen_cb_';
var sam_last_cb_id = -1;
function sendAsyncMessageWithCallback(aMessageManager, aGroupId, aMessageArr, aCallbackScope, aCallback) {
	sam_last_cb_id++;
	var thisCallbackId = SAM_CB_PREFIX + sam_last_cb_id;
	aCallbackScope = aCallbackScope ? aCallbackScope : bootstrap;
	aCallbackScope[thisCallbackId] = function(aMessageArr) {
		delete aCallbackScope[thisCallbackId];
		aCallback.apply(null, aMessageArr);
	}
	aMessageArr.push(thisCallbackId);
	aMessageManager.sendAsyncMessage(aGroupId, aMessageArr);
}


function extendCore() {
	// adds some properties i use to core based on the current operating system, it needs a switch, thats why i couldnt put it into the core obj at top
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			core.os.version = parseFloat(Services.sysinfo.getProperty('version'));
			// http://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions
			if (core.os.version == 6.0) {
				core.os.version_name = 'vista';
			}
			if (core.os.version >= 6.1) {
				core.os.version_name = '7+';
			}
			if (core.os.version == 5.1 || core.os.version == 5.2) { // 5.2 is 64bit xp
				core.os.version_name = 'xp';
			}
			break;
			
		case 'darwin':
			var userAgent = myServices.hph.userAgent;

			var version_osx = userAgent.match(/Mac OS X 10\.([\d\.]+)/);

			
			if (!version_osx) {
				throw new Error('Could not identify Mac OS X version.');
			} else {
				var version_osx_str = version_osx[1];
				var ints_split = version_osx[1].split('.');
				if (ints_split.length == 1) {
					core.os.version = parseInt(ints_split[0]);
				} else if (ints_split.length >= 2) {
					core.os.version = ints_split[0] + '.' + ints_split[1];
					if (ints_split.length > 2) {
						core.os.version += ints_split.slice(2).join('');
					}
					core.os.version = parseFloat(core.os.version);
				}
				// this makes it so that 10.10.0 becomes 10.100
				// 10.10.1 => 10.101
				// so can compare numerically, as 10.100 is less then 10.101
				
				//core.os.version = 6.9; // note: debug: temporarily forcing mac to be 10.6 so we can test kqueue
			}
			break;
		default:
			// nothing special
	}
	

}


// rev1 - https://gist.github.com/Noitidart/c4ab4ca10ff5861c720b
function validateOptionsObj(aOptions, aOptionsDefaults) {
	// ensures no invalid keys are found in aOptions, any key found in aOptions not having a key in aOptionsDefaults causes throw new Error as invalid option
	for (var aOptKey in aOptions) {
		if (!(aOptKey in aOptionsDefaults)) {

			throw new Error('aOptKey of ' + aOptKey + ' is an invalid key, as it has no default value');
		}
	}
	
	// if a key is not found in aOptions, but is found in aOptionsDefaults, it sets the key in aOptions to the default value
	for (var aOptKey in aOptionsDefaults) {
		if (!(aOptKey in aOptions)) {
			aOptions[aOptKey] = aOptionsDefaults[aOptKey];
		}
	}
}

function Deferred() { // rev3 - https://gist.github.com/Noitidart/326f1282c780e3cb7390
	// update 062115 for typeof
	if (typeof(Promise) != 'undefined' && Promise.defer) {
		//need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
		return Promise.defer();
	} else if (typeof(PromiseUtils) != 'undefined'  && PromiseUtils.defer) {
		//need import of PromiseUtils.jsm for example: Cu.import('resource:/gree/modules/PromiseUtils.jsm');
		return PromiseUtils.defer();
	} else {
		/* A method to resolve the associated Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} value : This value is used to resolve the promise
		 * If the value is a Promise then the associated promise assumes the state
		 * of Promise passed as value.
		 */
		this.resolve = null;

		/* A method to reject the assocaited Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} reason: The reason for the rejection of the Promise.
		 * Generally its an Error object. If however a Promise is passed, then the Promise
		 * itself will be the reason for rejection no matter the state of the Promise.
		 */
		this.reject = null;

		/* A newly created Pomise object.
		 * Initially in pending state.
		 */
		this.promise = new Promise(function(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}.bind(this));
		Object.freeze(this);
	}
}
function genericReject(aPromiseName, aPromiseToReject, aReason) {
	var rejObj = {
		name: aPromiseName,
		aReason: aReason
	};

	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
function genericCatch(aPromiseName, aPromiseToReject, aCaught) {
	var rejObj = {
		name: aPromiseName,
		aCaught: aCaught
	};

	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}

// SIPWorker - rev4 - https://gist.github.com/Noitidart/92e55a3f7761ed60f14c
const SIP_CB_PREFIX = '_a_gen_cb_';
const SIP_TRANS_WORD = '_a_gen_trans_';
var sip_last_cb_id = -1;
function SIPWorker(workerScopeName, aPath, aCore=core, aFuncExecScope) {
	// update 010516 - allowing pomiseworker to execute functions in this scope, supply aFuncExecScope, else leave it undefined and it will not set this part up
	// update 122115 - init resolves the deferred with the value returned from Worker, rather then forcing it to resolve at true
	// "Start and Initialize PromiseWorker"
	// returns promise
		// resolve value: jsBool true
	// aCore is what you want aCore to be populated with
	// aPath is something like `core.addon.path.content + 'modules/workers/blah-blah.js'`
	
	// :todo: add support and detection for regular ChromeWorker // maybe? cuz if i do then ill need to do ChromeWorker with callback
	
	var deferredMain_SIPWorker = new Deferred();

	if (!(workerScopeName in bootstrap)) {
		bootstrap[workerScopeName] = new PromiseWorker(aPath);
		
		// start 010516 - allow worker to execute functions in bootstrap scope and get value
		if (aFuncExecScope) {
			// this triggers instantiation of the worker immediately
			var origOnmessage = bootstrap[workerScopeName]._worker.onmessage;
			bootstrap[workerScopeName]._worker.onmessage = function(aMsgEvent) {
				////// start - my custom stuff
				var aMsgEventData = aMsgEvent.data;

				if (Array.isArray(aMsgEventData)) {
					// my custom stuff, PromiseWorker did self.postMessage to call a function from here

					
					var callbackPendingId;
					if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SIP_CB_PREFIX) == 0) {
						callbackPendingId = aMsgEventData.pop();
					}
					
					var funcName = aMsgEventData.shift();
					if (funcName in aFuncExecScope) {
						var rez_mainthread_call = aFuncExecScope[funcName].apply(null, aMsgEventData);
						
						if (callbackPendingId) {
							if (rez_mainthread_call.constructor.name == 'Promise') {
								rez_mainthread_call.then(
									function(aVal) {
										if (aVal.length >= 2 && aVal[aVal.length-1] == SIP_TRANS_WORD && Array.isArray(aVal[aVal.length-2])) {
											// to transfer in callback, set last element in arr to SIP_TRANS_WORD and 2nd to last element an array of the transferables									// cannot transfer on promise reject, well can, but i didnt set it up as probably makes sense not to

											aVal.pop();
											bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, aVal], aVal.pop());
										} else {
											bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, aVal]);
										}
									},
									function(aReason) {

										bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, ['promise_rejected', aReason]]);
									}
								).catch(
									function(aCatch) {

										bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, ['promise_rejected', aCatch]]);
									}
								);
							} else {
								// assume array
								if (rez_mainthread_call.length > 2 && rez_mainthread_call[rez_mainthread_call.length-1] == SIP_TRANS_WORD && Array.isArray(rez_mainthread_call[rez_mainthread_call.length-2])) {
									// to transfer in callback, set last element in arr to SIP_TRANS_WORD and 2nd to last element an array of the transferables									// cannot transfer on promise reject, well can, but i didnt set it up as probably makes sense not to
									rez_mainthread_call.pop();
									bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, rez_mainthread_call], rez_mainthread_call.pop());
								} else {
									bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, rez_mainthread_call]);
								}
							}
						}
					}

					////// end - my custom stuff
				} else {
					origOnmessage(aMsgEvent);
				}
			}
		}
		// end 010516 - allow worker to execute functions in bootstrap scope and get value
		
		if ('addon' in aCore && 'aData' in aCore.addon) {
			delete aCore.addon.aData; // we delete this because it has nsIFile and other crap it, but maybe in future if I need this I can try JSON.stringify'ing it
		}
		
		var promise_initWorker = bootstrap[workerScopeName].post('init', [aCore]);
		promise_initWorker.then(
			function(aVal) {

				// start - do stuff here - promise_initWorker
				deferredMain_SIPWorker.resolve(aVal);
				// end - do stuff here - promise_initWorker
			},
			function(aReason) {
				var rejObj = {name:'promise_initWorker', aReason:aReason};

				deferredMain_SIPWorker.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_initWorker', aCaught:aCaught};

				deferredMain_SIPWorker.reject(rejObj);
			}
		);
		
	} else {
		deferredMain_SIPWorker.reject('Something is loaded into bootstrap[workerScopeName] already');
	}
	
	return deferredMain_SIPWorker.promise;
	
}

// rev1 - https://gist.github.com/Noitidart/7943f34cffc602a17e3e
function xpcomSetTimeout(aNsiTimer, aDelayTimerMS, aTimerCallback) {
	aNsiTimer.initWithCallback({
		notify: function() {
			aTimerCallback();
		}
	}, aDelayTimerMS, Ci.nsITimer.TYPE_ONE_SHOT);
}

function justFormatStringFromName(aLocalizableStr, aReplacements) {
	// justFormatStringFromName is formating only ersion of the worker version of formatStringFromName
	
	var cLocalizedStr = aLocalizableStr;
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}
	
	return cLocalizedStr;
}
// end - common helper functions