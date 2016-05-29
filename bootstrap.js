// Imports
const {interfaces: Ci, utils: Cu, classes:Cc} = Components;
Cu.import('resource://gre/modules/Services.jsm');

// start - beutify stuff
var gBeautify = {};
(function() {
	var { require } = Cu.import('resource://devtools/shared/Loader.jsm', {});
	var { jsBeautify } = require('devtools/shared/jsbeautify/src/beautify-js');
	gBeautify.js = jsBeautify;
}());
// end - beutify stuff

// Globals
var core = {
	addon: {
		name: 'Chrome Store Foxified',
		id: 'Chrome-Store-Foxified@jetpack',
		path: {
			name: 'chrome-store-foxified',
			//
			content: 'chrome://chrome-store-foxified/content/',
			locale: 'chrome://chrome-store-foxified/locale/',
			//
			modules: 'chrome://chrome-store-foxified/content/modules/',
			workers: 'chrome://chrome-store-foxified/content/modules/workers/',
			//
			resources: 'chrome://chrome-store-foxified/content/resources/',
			images: 'chrome://chrome-store-foxified/content/resources/images/',
			scripts: 'chrome://chrome-store-foxified/content/resources/scripts/',
			styles: 'chrome://chrome-store-foxified/content/resources/styles/',
			fonts: 'chrome://chrome-store-foxified/content/resources/styles/fonts/',
			pages: 'chrome://chrome-store-foxified/content/resources/pages/'
			// below are added by worker
			// storage: OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage')
		},
		pref_branch: 'extensions.Chrome-Store-Foxified@jetpack.',
		cache_key: Math.random() // set to version on release
	},
	os: {
		// // name: added by worker
		// // mname: added by worker
		// toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		// xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		// pid: Services.appinfo.processID,
		// version: Services.appinfo.version,
		// channel: Services.prefs.getCharPref('app.update.channel')
	}
};

var gFsComm;
var gWkComm;

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
		try {
			Services.prefs.clearUserPref('extensions.chrome-store-foxified@jetpack.donotsign');
		} catch(ignore) {}
	}
}

function startup(aData, aReason) {

	// // set preferences defaults
	// try {
	// 	Services.prefs.getBoolPref('extensions.chrome-store-foxified@jetpack.save');
	// } catch(ex) {
	// 	Services.prefs.setBoolPref('extensions.chrome-store-foxified@jetpack.save', true);
	// }
	// try {
	// 	Services.prefs.getCharPref('extensions.chrome-store-foxified@jetpack.save-path');
	// } catch (ex) {
	// 	Services.prefs.setCharPref('extensions.chrome-store-foxified@jetpack.save-path', OS.Constants.Path.desktopDir);
	// }
	// try {
	// 	Services.prefs.getBoolPref('extensions.chrome-store-foxified@jetpack.donotsign');
	// } catch(ex) {
	// 	Services.prefs.setBoolPref('extensions.chrome-store-foxified@jetpack.donotsign', false);
	// }

	gWkComm = new workerComm(core.addon.path.scripts + 'MainWorker.js', ()=>{return core}, function(aArg, aComm) {

		core = aArg;

		gFsComm = new crossprocComm(core.addon.id);

		Services.mm.loadFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key, true);

	});

	gWkComm.postMessage('dummyForInstantInstantiate');

}

function shutdown(aData, aReason) {

	if (aReason == APP_SHUTDOWN) { return }

	Services.mm.removeDelayedFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key);

	crossprocComm_unregAll();

	workerComm_unregAll();
}

// start - functions called by framescript
function fetchCore() {
	return core;
}
function callInWorker(aArg, aComm) {
	// called by framescript
	var {method, arg, wait} = aArg;
	// wait - bool - set to true if you want to wait for response from worker, and then return it to framescript

	var cWorkerCommCb = undefined;
	var rez = undefined;
	if (wait) {
		var deferred_callInWorker = new Deferred();

		cWorkerCommCb = function(aVal) {
			deferred_callInWorker.resolve(aVal);
		};

		rez = deferred_callInWorker.promise;
	}
	gWkComm.postMessage(method, arg, undefined, cWorkerCommCb); // :todo: design a way so it can transfer to content. for sure though the info that comes here from bootstap is copied. but from here to content i should transfer if possible
	return rez;
}
// end - functions called by framescript

