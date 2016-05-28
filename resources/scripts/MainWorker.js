// Imports
importScripts('resource://gre/modules/osfile.jsm');

// Globals
var core;

var gBsComm;

function dummyForInstantInstantiate() {}
function init(objCore) {
	//console.log('in worker init');

	core = objCore;

	importScripts(core.addon.path.scripts + '3rd/hmac-sha256.js');
	importScripts(core.addon.path.scripts + '3rd/enc-base64-min.js');

	core.addon.path.storage = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage');

	// load all localization pacakages
	formatStringFromName('blah', 'main');
	core.addon.l10n = _cache_formatStringFromName_packages;

	setTimeoutSync(1000); // i want to delay 1sec to allow old framescripts to destroy

	return core;
}

// Start - Addon Functionality

function downloadCrx(extid, aComm) {
	// called by bootstrap
	xhrAsync('https://clients2.google.com/service/update2/crx?response=redirect&prodversion=38.0&x=id%3D' + extid + '%26installsource%3Dondemand%26uc', {
				responseType: 'arraybuffer'
	}, function(xhrArg) {
		var { request, ok } = xhrArg;
		console.log('xhrArg:', xhrArg);
		if (!ok || ok) {
			gBsComm.postMessage('sDispatch', {
				aMessageManager: '*',
				creator: 'updateStatus',
				applyarr: [
					extid,
					{
						downloading_crx_failed: formatStringFromName('downloading_crx_failed_server', 'main'),
						downloading_crx: false
					}
				],
				inbs: true
			});
		}
	});

}

self.onclose = function() {
	console.log('ok ready to terminate');
}

// End - Addon Functionality

// start - common helper functions
function setTimeoutSync(aMilliseconds) {
	var breakDate = Date.now() + aMilliseconds;
	while (Date.now() < breakDate) {}
}

