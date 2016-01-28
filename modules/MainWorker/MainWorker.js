// Imports
importScripts('resource://gre/modules/osfile.jsm');
importScripts('resource://gre/modules/workers/require.js');

// Globals
var core = { // have to set up the main keys that you want when aCore is merged from mainthread in init
	addon: {
		path: {
			modules: 'chrome://chrome-store-foxified/content/modules/'
		}
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase()
	}
};

const gAmoApiKey = 'user:12084162:454';
const gAmoApiSecret = '47cd24d68dcd01f8a3854696ba0b2adc81d440db5f457a8bfe78ebfde2c0ebfa';

var OSStuff = {}; // global vars populated by init, based on OS

// Imports that use stuff defined in chrome
// I don't import ostypes_*.jsm yet as I want to init core first, as they use core stuff like core.os.isWinXP etc
// imported scripts have access to global vars on MainWorker.js
// importScripts(core.addon.path.modules + 'cutils.jsm');
// importScripts(core.addon.path.modules + 'ctypes_math.jsm');
importScripts(core.addon.path.modules + 'jsonwebtoken.js');
importScripts(core.addon.path.modules + 'jszip.min.js');

// Setup PromiseWorker
// SIPWorker - rev4 - https://gist.github.com/Noitidart/92e55a3f7761ed60f14c
var PromiseWorker = require('resource://gre/modules/workers/PromiseWorker.js');

// Instantiate AbstractWorker (see below).
var worker = new PromiseWorker.AbstractWorker()

worker.dispatch = function(method, args = []) {
  // Dispatch a call to method `method` with args `args`
  return self[method](...args);
};
worker.postMessage = function(...args) {
  // Post a message to the main thread
  self.postMessage(...args);
};
worker.close = function() {
  // Close the worker
  self.close();
};
worker.log = function(...args) {
  // Log (or discard) messages (optional)
  dump('Worker: ' + args.join(' ') + '\n');
};

