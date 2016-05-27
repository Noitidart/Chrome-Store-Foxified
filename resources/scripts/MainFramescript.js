// Imports
const { interfaces:Ci, utils:Cu } = Components;

// Globals
var core = {addon: {id:'Chrome-Store-Foxified@jetpack'}}; // all that should be needed is core.addon.id, the rest is brought over on init
var gBsComm;
var gWinComm;
// var gSandbox;

const CHROMESTORE_HOSTNAME = 'chrome.google.com';

// start - pageLoader
var pageLoader = {
	// start - devuser editable
	IGNORE_FRAMES: true,
	IGNORE_LOAD: true,
	IGNORE_NONMATCH: false,
	matches: function(aHREF, aLocation) {
		// do your tests on aHREF, which is aLocation.href.toLowerCase(), return true if it matches
		return (aLocation.hostname == CHROMESTORE_HOSTNAME);
	},
	ready: function(aContentWindow) {
		// triggered on page ready
		// triggered for each frame if IGNORE_FRAMES is false
		// to test if frame do `if (aContentWindow.frameElement)`

		var contentWindow = aContentWindow;
		console.log('ready enter');

		// try {
		// 	if (gSandbox) { Cu.nukeSandbox(gSandbox) }
		// } catch(ignore) {}
		// var principal = contentWindow.location.origin; // docShell.chromeEventHandler.contentPrincipal;
		// console.error('principal:', principal);
		// gSandbox = Cu.Sandbox(principal, {
		// 	sandboxPrototype: content,
		// 	wantXrays: false
		// });
		// Services.scriptloader.loadSubScript(core.addon.path.scripts + 'MainContentscript.js?' + core.addon.cache_key, gSandbox, 'UTF-8');
		Services.scriptloader.loadSubScript(core.addon.path.scripts + 'MainContentscript.js?' + core.addon.cache_key, content, 'UTF-8');

		gWinComm = new contentComm(contentWindow); // cross-file-link884757009

		console.log('ready done');
	},
	load: function(aContentWindow) {}, // triggered on page load if IGNORE_LOAD is false
	error: function(aContentWindow, aDocURI) {
		// triggered when page fails to load due to error
		console.warn('hostname page ready, but an error page loaded, so like offline or something, aHref:', aContentWindow.location.href, 'aDocURI:', aDocURI);
	},
	readyNonmatch: function(aContentWindow) {
		gWinComm = null;
		// if (gSandbox) { Cu.nukeSandbox(gSandbox) }
	},
	loadNonmatch: function(aContentWindow) {},
	errorNonmatch: function(aContentWindow, aDocURI) {
		gWinComm = null;
		// if (gSandbox) { Cu.nukeSandbox(gSandbox) }
	},
	// not yet supported
	// timeout: function(aContentWindow) {
	// 	// triggered on timeout
	// },
	// timeoutNonmatch: function(aContentWindow) {
	// 	// triggered on timeout
	// },
	// end - devuser editable
	// start - BOILERLATE - DO NOT EDIT
	register: function() {
		// DO NOT EDIT - boilerplate
		addEventListener('DOMContentLoaded', pageLoader.onPageReady, false);
	},
	unregister: function() {
		// DO NOT EDIT - boilerplate
		removeEventListener('DOMContentLoaded', pageLoader.onPageReady, false);
	},
	onPageReady: function(e) {
		// DO NOT EDIT
		// boilerpate triggered on DOMContentLoaded
		// frames are skipped if IGNORE_FRAMES is true

		var contentWindow = e.target.defaultView;
		console.log('page ready, contentWindow.location.href:', contentWindow.location.href);

		// i can skip frames, as DOMContentLoaded is triggered on frames too
		if (pageLoader.IGNORE_FRAMES && contentWindow.frameElement) { return }

		var href = contentWindow.location.href.toLowerCase();
		if (pageLoader.matches(href, contentWindow.location)) {
			// ok its our intended, lets make sure its not an error page
			var webNav = contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
			var docURI = webNav.document.documentURI;
			// console.info('docURI:', docURI);

			if (docURI.indexOf('about:neterror') === 0) {
				pageLoader.error(contentWindow, docURI);
			} else {
				// our page ready without error

				if (!pageLoader.IGNORE_LOAD) {
					// i can attach the load listener here, and remove it on trigger of it, because for sure after this point the load will fire
					contentWindow.addEventListener('load', pageLoader.onPageLoad, false);
				}

				pageLoader.ready(contentWindow);
			}
		} else {
			if (!this.IGNORE_NONMATCH) {
				console.log('page ready, but its not match:', uneval(contentWindow.location));
				var webNav = contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
				var docURI = webNav.document.documentURI;
				// console.info('docURI:', docURI);

				if (docURI.indexOf('about:neterror') === 0) {
					pageLoader.errorNonmatch(contentWindow, docURI);
				} else {
					// our page ready without error

					if (!pageLoader.IGNORE_LOAD) {
						// i can attach the load listener here, and remove it on trigger of it, because for sure after this point the load will fire
						contentWindow.addEventListener('load', pageLoader.onPageLoadNonmatch, false);
					}

					pageLoader.readyNonmatch(contentWindow);
				}
			}
		}
	},
	onPageLoad: function(e) {
		// DO NOT EDIT
		// boilerplate triggered on load if IGNORE_LOAD is false
		var contentWindow = e.target.defaultView;
		contentWindow.removeEventListener('load', pageLoader.onPageLoad, false);
		pageLoader.load(contentWindow);
	},
	onPageLoadNonmatch: function(e) {
		// DO NOT EDIT
		// boilerplate triggered on load if IGNORE_LOAD is false
		var contentWindow = e.target.defaultView;
		contentWindow.removeEventListener('load', pageLoader.onPageLoadNonmatch, false);
		pageLoader.loadNonmatch(contentWindow);
	}
	// end - BOILERLATE - DO NOT EDIT
};
// end - pageLoader