// rev1 - _ff-addon-snippet-safedForPlatFS.js - https://gist.github.com/Noitidart/e6dbbe47fbacc06eb4ca
var _safedForPlatFS_pattWIN = /([\\*:?<>|\/\"])/g;
var _safedForPlatFS_pattNIXMAC = /\//g;
function safedForPlatFS(aStr, aOptions={}) {
	// short for getSafedForPlatformFilesystem - meaning after running this on it, you can safely use the return in a filename on this current platform
	// aOptions
	//	repStr - use this string, in place of the default repCharForSafePath in place of non-platform safe characters
	//	allPlatSafe - by default it will return a path safed for the current OS. Set this to true if you want to to get a string that can be used on ALL platforms filesystems. A Windows path is safe on all other platforms

	// set defaults on aOptions
	if (!('allPlatSafe' in aOptions)) {
		aOptions.allPlatSafe = false;
	}
	if (!('repStr' in aOptions)) {
		aOptions.repStr = '-';
	}

	var usePlat = aOptions.allPlatSafe ? 'winnt' : core.os.name; // a windows path is safe in all platforms so force that. IF they dont want all platforms then use the current platform
	switch (usePlat) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				return aStr.replace(_safedForPlatFS_pattWIN, aOptions.repStr);

			break;
		default:

				return aStr.replace(_safedForPlatFS_pattNIXMAC, aOptions.repStr);
	}
}
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

// rev1 - https://gist.github.com/Noitidart/ec1e6b9a593ec7e3efed
function xhr(aUrlOrFileUri, aOptions={}) {
	// console.error('in xhr!!! aUrlOrFileUri:', aUrlOrFileUri);

	// all requests are sync - as this is in a worker
	var aOptionsDefaults = {
		responseType: 'text',
		timeout: 0, // integer, milliseconds, 0 means never timeout, value is in milliseconds
		headers: null, // make it an object of key value pairs
		method: 'GET', // string
		data: null // make it whatever you want (formdata, null, etc), but follow the rules, like if aMethod is 'GET' then this must be null
	};
	validateOptionsObj(aOptions, aOptionsDefaults);

	var cRequest = new XMLHttpRequest();

	cRequest.open(aOptions.method, aUrlOrFileUri, false); // 3rd arg is false for synchronus

	if (aOptions.headers) {
		for (var h in aOptions.headers) {
			cRequest.setRequestHeader(h, aOptions.headers[h]);
		}
	}

	cRequest.responseType = aOptions.responseType;
	cRequest.send(aOptions.data);

	// console.log('response:', cRequest.response);

	// console.error('done xhr!!!');
	return cRequest;
}

// rev4 - https://gist.github.com/Noitidart/6d8a20739b9a4a97bc47
var _cache_formatStringFromName_packages = {}; // holds imported packages
function formatStringFromName(aKey, aLocalizedPackageName, aReplacements) {
	// depends on ```core.addon.path.locale``` it must be set to the path to your locale folder

	// aLocalizedPackageName is name of the .properties file. so mainworker.properties you would provide mainworker // or if it includes chrome:// at the start then it fetches that
	// aKey - string for key in aLocalizedPackageName
	// aReplacements - array of string

	// returns null if aKey not found in pacakage

	var packagePath;
	var packageName;
	if (aLocalizedPackageName.indexOf('chrome:') === 0 || aLocalizedPackageName.indexOf('resource:') === 0) {
		packagePath = aLocalizedPackageName;
		packageName = aLocalizedPackageName.substring(aLocalizedPackageName.lastIndexOf('/') + 1, aLocalizedPackageName.indexOf('.properties'));
	} else {
		packagePath = core.addon.path.locale + aLocalizedPackageName + '.properties';
		packageName = aLocalizedPackageName;
	}

	if (!_cache_formatStringFromName_packages[packageName]) {
		var packageStr = xhr(packagePath).response;
		var packageJson = {};

		var propPatt = /(.*?)=(.*?)$/gm;
		var propMatch;
		while (propMatch = propPatt.exec(packageStr)) {
			packageJson[propMatch[1]] = propMatch[2];
		}

		_cache_formatStringFromName_packages[packageName] = packageJson;

		console.log('packageJson:', packageJson);
	}

	var cLocalizedStr = _cache_formatStringFromName_packages[packageName][aKey];
	if (!cLocalizedStr) {
		return null;
	}
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}

	return cLocalizedStr;
}