// start - functions called by worker
function beautifyManifest(aJsStr) {
	return gBeautify.js(aJsStr);
}
function callInAllContent(aArg, aComm) {
	// called by worker
	var {method, arg} = aArg;

	// callback not allowed

	Services.mm.broadcastAsyncMessage(core.addon.id, {
		method: 'callInContent',
		arg: {method, arg}
	});

}
// rev2 - not yet commited to gist.github
function browseFile(aArg, aComm) {
	var { aDialogTitle, aOptions } = aArg
	if (!aOptions) { aOptions={} }

	// uses xpcom file browser and returns path to file selected
	// returns
		// filename
		// if aOptions.returnDetails is true, then it returns object with fields:
		//	{
		//		filepath: string,
		//		replace: bool, // only set if mode is modeSave
		//	}

	var cOptionsDefaults = {
		mode: 'modeOpen', // modeSave, modeGetFolder,
		filters: undefined, // else an array. in sets of two. so one filter would be ['PNG', '*.png'] or two filters woul be ['PNG', '*.png', 'All Files', '*']
		startDirPlatPath: undefined, // string - platform path to dir the dialog should start in
		returnDetails: false,
		async: false, // if set to true, then it wont block main thread while its open, and it will also return a promise
		win: undefined, // null for no parentWin, string for what you want passed to getMostRecentWindow, or a window object. NEGATIVE is special for NativeShot, it is negative iMon
		defaultString: undefined
	}

	validateOptionsObj(aOptions, cOptionsDefaults);

	var fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);

	var parentWin;
	if (aOptions.win === undefined) {
		parentWin = null;
	} else if (typeof(aOptions.win) == 'number') {
		// sepcial for nativeshot
		parentWin = colMon[Math.abs(aOptions.win)].E.DOMWindow;
	} else if (aOptions.win === null || typeof(aOptions.win) == 'string') {
		parentWin = Services.wm.getMostRecentWindow(aOptions.win);
	} else {
		parentWin = aOptions.win; // they specified a window probably
	}
	fp.init(parentWin, aDialogTitle, Ci.nsIFilePicker[aOptions.mode]);

	if (aOptions.filters) {
		for (var i=0; i<aOptions.filters.length; i=i+2) {
			fp.appendFilter(aOptions.filters[i], aOptions.filters[i+1]);
		}
	}

	if (aOptions.startDirPlatPath) {
		fp.displayDirectory = new nsIFile(aOptions.startDirPlatPath);
	}

	var fpDoneCallback = function(rv) {
		var retFP;
		if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) {

			if (aOptions.returnDetails) {
				var cBrowsedDetails = {
					filepath: fp.file.path
				};

				if (aOptions.mode == 'modeSave') {
					cBrowsedDetails.replace = (rv == Ci.nsIFilePicker.returnReplace);
				}

				retFP = cBrowsedDetails;
			} else {
				retFP = fp.file.path;
			}

		}// else { // cancelled	}
		if (aOptions.async) {
			console.error('async resolving');
			mainDeferred_browseFile.resolve(retFP);
		} else {
			return retFP;
		}
	}

	if (aOptions.defaultString) {
		fp.defaultString = aOptions.defaultString;
	}

	if (aOptions.async) {
		var mainDeferred_browseFile = new Deferred();
		fp.open({
			done: fpDoneCallback
		});
		return mainDeferred_browseFile.promise;
	} else {
		return fpDoneCallback(fp.show());
	}
}
// end - functions called by worker