function init() {
	gBsComm = new crossprocComm(core.addon.id);

	gBsComm.transcribeMessage('fetchCore', null, function(aCore, aComm) {
		core = aCore;
		console.log('ok updated core to:', core);

		addEventListener('unload', uninit, false);

		pageLoader.register(); // pageLoader boilerpate

		// try {
		// 	initAndRegisterAboutProfilist();
		// } catch(ignore) {} // its non-e10s so it will throw saying already registered

		if (pageLoader.matches(content.window.location.href.toLowerCase(), content.window.location)) {
			// for about pages, need to reload it, as it it loaded before i registered it
			// content.window.location.reload();

			// for non-about pages, i dont reload, i just initiate the ready of pageLoader
			if (content.document.readyState == 'interactive' || content.document.readyState == 'complete') {
				pageLoader.onPageReady({target:content.document}); // IGNORE_LOAD is true, so no need to worry about triggering load
			}
		}
	});
}

function uninit() { // link4757484773732
	// an issue with this unload is that framescripts are left over, i want to destory them eventually

	removeEventListener('unload', uninit, false);

	if (gWinComm) {
		gWinComm.postMessage('uninit');
	}

	// content.setTimeout(function() {
	// 	if (gSandbox) { Cu.nukeSandbox(gSandbox) }
	// }, 100); // because we want the gWinComm.postMessage('uninit') to trigger first

	crossprocComm_unregAll();

	pageLoader.unregister(); // pageLoader boilerpate

	// if (aboutFactory_profilist) {
	// 	aboutFactory_profilist.unregister();
	// }

}