function xhrAsync(aUrlOrFileUri, aOptions={}, aCallback) { // 052616
	// console.error('in xhr!!! aUrlOrFileUri:', aUrlOrFileUri);

	// all requests are sync - as this is in a worker
	var aOptionsDefaults = {
		responseType: 'text',
		timeout: 0, // integer, milliseconds, 0 means never timeout, value is in milliseconds
		headers: null, // make it an object of key value pairs
		method: 'GET', // string
		data: null // make it whatever you want (formdata, null, etc), but follow the rules, like if aMethod is 'GET' then this must be null
	};
	Object.assign(aOptionsDefaults, aOptions);
	aOptions = aOptionsDefaults;

	var request = new XMLHttpRequest();

	var handler = ev => {
		evf(m => request.removeEventListener(m, handler, !1));

		switch (ev.type) {
			case 'load':

					aCallback({request, ok:true});
					// if (xhr.readyState == 4) {
					// 	if (xhr.status == 200) {
					// 		deferredMain_xhr.resolve(xhr);
					// 	} else {
					// 		var rejObj = {
					// 			name: 'deferredMain_xhr.promise',
					// 			aReason: 'Load Not Success', // loaded but status is not success status
					// 			xhr: xhr,
					// 			message: xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']'
					// 		};
					// 		deferredMain_xhr.reject(rejObj);
					// 	}
					// } else if (xhr.readyState == 0) {
					// 	var uritest = Services.io.newURI(aStr, null, null);
					// 	if (uritest.schemeIs('file')) {
					// 		deferredMain_xhr.resolve(xhr);
					// 	} else {
					// 		var rejObj = {
					// 			name: 'deferredMain_xhr.promise',
					// 			aReason: 'Load Failed', // didnt even load
					// 			xhr: xhr,
					// 			message: xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']'
					// 		};
					// 		deferredMain_xhr.reject(rejObj);
					// 	}
					// }

				break;
			case 'abort':
			case 'error':
			case 'timeout':

					var result_details = {
						reason: ev.type,
						request,
						message: request.statusText + ' [' + ev.type + ':' + request.status + ']'
					};
					aCallback({request:request, ok:false, result_details});

				break;
			default:
				var result_details = {
					reason: 'unknown',
					request,
					message: request.statusText + ' [' + ev.type + ':' + request.status + ']'
				};
				aCallback({xhr:request, ok:false, result_details});
		}
	};


	var evf = f => ['load', 'error', 'abort', 'timeout'].forEach(f);
	evf(m => request.addEventListener(m, handler, false));

	request.open(aOptions.method, aUrlOrFileUri, true); // 3rd arg is false for async

	if (aOptions.headers) {
		for (var h in aOptions.headers) {
			request.setRequestHeader(h, aOptions.headers[h]);
		}
	}

	request.responseType = aOptions.responseType;
	request.send(aOptions.data);

	// console.log('response:', request.response);

	// console.error('done xhr!!!');

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
var gWorker = this;

// start - CommAPI for bootstrap-worker - worker side - cross-file-link5323131347
function workerComm() {

	var scope = gWorker;
	var firstMethodCalled = false;
	this.nextcbid = 1; // next callback id
	this.callbackReceptacle = {};
	this.CallbackTransferReturn = function(aArg, aTransfers) {
		// aTransfers should be an array
		this.arg = aArg;
		this.xfer = aTransfers;
	};
	this.postMessage = function(aMethod, aArg, aTransfers, aCallback) {
		// aMethod is a string - the method to call in bootstrap
		// aCallback is a function - optional - it will be triggered in scope when aMethod is done calling

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

		self.postMessage({
			method: aMethod,
			arg: aArg,
			cbid
		}, aTransfers ? aTransfers : undefined);
	};
	this.listener = function(e) {
		var payload = e.data;
		console.log('worker workerComm - incoming, payload:', payload); //, 'e:', e);

		if (payload.method) {
			if (!firstMethodCalled) {
				firstMethodCalled = true;
				if (payload.method != 'init' && scope.init) {
					this.postMessage('triggerOnAfterInit', scope.init(undefined, this));
				}
			}
			console.log('scope:', scope);
			if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in scope'); throw new Error('method of "' + payload.method + '" not in scope') } // dev line remove on prod
			var rez_worker_call_for_bs = scope[payload.method](payload.arg, this);
			console.log('rez_worker_call_for_bs:', rez_worker_call_for_bs);
			if (payload.cbid) {
				if (rez_worker_call_for_bs && rez_worker_call_for_bs.constructor.name == 'Promise') {
					rez_worker_call_for_bs.then(
						function(aVal) {
							console.log('Fullfilled - rez_worker_call_for_bs - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_worker_call_for_bs', 0)
					).catch(genericCatch.bind(null, 'rez_worker_call_for_bs', 0));
				} else {
					console.log('calling postMessage for callback with rez_worker_call_for_bs:', rez_worker_call_for_bs, 'this:', this);
					this.postMessage(payload.cbid, rez_worker_call_for_bs);
				}
			}
			// gets here on programtic init, as it for sure does not have a callback
			if (payload.method == 'init') {
				this.postMessage('triggerOnAfterInit', rez_worker_call_for_bs);
			}
		} else if (!payload.method && payload.cbid) {
			// its a cbid
			this.callbackReceptacle[payload.cbid](payload.arg, this);
			delete this.callbackReceptacle[payload.cbid];
		} else {
			console.error('worker workerComm - invalid combination');
			throw new Error('worker workerComm - invalid combination');
		}
	}.bind(this);

	self.onmessage = this.listener;
}
// end - CommAPI for bootstrap-worker - worker side - cross-file-link5323131347
// end - CommAPI
// end - common helper functions

// startup
 gBsComm = new workerComm();
