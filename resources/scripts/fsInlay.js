// FRAMESCRIPT
const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;

// Globals
var core = {
	addon: {
		id: 'Foxified-Chrome-Extensions-and-Store@jetpack',
		path: {
			name: 'foxified-chrome-extensions-and-store',
			scripts: 'chrome://foxified-chrome-extensions-and-store/content/resources/scripts/'
		},
		cache_key: Math.random() // set to version on release
	}
};

const NS_HTML = 'http://www.w3.org/1999/xhtml';
const CHROMESTORE_HOSTNAME = 'chrome.google.com';

var L10N = {};
var FS_UNLOADERS = [];
var PAGE_UNLOADERS = [];

// start - addon functionalities
var myWebProgressListener = {
	init: function() {
		var webProgress = docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress);
		webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_STATE_ALL);
	},
	uninit: function() {
		if (!docShell) {
			return;
		}
		var webProgress = docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress);
		webProgress.removeProgressListener(this);
	},

	onStateChange: function(webProgress, aRequest, flags, status) {
		// figure out the flags
		var flagStrs = [];
		for (var f in Ci.nsIWebProgressListener) {
			if (!/a-z/.test(f)) { // if it has any lower case letters its not a flag
				if (flags & Ci.nsIWebProgressListener[f]) {
					flagStrs.push(f);
				}
			}
		}
		
		if (aRequest && flags & Ci.nsIWebProgressListener.STATE_STOP) {
			var contentWindow = getContentWindowFromNsiRequest(aRequest);
			var contentWindow = getContentWindowFromNsiRequest(aRequest);
			if (contentWindow) {
				console.log('onStateChange', 'URI.spec:', aRequest.QueryInterface(Ci.nsIChannel).URI.spec, 'contentWindow:', contentWindow, 'contentWindow.hostname', contentWindow.location.hostname, 'flagStrs:', flagStrs);
			} else {
				try {
					console.warn('onStateChange', 'URI.spec:', aRequest.QueryInterface(Ci.nsIChannel).URI.spec, 'flagStrs:', flagStrs);
				} catch (ex) {
					// console.error('onStateChange', flagStrs);
				}
			}
			// aRequest.cancel(Cr.NS_BINDING_ABORTED);
		} else {
			
		}
		// var data = {
		// 	requestURL: request.QueryInterface(Ci.nsIChannel).URI.spec,
		// 	windowId: webProgress.DOMWindowID,
		// 	parentWindowId: getParentWindowId(webProgress.DOMWindow),
		// 	status,
		// 	stateFlags,
		// };

		// if (webProgress.DOMWindow.top != webProgress.DOMWindow) {
		// 	// this is a frame element
		// 	var webNav = webProgress.QueryInterface(Ci.nsIWebNavigation);
		// 	if (!webNav.canGoBack) {
		// 		// For some reason we don't fire onLocationChange for the
		// 		// initial navigation of a sub-frame. So we need to simulate
		// 		// it here.
		// 	}
		// }
	},
	onLocationChange: function(webProgress, aRequest, locationURI, flags) {
		// figure out the flags
		var flagStrs = [];
		for (var f in Ci.nsIWebProgressListener) {
			if (!/a-z/.test(f)) { // if it has any lower case letters its not a flag
				if (flags & Ci.nsIWebProgressListener[f]) {
					flagStrs.push(f);
				}
			}
		}
		
		if (aRequest && flags & Ci.nsIWebProgressListener.STATE_STOP) {
			var contentWindow = getContentWindowFromNsiRequest(aRequest);
			if (contentWindow) {
				// console.log('onLocationChange', 'URI.spec:', aRequest.QueryInterface(Ci.nsIChannel).URI.spec, 'contentWindow:', contentWindow, 'flagStrs:', flagStrs);
			}
			// aRequest.cancel(Cr.NS_BINDING_ABORTED);
		}
		// var data = {
		// 	location: locationURI ? locationURI.spec : '',
		// 	windowId: webProgress.DOMWindowID,
		// 	parentWindowId: getParentWindowId(webProgress.DOMWindow),
		// 	flags,
		// };
	},
	QueryInterface: function QueryInterface(aIID) {
		if (aIID.equals(Ci.nsIWebProgressListener) || aIID.equals(Ci.nsISupportsWeakReference) || aIID.equals(Ci.nsISupports)) {
			return this;
		}

		throw Cr.NS_ERROR_NO_INTERFACE;
	}
};

function doPageUnloaders() {
	console.error('kicking of page unloaders');
	for (var i=0; i<PAGE_UNLOADERS.length; i++) {
		PAGE_UNLOADERS[i]();
		PAGE_UNLOADERS.splice(i, 1);
		i--;
	}
}