// start - common helper functions
function Deferred() {
	this.resolve = null;
	this.reject = null;
	this.promise = new Promise(function(resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this));
	Object.freeze(this);
}
function genericReject(aPromiseName, aPromiseToReject, aReason) {
	var rejObj = {
		name: aPromiseName,
		aReason: aReason
	};
	console.error('Rejected - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
function genericCatch(aPromiseName, aPromiseToReject, aCaught) {
	var rejObj = {
		name: aPromiseName,
		aCaught: aCaught
	};
	console.error('Caught - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
// start - CommAPI
// common to all of these apis
	// whenever you use the message method, the method MUST not be a number, as if it is, then it is assumed it is a callback
	// if you want to do a transfer of data from a callback, if transferring is supported by the api, then you must wrapp it in aComm.CallbackTransferReturn

var gCFMM = this;
var gCommScope = {
	UNINIT_FRAMESCRIPT: function() { // link4757484773732
		// called by bootstrap - but i guess content can call it too, but i dont see it ever wanting to
		console.error('doing UNINIT_FRAMESCRIPT');
		uninit();
	},
	callInContent: function(aArg) {
		// called by bootstrap
		var {method, arg, wait} = aArg;
		// wait - bool - set to true if you want to wait for response from content, and then return it to bootstrap

		if (!gWinComm) {
			console.warn('no currently connected window');
			return 'no currently connected window';
		}
		var cWinCommCb = undefined;
		var rez = undefined;
		if (wait) {
			var deferred_callInContent = new Deferred();

			cWinCommCb = function(aVal) {
				deferred_callInContent.resolve(aVal);
			};

			rez = deferred_callInContent.promise;
		}
		gWinComm.postMessage(method, arg, undefined, cWinCommCb); // :todo: design a way so it can transfer to content. for sure though the info that comes here from bootstap is copied. but from here to content i should transfer if possible
		return rez;
	},
	callInBootstrap: function(aArg, aComm) {
		// called by content
		var {method, arg, wait} = aArg;
		// wait - bool - set to true if you want value returned to content // cross-file-link11192911

		var rez;
		var cbResolver = undefined;

		if (wait) {
			var deferred_callInBootstrap = new Deferred();
			cbResolver = function(aArg, aComm) {
				console.log('callInBootstrap transcribe complete, aArg:', aArg);
				deferred_callInBootstrap.resolve(aArg);
			}
			rez = deferred_callInBootstrap.promise;
		}
		gBsComm.transcribeMessage(method, arg, cbResolver);

		return rez;
	}
};

// start - CommAPI for bootstrap-framescript - bootstrap side - cross-file-link55565665464644
// message method - transcribeMessage - it is meant to indicate nothing can be transferred, just copied/transcribed to the other process
// first arg to transcribeMessage is a message manager, this is different from the other comm api's
var gCrossprocComms = [];
function crossprocComm_unregAll() {
	var l = gCrossprocComms.length;
	for (var i=0; i<l; i++) {
		gCrossprocComms[i].unregister();
	}
}
function crossprocComm(aChannelId) {
	// when a new framescript creates a crossprocComm on framscript side, it requests whatever it needs on init, so i dont offer a onBeforeInit or onAfterInit on bootstrap side

	var scope = gCommScope;
	this.nextcbid = 1; // next callback id // doesnt have to be defined on this. but i do it so i can check nextcbid from debug sources
	this.callbackReceptacle = {};

	gCrossprocComms.push(this);

	this.unregister = function() {
		removeMessageListener(aChannelId, this.listener);

		var l = gCrossprocComms.length;
		for (var i=0; i<l; i++) {
			if (gCrossprocComms[i] == this) {
				gCrossprocComms.splice(i, 1);
				break;
			}
		}
	};

	this.listener = {
		receiveMessage: function(e) {
			var messageManager = e.target.messageManager;
			var browser = e.target;
			var payload = e.data;
			console.log('bootstrap crossprocComm - incoming, payload:', payload); //, 'e:', e);
			// console.log('this in receiveMessage bootstrap:', this);

			if (payload.method) {
				if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in scope'); throw new Error('method of "' + payload.method + '" not in scope') }  // dev line remove on prod
				var rez_bs_call = scope[payload.method](payload.arg, messageManager, browser, this); // only on bootstrap side, they get extra 2 args
				if (payload.cbid) {
					if (rez_bs_call && rez_bs_call.constructor.name == 'Promise') {
						rez_bs_call.then(
							function(aVal) {
								console.log('Fullfilled - rez_bs_call - ', aVal);
								this.transcribeMessage(messageManager, payload.cbid, aVal);
							}.bind(this),
							genericReject.bind(null, 'rez_bs_call', 0)
						).catch(genericCatch.bind(null, 'rez_bs_call', 0));
					} else {
						console.log('calling transcribeMessage for callbck with args:', payload.cbid, rez_bs_call);
						this.transcribeMessage(messageManager, payload.cbid, rez_bs_call);
					}
				}
			} else if (!payload.method && payload.cbid) {
				// its a cbid
				this.callbackReceptacle[payload.cbid](payload.arg, messageManager, browser, this);
				delete this.callbackReceptacle[payload.cbid];
			} else {
				console.error('framesript - crossprocComm - invalid combination, payload:', payload);
				throw new Error('framesript - crossprocComm - invalid combination');
			}
		}.bind(this)
	};

	this.transcribeMessage = function(aMethod, aArg, aCallback) { // framescript version doesnt have messageManager arg
		// console.log('bootstrap sending message to framescript', aMethod, aArg);
		// aMethod is a string - the method to call in framescript
		// aCallback is a function - optional - it will be triggered when aMethod is done calling

		var cbid = null;
		if (typeof(aMethod) == 'number') {
			// this is a response to a callack waiting in framescript
			cbid = aMethod;
			aMethod = null;
		} else {
			if (aCallback) {
				cbid = this.nextcbid++;
				this.callbackReceptacle[cbid] = aCallback;
			}
		}

		gCFMM.sendAsyncMessage(aChannelId, {
			method: aMethod,
			arg: aArg,
			cbid
		});
	};

	addMessageListener(aChannelId, this.listener);
}
// end - CommAPI for bootstrap-framescript - bootstrap side - cross-file-link55565665464644
// start - CommAPI for framescript-content - bootstrap side - cross-file-link0048958576532536411
// message method - postMessage - content is in-process-content-windows, transferring works
// there is a bootstrap version of this that requires a feed of the ports.
function contentComm(aContentWindow, onHandshakeComplete) { // framescript version doesnt have aPort1/aPort2 args, it generates its own with a WebWorker
	// onHandshakeComplete is triggered when handshake is complete
	// when a new contentWindow creates a contentComm on contentWindow side, it requests whatever it needs on init, so i dont offer a onBeforeInit. I do offer a onHandshakeComplete which is similar to onAfterInit, but not exactly the same
	// no unregister for this really, as no listeners setup, to unregister you just need to GC everything, so just break all references to it

	var portWorker = new Worker(core.addon.path.scripts + 'contentComm_framescriptWorker.js');

	var aPort1;
	var aPort2;
	var handshakeComplete = false; // indicates this.postMessage will now work i think. it might work even before though as the messages might be saved till a listener is setup? i dont know i should ask
	var scope = gCommScope;

	this.nextcbid = 1; // next callback id // doesnt have to be defined on this. but i do it so i can check nextcbid from debug sources
	this.callbackReceptacle = {};
	this.CallbackTransferReturn = function(aArg, aTransfers) {
		// aTransfers should be an array
		this.arg = aArg;
		this.xfer = aTransfers;
	};

	this.listener = function(e) {
		var payload = e.data;
		console.log('framescript contentComm - incoming, payload:', uneval(payload)); //, 'e:', e);

		if (payload.method) {
			if (payload.method == 'contentComm_handshake_finalized') {
				handshakeComplete = false;
				if (onHandshakeComplete) {
					onHandshakeComplete(this);
				}
				return;
			}
			if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in scope'); throw new Error('method of "' + payload.method + '" not in scope') } // dev line remove on prod
			var rez_fs_call_for_win = scope[payload.method](payload.arg, this);
			console.log('rez_fs_call_for_win:', rez_fs_call_for_win);
			if (payload.cbid) {
				if (rez_fs_call_for_win && rez_fs_call_for_win.constructor.name == 'Promise') {
					rez_fs_call_for_win.then(
						function(aVal) {
							console.log('Fullfilled - rez_fs_call_for_win - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_fs_call_for_win', 0)
					).catch(genericCatch.bind(null, 'rez_fs_call_for_win', 0));
				} else {
					console.log('calling postMessage for callback with rez_fs_call_for_win:', rez_fs_call_for_win, 'this:', this);
					this.postMessage(payload.cbid, rez_fs_call_for_win);
				}
			}
		} else if (!payload.method && payload.cbid) {
			// its a cbid
			this.callbackReceptacle[payload.cbid](payload.arg, this);
			delete this.callbackReceptacle[payload.cbid];
		} else {
			throw new Error('invalid combination');
		}
	}.bind(this);



	this.postMessage = function(aMethod, aArg, aTransfers, aCallback) {

		// aMethod is a string - the method to call in framescript
		// aCallback is a function - optional - it will be triggered when aMethod is done calling
		if (aArg && aArg.constructor == this.CallbackTransferReturn) {
			// aTransfers is undefined
			// i needed to create CallbackTransferReturn so that callbacks can transfer data back
			aTransfers = aArg.xfer;
			aArg = aArg.arg;
		}
		var cbid = null;
		if (typeof(aMethod) == 'number') {
			// this is a response to a callack waiting in framescript
			cbid = aMethod;
			aMethod = null;
		} else {
			if (aCallback) {
				cbid = this.nextcbid++;
				this.callbackReceptacle[cbid] = aCallback;
			}
		}

		// return;
		aPort1.postMessage({
			method: aMethod,
			arg: aArg,
			cbid
		}, aTransfers ? aTransfers : undefined);
	}


	portWorker.onmessage = function(e) {
		portWorker.terminate();
		aPort1 = e.data.port1;
		aPort2 = e.data.port2;

		aPort1.onmessage = this.listener;

		aContentWindow.postMessage({
			topic: 'contentComm_handshake',
			port2: aPort2
		}, '*', [aPort2]);
	}.bind(this);

}
// end - CommAPI for framescript-content - framescript side - cross-file-link0048958576532536411
// end - CommAPI

// end - common helper functions

init(); // needs to go after the CommApi stuff, as otherwise i get gCrossprocComms is undefined