// Connect it to message port.
// self.addEventListener('message', msg => worker.handleMessage(msg)); // this is what you do if you want PromiseWorker without mainthread calling ability
// start - setup SIPWorker
var WORKER = this;
self.addEventListener('message', function(aMsgEvent) { // this is what you do if you want SIPWorker mainthread calling ability
	var aMsgEventData = aMsgEvent.data;
	if (Array.isArray(aMsgEventData)) {
		console.error('worker got response for main thread calling SIPWorker functionality:', aMsgEventData)
		var funcName = aMsgEventData.shift();
		if (funcName in WORKER) {
			var rez_worker_call = WORKER[funcName].apply(null, aMsgEventData);
		}
		else { console.error('funcName', funcName, 'not in scope of WORKER') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
	} else {
		console.error('no this is just regular promise worker message');
		worker.handleMessage(aMsgEvent)
	}
});

const SIP_CB_PREFIX = '_a_gen_cb_';
const SIP_TRANS_WORD = '_a_gen_trans_';
var sip_last_cb_id = -1;
self.postMessageWithCallback = function(aPostMessageArr, aCB, aPostMessageTransferList) {
	var aFuncExecScope = WORKER;
	
	sip_last_cb_id++;
	var thisCallbackId = SIP_CB_PREFIX + sip_last_cb_id;
	aFuncExecScope[thisCallbackId] = function() {
		delete aFuncExecScope[thisCallbackId];
		console.log('in worker callback trigger wrap, will apply aCB with these arguments:', arguments);
		aCB.apply(null, arguments[0]);
	};
	aPostMessageArr.push(thisCallbackId);
	self.postMessage(aPostMessageArr, aPostMessageTransferList);
};
// end - setup SIPWorker

// Define a custom error prototype.
function MainWorkerError(name, msg) {
  this.msg = msg;
  this.name = name;
}
MainWorkerError.prototype.toMsg = function() {
	return {
		exn: 'MainWorkerError',
		msg: this.msg,
		name: this.name
	};
};
////// end of imports and definitions

function init(objCore) { // function name init required for SIPWorker
	//console.log('in worker init');
	
	// merge objCore into core
	// core and objCore is object with main keys, the sub props
	
	core = objCore;

	core.os.mname = core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name; // mname stands for modified-name	
	
	// OS Specific Init
	switch (core.os.name) {
		// case 'winnt':
		// case 'winmo':
		// case 'wince':
		// 		
		// 		OSStuff.hiiii = true;
		// 		
		// 	break;
		default:
			// do nothing special
	}
	
	// chrome store foxified custom init, get l10n packages
	formatStringFromName('addon_name', 'bootstrap')
	formatStringFromName('add_to_firefox', 'inlay')
	
	var rezInit = {};
	rezInit.l10n = _cache_formatStringFromName_packages;
	
	console.log('MainWorker init success');
	return rezInit; // required for SIPWorker
}

// Start - Addon Functionality
function jpmSign(aPathOrBlobToXpi, aAddonVersionInXpi, aAddonIdInXpi, aPlatofrmPathToDownloaDir, aAmoApiKey, aAmoApiSecret, aOptions={}) {
	// synchronus version for Workers
	// aPathOrBlobToXpi is a platform path to the xpi file on disk. OR an array buffer
	
	// RETURNS
		// success - path it was downloaded to
		// failture - throws error

	var cOptionsDefaults = {
		filename: null, // string if you dont want to use the autoGeneratedXpiFilename from AMO
		aAttnBarInstState: null, // specific to chrome store foxified
		aExtName: null // specific to chrome store foxified
	}
	
	// create File instance	
	var fileXpi;
	if (typeof(aPathOrBlobToXpi) == 'string') {
		// asume its a platform path
		fileXpi = new File(aPathOrBlobToXpi);
	} else {
		// assume its blob
		fileXpi = new File([aPathOrBlobToXpi], aOptions.filename + ' -- unsigned.xpi'); // doing = new File(aBlob) is not working, the xhr response is coming from amo saying "key of `upload` is missing"
	}
	console.log('fileXpi:', fileXpi);
	
	// create form data
	var formData = new FormData(); // Cc['@mozilla.org/files/formdata;1'].createInstance(Ci.nsIDOMFormData); // http://stackoverflow.com/q/25038292/1828637
	formData.append('Content-Type', 'multipart/form-data');
	formData.append('upload', fileXpi); // http://stackoverflow.com/a/24746459/1828637
	
	if (aOptions.aAttnBarInstState) {
		aOptions.aAttnBarInstState.aTxt = formatStringFromName('attn-signing-submitting', 'bootstrap', [aOptions.aExtName]);
		self.postMessage(['updateAttnBar', aOptions.aAttnBarInstState]);
	}
	
	var request_amoSubmit = xhr('https://addons.mozilla.org/api/v3/addons/' + encodeURIComponent(aAddonIdInXpi) + '/versions/' + aAddonVersionInXpi + '/', { // only on first time upload, the aAddonVersionInXpi can be anything
		method: 'PUT',
		data: formData,
		responseType: 'json',
		headers: {
			Authorization: 'JWT ' + generateToken(aAmoApiKey, aAmoApiSecret, getNowDateFromServer())
		}
	});
	
	var downloadIt = function(aDownloadSignedURL) {
		if (aOptions.aAttnBarInstState) {
			aOptions.aAttnBarInstState.aTxt = formatStringFromName('attn-signing-downloading', 'bootstrap', [aOptions.aExtName]);
			self.postMessage(['updateAttnBar', aOptions.aAttnBarInstState]);
		}
		
		var request_downloadSigned = xhr(aDownloadSignedURL, {
			responseType: 'arraybuffer',
			headers: {
				Authorization: 'JWT ' + generateToken(gAmoApiKey, gAmoApiSecret, getNowDateFromServer())
			}
		});
		
		if (request_downloadSigned.status == 200) {
			
			if (aOptions.aAttnBarInstState) {
				aOptions.aAttnBarInstState.aTxt = formatStringFromName('attn-installing', 'bootstrap', [aOptions.aExtName]);
				self.postMessage(['updateAttnBar', aOptions.aAttnBarInstState]);
			}
			
			var downloadSignedToPlatPath;
			if (aOptions.filename) {
				downloadSignedToPlatPath = OS.Path.join(aPlatofrmPathToDownloaDir, aOptions.filename)
			} else {
				var amoAutoGeneratedXpiFilename = aDownloadSignedURL.substring(aDownloadSignedURL.lastIndexOf('/') + 1, aDownloadSignedURL.indexOf('?src=api'));
				downloadSignedToPlatPath = OS.Path.join(aPlatofrmPathToDownloaDir, amoAutoGeneratedXpiFilename)
			}
			
			try {
				OS.File.writeAtomic(downloadSignedToPlatPath, new Uint8Array(request_downloadSigned.response));
			} catch(ex) {
				console.error('Failed writing signed XPI to disk:', ex);
				throw new MainWorkerError('Failed writing signed XPI to disk', ex);
			}
			
			return downloadSignedToPlatPath;
		} else {
			throw {
				msg: 'signing-failed: download failed',
				xhr: {
					status: request_downloadSigned.status,
					response: request_downloadSigned.response,
				}
			};
		}
	};
	
	var cumulativeCheckCount = 0;
	var waitForReview = function() {
		if (aOptions.aAttnBarInstState) {
			aOptions.aAttnBarInstState.aTxt = formatStringFromName('attn-signing-checking', 'bootstrap', [aOptions.aExtName]);
			self.postMessage(['updateAttnBar', aOptions.aAttnBarInstState]);
		}
		var request_fetchExisting = xhr('https://addons.mozilla.org/api/v3/addons/' + encodeURIComponent(aAddonIdInXpi) + '/versions/' + aAddonVersionInXpi + '/', {
			responseType: 'json',
			headers: {
				Authorization: 'JWT ' + generateToken(aAmoApiKey, aAmoApiSecret, getNowDateFromServer())
			}
		});
		
		console.log('request_fetchExisting.status:', request_fetchExisting.status);
		console.log('request_fetchExisting.response:', request_fetchExisting.response);
		
		if (request_fetchExisting.status == 200) {
			if (request_fetchExisting.response.files && request_fetchExisting.response.files.length == 1) {
				return downloadIt(request_fetchExisting.response.files[0].download_url);
			} else {
				console.error('addon existing, and successfully got exiswting status check, but files are not yet ready! not yet handled :todo:');
				// throw new Error('addon existing, and successfully got exiswting status check, but files are not yet ready! not yet handled :todo:');
				// wait 5 seconds then try again
				console.log('wait 5 seconds then try again as it has not been signed yet');
				
				// if (request_fetchExisting.response)
				if (Array.isArray(request_fetchExisting.response.files) && request_fetchExisting.response.processed && !request_fetchExisting.response.passed_review) {
					// throw new Error('failed validation of the signing process');
					throw {
						msg: 'signing-failed: validation failed',
						xhr: {
							status: request_fetchExisting.status,
							response: request_fetchExisting.response,
						}
					};
				}
				
				cumulativeCheckCount++;
				if (cumulativeCheckCount >= 12) {
					// throw new Error('not getting signed, probably not passing review');
					throw {
						msg: 'signing-failed: dev enforced timeout',
						xhr: {
							status: request_fetchExisting.status,
							response: request_fetchExisting.response,
						}
					};
				}
				console.log('cumulativeCheckCount:', cumulativeCheckCount);
				for (var i=10; i>=1; i--) {
					if (aOptions.aAttnBarInstState) {
						aOptions.aAttnBarInstState.aTxt = formatStringFromName('attn-signing-check-waiting', 'bootstrap', [aOptions.aExtName, i]);
						self.postMessage(['updateAttnBar', aOptions.aAttnBarInstState]);
					}
					setTimeoutSync(1000);
				}
				return waitForReview();
			}
		} else {
			// throw new Error('addon was existing, and when tried to fetch existing it failed with bad status code: ' + request_fetchExisting.status);
			throw {
				msg: 'signing-failed: check request failed',
				xhr: {
					status: request_fetchExisting.status,
					response: request_fetchExisting.response,
				}
			};
		}
	};
	
	console.log('request_amoSubmit.status:', request_amoSubmit.status, 'request_amoSubmit.response:', request_amoSubmit.response);
	if (request_amoSubmit.status == 409) {
		// the version already exists
		console.log('version already exists');
		return waitForReview();
	} else {
		if (request_amoSubmit.status == 201 || request_amoSubmit.status == 202) {
			// ok new submission went through
			console.log('ok new submission went through');
			return waitForReview();
		} else {
			throw {
				msg: 'signing-failed: submit failed',
				xhr: {
					status: request_amoSubmit.status,
					response: request_amoSubmit.response,
				}
			};
		}
	}
}

function getNowDateFromServer() {
	var requestStartDate = Date.now();
	
	var requestUnixNow = xhr('http://currenttimestamp.com/');

	var requestDuration = Date.now() - requestStartDate;
	
	console.log('request took:', requestDuration, 'ms');
	
	if (requestUnixNow.status != 200) {
		console.log('response status was bad, will wait 5 sec then try again');
		setTimeoutSync(5000);
		console.log('ok waitied, will now try');
		return getNowDateFromServer();
	}
	
	console.log('requestUnixNow.status:', requestUnixNow.status);
	// console.log('requestUnixNow.response:', requestUnixNow.response);
	
	var nowDateServerMatch = /current_time = (\d+);/.exec(requestUnixNow.response);
	if (!nowDateServerMatch) {
		throw new Error('failed to get now date from server');
	}
	console.log('nowDateServerMatch:', nowDateServerMatch);
	
	var nowDateServerUncompensated = parseInt(nowDateServerMatch[1]) * 1000;
	console.log('nowDateServerUncompensated:', nowDateServerUncompensated);
	
	var nowDateServer = nowDateServerUncompensated - requestDuration;
	
	console.log('nowDateServer:', nowDateServer);
	
	return nowDateServer;
}

function setTimeoutSync(aMilliseconds) {
	var breakDate = Date.now() + aMilliseconds;
	while (Date.now() < breakDate) {}
}

function doit(aExtId, aExtName, aPrefs, aAttnBarInstState) {
	try {
		console.log('in doit:', aExtId, aExtName);
		
		// step - download crx
		aAttnBarInstState.aTxt = formatStringFromName('attn-downloading', 'bootstrap', [aExtName]);
		self.postMessage(['updateAttnBar', aAttnBarInstState]); 
		
		var requestGoogle = xhr('https://clients2.google.com/service/update2/crx?response=redirect&prodversion=38.0&x=id%3D' + aExtId + '%26installsource%3Dondemand%26uc', {
			responseType: 'arraybuffer'
		});
		console.log('requestGoogle:', requestGoogle);
		var crxArrBuf = requestGoogle.response;
		
		// step - make crx a zip
		aAttnBarInstState.aTxt = formatStringFromName('attn-downloaded-converting', 'bootstrap', [aExtName]);
		self.postMessage(['updateAttnBar', aAttnBarInstState]);
		
		// var crxBlob = new Blob([new Uint8Array(requestGoogle.response)], {type: 'application/octet-binary'});
		var locOfPk = new Uint8Array(crxArrBuf.slice(0, 1000));
		// console.log('locOfPk:', locOfPk);
		for (var i=0; i<locOfPk.length; i++) {
			if (locOfPk[i] == 80 && locOfPk[i+1] == 75 && locOfPk[i+2] == 3 && locOfPk[i+3] == 4) {
				break;
			}
		}
		console.log('pk found at:', i);
		
		/* // testng if jszip works, yes it does
		var zip = new JSZip();
		zip.file("Hello.txt", "Hello World\n");
		var img = zip.folder("images");
		img.file("Hello.txt", "Hello World\n");
		var content = zip.generate({type:"uint8array"});
		// see FileSaver.js
		console.log('content:', content);
		
		var rez_write = OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'jszip.zip'), content);
		console.log('rez_write:', rez_write);
		*/
		
		var zipArrBuff = crxArrBuf.slice(i);
		// var zipUint8 = new Uint8Array(zipArrBuff);
		
		// step - modify the manifest.json and get the version of the addon from manifest.json
		var zipJSZIP = new JSZip(zipArrBuff);
		// console.log('zipJSZIP:', zipJSZIP);
		
		var manifestContents = zipJSZIP.file('manifest.json').asText();
		// console.log('manifestContents:', manifestContents);
		
		var manifestContentsJSON = JSON.parse(manifestContents.trim());
		console.log('manifestContentsJSON:', manifestContentsJSON);
		
		var xpiId = aExtId + '@chromeStoreFoxified';
		var xpiVersion = manifestContentsJSON.version;
		
		manifestContentsJSON.applications = {
			gecko: {
				id: xpiId
			}
		};
		
		// write/overwrite with modified manifest.json back to zip
		zipJSZIP.file('manifest.json', JSON.stringify(manifestContentsJSON));
		
		/*
		// step - save to disk. as its required to be saved before can install addon.
		var jszipUint8 = zipJSZIP.generate({type:'uint8array'});
		
		var xpiFileName = formatStringFromName('xpi-filename-template', 'bootstrap', [safedForPlatFS(aExtName), xpiVersion]);
		
		var xpiSavePath; // platform path to save the xpi at. need to save to install xpi.
		if (aPrefs.save) {
			// if user wants to save it to a specific path, just save it there
			xpiSavePath = OS.Path.join(aPrefs['save-path'], xpiFileName + '.xpi');
		} else {
			// save it to tempoary path
			xpiSavePath = OS.Path.join(OS.Constants.Path.tmpDir, xpiFileName + '.xpi');
		}
		
		console.log('xpiSavePath:', xpiSavePath);
		
		try {
			OS.File.writeAtomic(xpiSavePath, jszipUint8);
		} catch(ex) {
			console.error('Failed writing XPI to disk:', ex);
			throw new MainWorkerError('Failed writing XPI to disk', ex);
		}
		*/
		
		// sign and download xpi
		aAttnBarInstState.aTxt = formatStringFromName('attn-signing', 'bootstrap', [aExtName]);
		self.postMessage(['updateAttnBar', aAttnBarInstState]);
		
		var xpiFileName = formatStringFromName('xpi-filename-template', 'bootstrap', [safedForPlatFS(aExtName), xpiVersion]);
		var xpiSaveDir = aPrefs.save ? aPrefs['save-path'] : OS.Constants.Path.tmpDir;
		var xpiSavePath = OS.Path.join(xpiSaveDir, xpiFileName + '.xpi');
		
		var jszipBlob = zipJSZIP.generate({type:'blob'});
		console.log('xpiSavePath:', xpiSavePath);
		var rez_sign = jpmSign(jszipBlob, xpiVersion, xpiId, xpiSaveDir, gAmoApiKey, gAmoApiSecret, {
			filename: xpiFileName + '.xpi',
			aAttnBarInstState: aAttnBarInstState,
			aExtName: aExtName
		});
		
		if (rez_sign) {
			console.log('succesfully downloaded signed xpi to: ', rez_sign, 'xpiSavePath:', xpiSavePath);
			// rez_sign should === xpiSavePath
		} else {
			// should never get here, because if jpmSign fails it throws, but just in case ill put this here
			throw new Error('failed to sign and download');
		}
		
		// install xpi
		self.postMessageWithCallback(['installXpi', xpiSavePath], function(aStatusObj) { // :note: this is how to call WITH callback
			console.log('ok back from installXpi, aStatusObj:', aStatusObj);
			
			if (aStatusObj.status) {
				// installed
				if (aAttnBarInstState) {
					aAttnBarInstState.aTxt = formatStringFromName('attn-installed', 'bootstrap', [aExtName]);
					aAttnBarInstState.aPriority = 5;
					aAttnBarInstState.aHideClose = false;
					self.postMessage(['updateAttnBar', aAttnBarInstState]);
				}
			} else {
				if (aAttnBarInstState) {
					aAttnBarInstState.aTxt = formatStringFromName('attn-' + aStatusObj.reason, 'bootstrap', [aExtName], aStatusObj.reason);
					aAttnBarInstState.aPriority = aStatusObj.reason == 'addon-installed-userdisabled' ? 5 : 8;
					aAttnBarInstState.aHideClose = false;
					if (aStatusObj.reason == 'addon-installed-userdisabled') {
						self.postMessage(['updateAttnBar', aAttnBarInstState, 'addon-installed-userdisabled', aExtName, xpiId]);
					} else {
						self.postMessage(['updateAttnBar', aAttnBarInstState]);
					}
				}
			}
			
			// after install, if user has set aPrefs.save to false, then delete it
			if (!aPrefs.save) {
				OS.File.remove(xpiSavePath);
				console.log('ok because user had marked not to save file, deleted the file');
			}
		});
		
		// no return because no longer working with framescript-sendAsyncMessageWithCallback
			// return ['promise_rejected']; // must return array as this function is designed to return to framescript-sendAsyncMessageWithCallback callInPromiseWorker
	} catch(ex) {
		console.error('Something went wrong error is:', ex, uneval(ex));
		if (aAttnBarInstState) {
			aAttnBarInstState.aPriority = 9;
			aAttnBarInstState.aHideClose = false;
			if (ex.msg && ex.msg.indexOf('signing-failed') === 0) {
				aAttnBarInstState.aTxt = formatStringFromName('attn-failed-signing', 'bootstrap', [aExtName]);
				self.postMessage(['updateAttnBar', aAttnBarInstState, 'attn-failed-signing', aExtName, ex]);
			} else {
				aAttnBarInstState.aTxt = formatStringFromName('attn-something-went-wrong', 'bootstrap', [aExtName]);
				self.postMessage(['updateAttnBar', aAttnBarInstState]);
			}
		}
		if (aPrefs.save) {
			// saved file with name unsigned
			var uint8JSZIP = zipJSZIP.generate({type:'uint8array'});
			
			var unsignedXpiFileName = formatStringFromName('unsigned-xpi-filename-template', 'bootstrap', [safedForPlatFS(aExtName), xpiVersion]);
			var unsignedXpiSavePath = OS.Path.join(xpiSaveDir, unsignedXpiFileName + '.xpi');
			
			try {
				OS.File.writeAtomic(unsignedXpiSavePath, uint8JSZIP);
			} catch(OSFileError) {
				console.error('Failed writing unsigned XPI to disk:', ex);
				throw new MainWorkerError('Failed unsigned signed XPI to disk', OSFileError);
			}
		}
	}
}
// End - Addon Functionality

// start - common helper functions
function escapeRegExp(text) {
	if (!arguments.callee.sRE) {
		var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
		arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g'); // doesnt work in strict mode ```'use strict';```
	}
	return text.replace(arguments.callee.sRE, '\\$1');
}

// rev1 - https://gist.github.com/Noitidart/8684e8f9488bd0bdc3f8 - https://gist.github.com/Noitidart/8684e8f9488bd0bdc3f8
var gTxtDecodr; // holds TextDecoder if created
function getTxtDecodr() {
	if (!gTxtDecodr) {
		gTxtDecodr = new TextDecoder();
	}
	return gTxtDecodr;
}
var gTxtEncodr; // holds TextDecoder if created
function getTxtEncodr() {
	if (!gTxtEncodr) {
		gTxtEncodr = new TextEncoder();
	}
	return gTxtEncodr;
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

var _cache_formatStringFromName_packages = {}; // holds imported packages
function formatStringFromName(aKey, aLocalizedPackageName, aReplacements) {
	// depends on ```core.addon.path.locale``` it must be set to the path to your locale folder

	// aLocalizedPackageName is name of the .properties file. so mainworker.properties you would provide mainworker
	// aKey - string for key in aLocalizedPackageName
	// aReplacements - array of string
	
	if (!_cache_formatStringFromName_packages[aLocalizedPackageName]) {
		var packageStr = xhr(core.addon.path.locale + aLocalizedPackageName + '.properties').response;
		var packageJson = {};
		
		var propPatt = /(.*?)=(.*?)$/gm;
		var propMatch;
		while (propMatch = propPatt.exec(packageStr)) {
			packageJson[propMatch[1]] = propMatch[2];
		}
		
		_cache_formatStringFromName_packages[aLocalizedPackageName] = packageJson;
		
		console.log('packageJson:', packageJson);
	}
	
	var cLocalizedStr = _cache_formatStringFromName_packages[aLocalizedPackageName][aKey];
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}
	
	return cLocalizedStr;
}



// rev1 - https://gist.github.com/Noitidart/c4ab4ca10ff5861c720b
var jQLike = { // my stand alone jquery like functions
	serialize: function(aSerializeObject) {
		// https://api.jquery.com/serialize/

		// verified this by testing
			// http://www.w3schools.com/jquery/tryit.asp?filename=tryjquery_ajax_serialize
			// http://www.the-art-of-web.com/javascript/escape/

		var serializedStrArr = [];
		for (var cSerializeKey in aSerializeObject) {
			serializedStrArr.push(encodeURIComponent(cSerializeKey) + '=' + encodeURIComponent(aSerializeObject[cSerializeKey]));
		}
		return serializedStrArr.join('&');
	}
};

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
// end - common helper functions