function domInsertOnReady(aContentWindow) {
	var aContentDocument = aContentWindow.document;
	
	myWebProgressListener.init();
	
	aContentWindow.addEventListener('beforeunload', function() {
		// aContentWindow.removeEventListener('unload', arguments.callee, false); // probably dont need this as on unload content whatever listeners it had are dead
		doPageUnloaders();
	}, false);
	
	PAGE_UNLOADERS.push(myWebProgressListener.uninit);
}

function doOnReady(aContentWindow) {

	if (aContentWindow.frameElement) {
		// console.warn('frame element DOMContentLoaded, so dont respond yet:', aContentWindow.location.href);
		return;
	} else {
		// parent window loaded (not frame)
		if (aContentWindow.location.hostname == CHROMESTORE_HOSTNAME) {
			// ok twitter page ready, lets make sure its not an error page
			// check if got error loading page:
			var webnav = aContentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
			var docuri = webnav.document.documentURI;
			// console.info('docuri:', docuri);
			if (docuri.indexOf('about:') == 0) {
				// twitter didnt really load, it was an error page
				console.log('twitter hostname page ready, but an error page loaded, so like offline or something:', aContentWindow.location, 'docuri:', docuri);
				// unregReason = 'error-loading';
				return;
			} else {
				// twitter actually loaded
				// twitterReady = true;
				console.error('ok twitter page ready, lets ensure page loaded finished');
				domInsertOnReady(aContentWindow);
				// ensureLoaded(aContentWindow); // :note: commented out as not needing content script right now
			}
		} else {
			// console.log('page ready, but its not twitter so do nothing:', uneval(aContentWindow.location));
			return;
		}
	}
}


// end - addon functionalities

// start - server/framescript comm layer
// sendAsyncMessageWithCallback - rev3
var bootstrapCallbacks = { // can use whatever, but by default it uses this
	// put functions you want called by bootstrap/server here
	destroySelf: function() {
		// console.log('content.location.hostname:', content.location.hostname);
		console.error('doing destroySelf');
		doPageUnloaders();
		console.error('doing fs unloaders');
		for (var i=0; i<FS_UNLOADERS.length; i++) {
			FS_UNLOADERS[i]();
			FS_UNLOADERS.splice(i, 1);
			i--;
		}
	}
};
const SAM_CB_PREFIX = '_sam_gen_cb_';
var sam_last_cb_id = -1;
function sendAsyncMessageWithCallback(aMessageManager, aGroupId, aMessageArr, aCallbackScope, aCallback) {
	sam_last_cb_id++;
	var thisCallbackId = SAM_CB_PREFIX + sam_last_cb_id;
	aCallbackScope = aCallbackScope ? aCallbackScope : bootstrap; // :todo: figure out how to get global scope here, as bootstrap is undefined
	console.error('adding to funcScope:', thisCallbackId, content.location.href);
	aCallbackScope[thisCallbackId] = function(aMessageArr) {
		delete aCallbackScope[thisCallbackId];
		aCallback.apply(null, aMessageArr);
	}
	aMessageArr.push(thisCallbackId);
	aMessageManager.sendAsyncMessage(aGroupId, aMessageArr);
}
var bootstrapMsgListener = {
	funcScope: bootstrapCallbacks,
	receiveMessage: function(aMsgEvent) {
		var aMsgEventData = aMsgEvent.data;
		console.error('framescript getting aMsgEvent, unevaled:', aMsgEventData);
		// aMsgEvent.data should be an array, with first item being the unfction name in this.funcScope
		
		var callbackPendingId;
		if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SAM_CB_PREFIX) == 0) {
			callbackPendingId = aMsgEventData.pop();
		}
		
		var funcName = aMsgEventData.shift();
		if (funcName in this.funcScope) {
			var rez_fs_call = this.funcScope[funcName].apply(null, aMsgEventData);
			
			if (callbackPendingId) {
				// rez_fs_call must be an array or promise that resolves with an array
				if (rez_fs_call.constructor.name == 'Promise') {
					rez_fs_call.then(
						function(aVal) {
							// aVal must be an array
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, aVal]);
						},
						function(aReason) {
							console.error('aReject:', aReason);
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aReason]]);
						}
					).catch(
						function(aCatch) {
							console.error('aCatch:', aCatch);
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aCatch]]);
						}
					);
				} else {
					// assume array
					contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, rez_fs_call]);
				}
			}
		}
		else { console.warn('funcName', funcName, 'not in scope of this.funcScope', this.funcScope, content.location.href) } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
		
	}
};
// end - server/framescript comm layer
// start - common helper functions
var gCFMM;
function contentMMFromContentWindow_Method2(aContentWindow) {
	if (!gCFMM) {
		gCFMM = aContentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
							  .getInterface(Ci.nsIDocShell)
							  .QueryInterface(Ci.nsIInterfaceRequestor)
							  .getInterface(Ci.nsIContentFrameMessageManager);
	}
	return gCFMM;

}
function Deferred() {
	try {
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
	} catch (ex) {
		console.log('Promise not available!', ex);
		throw new Error('Promise not available!');
	}
}
function jsonToDOM(json, doc, nodes) {

    var namespaces = {
        html: 'http://www.w3.org/1999/xhtml',
        xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
    };
    var defaultNamespace = namespaces.html;

    function namespace(name) {
        var m = /^(?:(.*):)?(.*)$/.exec(name);        
        return [namespaces[m[1]], m[2]];
    }

    function tag(name, attr) {
        if (Array.isArray(name)) {
            var frag = doc.createDocumentFragment();
            Array.forEach(arguments, function (arg) {
                if (!Array.isArray(arg[0]))
                    frag.appendChild(tag.apply(null, arg));
                else
                    arg.forEach(function (arg) {
                        frag.appendChild(tag.apply(null, arg));
                    });
            });
            return frag;
        }

        var args = Array.slice(arguments, 2);
        var vals = namespace(name);
        var elem = doc.createElementNS(vals[0] || defaultNamespace, vals[1]);

        for (var key in attr) {
            var val = attr[key];
            if (nodes && key == 'key')
                nodes[val] = elem;

            vals = namespace(key);
            if (typeof val == 'function')
                elem.addEventListener(key.replace(/^on/, ''), val, false);
            else
                elem.setAttributeNS(vals[0] || '', vals[1], val);
        }
        args.forEach(function(e) {
            try {
                elem.appendChild(
                                    Object.prototype.toString.call(e) == '[object Array]'
                                    ?
                                        tag.apply(null, e)
                                    :
                                        e instanceof doc.defaultView.Node
                                        ?
                                            e
                                        :
                                            doc.createTextNode(e)
                                );
            } catch (ex) {
                elem.appendChild(doc.createTextNode(ex));
            }
        });
        return elem;
    }
    return tag.apply(null, json);
}