//start - common helper functions
//rev1 - https://gist.github.com/Noitidart/c4ab4ca10ff5861c720b
function validateOptionsObj(aOptions, aOptionsDefaults) {
	// ensures no invalid keys are found in aOptions, any key found in aOptions not having a key in aOptionsDefaults causes throw new Error as invalid option
	for (var aOptKey in aOptions) {
		if (!(aOptKey in aOptionsDefaults)) {
			console.error('aOptKey of ' + aOptKey + ' is an invalid key, as it has no default value, aOptionsDefaults:', aOptionsDefaults, 'aOptions:', aOptions);
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

function Deferred() { // revFinal
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

var gBootstrap = this;

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

	var scope = gBootstrap;
	gCrossprocComms.push(this);

	this.unregister = function() {
		Services.mm.removeMessageListener(aChannelId, this.listener);

		var l = gCrossprocComms.length;
		for (var i=0; i<l; i++) {
			if (gCrossprocComms[i] == this) {
				gCrossprocComms.splice(i, 1);
				break;
			}
		}

		// kill framescripts
		Services.mm.broadcastAsyncMessage(aChannelId, {
			method: 'UNINIT_FRAMESCRIPT'
		});
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
				throw new Error('invalid combination');
			}
		}.bind(this)
	};
	this.nextcbid = 1; //next callback id
	this.transcribeMessage = function(aMessageManager, aMethod, aArg, aCallback) {
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

		// return;
		aMessageManager.sendAsyncMessage(aChannelId, {
			method: aMethod,
			arg: aArg,
			cbid
		});
	};
	this.callbackReceptacle = {};

	Services.mm.addMessageListener(aChannelId, this.listener);
}
// start - CommAPI for bootstrap-framescript - bootstrap side - cross-file-link55565665464644
// start - CommAPI for bootstrap-content - bootstrap side - cross-file-link0048958576532536411
// message method - postMessage - content is in-process-content-windows, transferring works
// there is a framescript version of this, because framescript cant get aPort1 and aPort2 so it has to create its own
function contentComm(aContentWindow, aPort1, aPort2, onHandshakeComplete) {
	// onHandshakeComplete is triggered when handshake is complete
	// when a new contentWindow creates a contentComm on contentWindow side, it requests whatever it needs on init, so i dont offer a onBeforeInit. I do offer a onHandshakeComplete which is similar to onAfterInit, but not exactly the same
	// no unregister for this really, as no listeners setup, to unregister you just need to GC everything, so just break all references to it

	var handshakeComplete = false; // indicates this.postMessage will now work i think. it might work even before though as the messages might be saved till a listener is setup? i dont know i should ask
	var scope = gBootstrap;

	this.CallbackTransferReturn = function(aArg, aTransfers) {
		// aTransfers should be an array
		this.arg = aArg;
		this.xfer = aTransfers;
	};

	this.listener = function(e) {
		var payload = e.data;
		console.log('bootstrap contentComm - incoming, payload:', payload); //, 'e:', e);

		if (payload.method) {
			if (payload.method == 'contentComm_handshake_finalized') {
				handshakeComplete = false;
				if (onHandshakeComplete) {
					onHandshakeComplete(this);
				}
				return;
			}
			if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in scope'); throw new Error('method of "' + payload.method + '" not in scope') } // dev line remove on prod
			var rez_bs_call_for_win = scope[payload.method](payload.arg, this);
			console.log('rez_bs_call_for_win:', rez_bs_call_for_win);
			if (payload.cbid) {
				if (rez_bs_call_for_win && rez_bs_call_for_win.constructor.name == 'Promise') {
					rez_bs_call_for_win.then(
						function(aVal) {
							console.log('Fullfilled - rez_bs_call_for_win - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_bs_call_for_win', 0)
					).catch(genericCatch.bind(null, 'rez_bs_call_for_win', 0));
				} else {
					console.log('calling postMessage for callback with rez_bs_call_for_win:', rez_bs_call_for_win, 'this:', this);
					this.postMessage(payload.cbid, rez_bs_call_for_win);
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

	this.nextcbid = 1; //next callback id

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

	aPort1.onmessage = this.listener;
	this.callbackReceptacle = {};

	aContentWindow.postMessage({
		topic: 'contentComm_handshake',
		port2: aPort2
	}, '*', [aPort2]);

}
// end - CommAPI for bootstrap-content - bootstrap side - cross-file-link0048958576532536411
// start - CommAPI for bootstrap-worker - bootstrap side - cross-file-link5323131347
// message method - postMessage
// on unregister, workers are terminated
var gWorkerComms = [];
function workerComm_unregAll() {
	var l = gWorkerComms.length;
	for (var i=0; i<l; i++) {
		gWorkerComms[i].unregister();
	}
}
function workerComm(aWorkerPath, onBeforeInit, onAfterInit, aWebWorker) {
	// limitations:
		// the first call is guranteed
		// devuser should never postMessage from worker with method name "triggerOnAfterInit" - this is reserved for programtic use
		// devuser should never postMessage from bootstrap with method name "init" - progmaticcaly this is automatically done in this.createWorker

	// worker is lazy loaded, it is not created until the first call. if you want instant instantiation, call this.createWorker() with no args
	// creates a ChromeWorker, unless aWebWorker is true

	// if onBeforeInit is set
		// if worker has `init` function
			// it is called by bootstrap, (progrmatically, i determine this by basing the first call to the worker)
	// if onBeforeInit is NOT set
		// if worker has `init` function
			// it is called by the worker before the first call to any method in the worker
	// onAfterInit is not called if `init` function does NOT exist in the worker. it is called by worker doing postMessage to bootstrap

	// onBeforeInit - args: this - it is a function, return a single var to send to init function in worker. can return CallbackTransferReturn if you want to transfer. it is run to build the data the worker should be inited with.
	// onAfterInit - args: aArg, this - a callback that happens after init is complete. aArg is return value of init from in worker. the first call to worker will happen after onAfterInit runs in bootstrap
	// these init features are offered because most times, workers need some data before starting off. and sometimes data is sent back to bootstrap like from init of MainWorker's
	// no featuere for prep term, as the prep term should be done in the `self.onclose = function(event) { ... }` of the worker
	gWorkerComms.push(this);

	var worker;
	var scope = gBootstrap;
	this.nextcbid = 1; //next callback id
	this.callbackReceptacle = {};
	this.CallbackTransferReturn = function(aArg, aTransfers) {
		// aTransfers should be an array
		this.arg = aArg;
		this.xfer = aTransfers;
	};
	this.createWorker = function(onAfterCreate) {
		// only triggered by postMessage when `var worker` has not yet been set
		worker = aWebWorker ? new Worker(aWorkerPath) : new ChromeWorker(aWorkerPath);
		worker.addEventListener('message', this.listener);

		if (onAfterInit) {
			var oldOnAfterInit = onAfterInit;
			onAfterInit = function(aArg, aComm) {
				oldOnAfterInit(aArg, aComm);
				if (onAfterCreate) {
					onAfterCreate(); // link39399999
				}
			}
		}

		var initArg;
		if (onBeforeInit) {
			initArg = onBeforeInit(this);
			this.postMessage('init', initArg); // i dont put onAfterCreate as a callback here, because i want to gurantee that the call of onAfterCreate happens after onAfterInit is triggered link39399999
		} else {
			// else, worker is responsible for calling init. worker will know because it keeps track in listener, what is the first postMessage, if it is not "init" then it will run init
			if (onAfterCreate) {
				onAfterCreate(); // as postMessage i the only one who calls this.createWorker(), onAfterCreate is the origianl postMessage intended by the devuser
			}
		}
	};
	this.postMessage = function(aMethod, aArg, aTransfers, aCallback) {
		// aMethod is a string - the method to call in framescript
		// aCallback is a function - optional - it will be triggered when aMethod is done calling

		if (!worker) {
			this.createWorker(this.postMessage.bind(this, aMethod, aArg, aTransfers, aCallback));
		} else {
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

			worker.postMessage({
				method: aMethod,
				arg: aArg,
				cbid
			}, aTransfers ? aTransfers : undefined);
		}
	};
	this.unregister = function() {

		var l = gWorkerComms.length;
		for (var i=0; i<l; i++) {
			if (gWorkerComms[i] == this) {
				gWorkerComms.splice(i, 1);
				break;
			}
		}

		if (worker) { // because maybe it was setup, but never instantiated
			worker.terminate();
		}

	};
	this.listener = function(e) {
		var payload = e.data;
		console.log('bootstrap workerComm - incoming, payload:', payload); //, 'e:', e);

		if (payload.method) {
			if (payload.method == 'triggerOnAfterInit') {
				if (onAfterInit) {
					onAfterInit(payload.arg, this);
				}
				return;
			}
			if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in scope'); throw new Error('method of "' + payload.method + '" not in scope') } // dev line remove on prod
			var rez_bs_call_for_worker = scope[payload.method](payload.arg, this);
			console.log('rez_bs_call_for_worker:', rez_bs_call_for_worker);
			if (payload.cbid) {
				if (rez_bs_call_for_worker && rez_bs_call_for_worker.constructor.name == 'Promise') {
					rez_bs_call_for_worker.then(
						function(aVal) {
							console.log('Fullfilled - rez_bs_call_for_worker - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_bs_call_for_worker', 0)
					).catch(genericCatch.bind(null, 'rez_bs_call_for_worker', 0));
				} else {
					console.log('calling postMessage for callback with rez_bs_call_for_worker:', rez_bs_call_for_worker, 'this:', this);
					this.postMessage(payload.cbid, rez_bs_call_for_worker);
				}
			}
		} else if (!payload.method && payload.cbid) {
			// its a cbid
			this.callbackReceptacle[payload.cbid](payload.arg, this);
			delete this.callbackReceptacle[payload.cbid];
		} else {
			console.error('bootstrap workerComm - invalid combination');
			throw new Error('bootstrap workerComm - invalid combination');
		}
	}.bind(this);
}
// end - CommAPI for bootstrap-worker - bootstrap side - cross-file-link5323131347
// end - CommAPI

// end - common helper functions