function getContentWindowFromNsiRequest(aRequest) {

	var loadContext = null;

	if (aRequest instanceof Ci.nsIRequest) {
		try {
			loadContext = aRequest.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
		} catch (ex1) {
			// console.exception('aRequest loadGroup with notificationCallbacks but oculd not get nsIloadContext', ex1, 'aRequest:', aRequest);
			try {
				loadContext = aRequest.notificationCallbacks.getInterface(Ci.nsILoadContext);
			} catch (ex2) {
				// console.error('aRequest has notificationCallbacks but could not get nsILoadContext', ex2, 'aRequest:', aRequest);
			}
		}
	} else {
		console.warn('aRequest argument is not instance of nsIRequest, aRequest:', aRequest);
	}

	if (!loadContext) {
		return null;
	}

	return loadContext.associatedWindow;
}
// end - common helper functions

// start - load unload stuff
function fsUnloaded() {
	// framescript on unload
	console.log('fsInaly.js framworker unloading');
	bootstrapCallbacks.destroySelf();

}
function onPageReady(aEvent) {
	var aContentWindow = aEvent.target.defaultView;
	console.error('fsInaly.js page ready, content.location:', content.location.href, 'aContentWindow.location:', aContentWindow.location.href);
	doOnReady(aContentWindow);
}

function init() {
	console.error('in init');
		contentMMFromContentWindow_Method2(content).addMessageListener(core.addon.id, bootstrapMsgListener);
		FS_UNLOADERS.push(function() {
			contentMMFromContentWindow_Method2(content).removeMessageListener(core.addon.id, bootstrapMsgListener);
			L10N = null;
			core = null;
		});
		
		sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(content), core.addon.id, ['requestInit'], bootstrapMsgListener.funcScope, function(aData) {
			// core = aData.aCore;
			console.error('back in callback', aData, content.location.href);
			L10N = aData.aL10n
			console.error('set L10N to:', aData.aL10n, content.location.href)
			
			addEventListener('unload', fsUnloaded, false);
			FS_UNLOADERS.push(function() {
				removeEventListener('unload', fsUnloaded, false);
			});
			
			addEventListener('DOMContentLoaded', onPageReady, false);
			FS_UNLOADERS.push(function() {
				removeEventListener('DOMContentLoaded', onPageReady, false);
			});
			
			if (content.document.readyState == 'complete') {
				var fakeEvent = {
					target: {
						defaultView: content
					}
				}
				onPageReady(fakeEvent);
			}
		});
}

init();
// end - load unload stuff