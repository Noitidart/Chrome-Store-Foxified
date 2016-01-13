// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;

Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
const {TextDecoder, TextEncoder, OS} = Cu.import('resource://gre/modules/osfile.jsm', {});
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.importGlobalProperties(['Blob']);

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
		cache_key: Math.random() // set to version on release
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

const gAmoApiKey = 'user:5457039:387';
const gAmoApiSecret = 'bf65a053f9fb64b8910cc7eafcb8454dc41b5b0b5747c561977410fbde0ad6df';

var bootstrap;

// Lazy Imports
const myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'hph', function () { return Cc['@mozilla.org/network/protocol;1?name=http'].getService(Ci.nsIHttpProtocolHandler); });
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'bootstrap.properties?' + core.addon.cache_key); /* Randomize URI during development to avoid caching - bug 719376 */ });
XPCOMUtils.defineLazyGetter(myServices, 'sb_ti', function () { return Services.strings.createBundle(core.addon.path.locale + 'inlay.properties?' + core.addon.cache_key); /* Randomize URI during development to avoid caching - bug 719376 */ });

// START - Addon Functionalities					

// END - Addon Functionalities

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
	extendCore();
	
	Services.scriptloader.loadSubScript(core.addon.path.content + 'modules/jsonwebtoken.js', bootstrap);
	
	var token = generateToken(gAmoApiKey, gAmoApiSecret);
	console.error('ok my token:', token);
	
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
	
	var aTimer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
	aTimer.initWithCallback({
		notify: function() {
			console.error('ok starting up adding');
			// register framescript listener
			Services.mm.addMessageListener(core.addon.id, fsMsgListener);
			
			// register framescript injector
			Services.mm.loadFrameScript(core.addon.path.scripts + 'fsInlay.js?' + core.addon.cache_key, true);
		}
	}, 1000, Ci.nsITimer.TYPE_ONE_SHOT);
	
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) { return }
	
	// unregister framescript injector
	Services.mm.removeDelayedFrameScript(core.addon.path.scripts + 'fsInlay.js?' + core.addon.cache_key);
	
	// kill framescripts
	Services.mm.broadcastAsyncMessage(core.addon.id, ['destroySelf']);
	
	// unregister framescript listener
	Services.mm.removeMessageListener(core.addon.id, fsMsgListener);
}

// start - server/framescript comm layer
// functions for framescripts to call in main thread
var fsFuncs = { // can use whatever, but by default its setup to use this
	requestInit: function(aMsgEvent) {
		// start - l10n injection into fs
		
		console.error('in requestinit server side');
		var l10n = {};
		// get all the localized strings into ng
		var l10ns = myServices.sb_ti.getSimpleEnumeration();
		while (l10ns.hasMoreElements()) {
			var l10nProp = l10ns.getNext();
			var l10nPropEl = l10nProp.QueryInterface(Ci.nsIPropertyElement);
			// doing console.log(propEl) shows the object has some fields that interest us

			var l10nPropKey = l10nPropEl.key;
			var l10nPropStr = l10nPropEl.value;

			l10n[l10nPropKey] = l10nPropStr;
		}
		// end - l10n injection into fs
		
		return [{
			aCore: core,
			aL10n: l10n
		}];
	},
	actOnExt: function(aExtId, aExtName) {
		console.log('in actOnExt server side, aExtId:', aExtId, 'aExtName:', aExtName);
		var deferredMain_actOnExt = new Deferred();
		
		var tmpFileName;
		if (aExtName) {
			tmpFileName = getSafedForOSPath(aExtName) + ' ' + myServices.sb.GetStringFromName('xpi_suffix'); //'foxify_this-' + new Date().getTime();
		} else {
			tmpFileName = 'foxified-' + new Date().getTime()  + ' ' +  myServices.sb.GetStringFromName('xpi_suffix');
		}
		var tmpFilePath = OS.Path.join(Services.prefs.getCharPref('extensions.chrome-store-foxified@jetpack.save-path'), tmpFileName + '.xpi');
		
		var crxBlob;
		var xpi;
		
		var step1 = function() {
			// fetch file
			
			console.log('aExtId:', aExtId);
			console.info('full download url:', 'https://clients2.google.com/service/update2/crx?response=redirect&prodversion=38.0&x=id%3D' + aExtId + '%26installsource%3Dondemand%26uc');
			var promise_xhr = xhr('https://clients2.google.com/service/update2/crx?response=redirect&prodversion=38.0&x=id%3D' + aExtId + '%26installsource%3Dondemand%26uc', {
				aResponseType: 'arraybuffer'
			});
			promise_xhr.then(
				function(aVal) {
					console.log('Fullfilled - promise_xhr - ', aVal);
					// start - do stuff here - promise_xhr
					step2(aVal.response);
					// end - do stuff here - promise_xhr
				},
				function(aReason) {
					var rejObj = {name:'promise_xhr', aReason:aReason};
					console.warn('Rejected - promise_xhr - ', rejObj);
					deferredMain_actOnExt.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_xhr', aCaught:aCaught};
					console.error('Caught - promise_xhr - ', rejObj);
					deferredMain_actOnExt.reject(rejObj);
				}
			);
		};
		
		var step2 = function(aArrBuf) {
			// write to disk
			// figure out how much to strip from crx
						/*
			crxBlob = new Blob([new Uint8Array(aArrBuf)], {type: 'application/octet-binary'});
			step3();
			*/
			var locOfPk = new Uint8Array(aArrBuf.slice(0, 1000));
			// console.log('locOfPk:', locOfPk);
			for (var i=0; i<locOfPk.length; i++) {
				if (locOfPk[i] == 80 && locOfPk[i+1] == 75 && locOfPk[i+2] == 3 && locOfPk[i+3] == 4) {
					break;
				}
			}
			console.log('pk found at:', i);
			var promise_write = OS.File.writeAtomic(tmpFilePath, new Uint8Array(aArrBuf.slice(i)), {
				tmpPath: tmpFilePath + '.tmp'
			});
			promise_write.then(
				function(aVal) {
					console.log('Fullfilled - promise_write - ', aVal);
					// start - do stuff here - promise_write
					step3();
					// end - do stuff here - promise_write
				},
				function(aReason) {
					var rejObj = {name:'promise_write', aReason:aReason};
					console.warn('Rejected - promise_write - ', rejObj);
					deferredMain_actOnExt.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_write', aCaught:aCaught};
					console.error('Caught - promise_write - ', rejObj);
					deferredMain_actOnExt.reject(rejObj);
				}
			);
		};
		
		var step3 = function() {
			// modify the manifest.json
			
			
			var ZipFileReader = CC('@mozilla.org/libjar/zip-reader;1', 'nsIZipReader', 'open');
			var ZipFileWriter = CC('@mozilla.org/zipwriter;1', 'nsIZipWriter', 'open');
			var ScriptableInputStream = CC('@mozilla.org/scriptableinputstream;1', 'nsIScriptableInputStream', 'init');
			var manifestJson;
			
			var handleEntry = function(name) {
				try {
					var entry = this.getEntry(name);
					if (entry.isDirectory) {
						console.log(name + ' is directory, no stream to read');
						return false;
					}
					var stream = new ScriptableInputStream(this.getInputStream(name));
					try {
						// Use readBytes to get binary data, read to read a (null-terminated) string
						var contents = stream.readBytes(entry.realSize);
						console.log('Contents of ' + name, contents);
						manifestJson = JSON.parse(contents.trim());
						console.log('manifestJson:', manifestJson);

						/*
						if (manifestJson.name.indexOf('_MSG') > -1) {
							manifestJson.name = aExtName;
						}
						*/
						manifestJson.applications = {
							gecko: {
								id: aExtId + '@mozWebExtension.org'
							}
						};
					} finally {
						stream.close();
					}
					return true;
				} catch (ex) {
					console.warn('Failed to read ' + name);
				}
				return false;
			};

			xpi = new FileUtils.File(tmpFilePath);
			var reader = new ZipFileReader(xpi);
			try {
				var entries = reader.findEntries('*');
				while (entries.hasMore()) {
					var name = entries.getNext();
					if (name == 'manifest.json') {
						if (handleEntry.call(reader, name)) {
							console.log('Handled entry ' + name);
							break;
						}
					}
				}
			} finally {
				reader.close();
			}

			
			console.log('will now write, name:', name);
			var writer = new ZipFileWriter(xpi, 0x04);
			try {
				console.log('removing entry');
				writer.removeEntry(name, false);
				console.log('removed');
				var is = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
				console.log('stringify it');
				is.data = JSON.stringify(manifestJson);
				console.log('stringified');
				console.log('adding entry');
				writer.addEntryStream(name, Date.now(), Ci.nsIZipWriter.COMPRESSION_FASTEST, is, false);
				console.log('added');
			} catch (ex) {
				console.warn('ex:', ex);
			} finally {
				writer.close();
			}
			
			step4();
			
			/*
			myServices.zip.createReader(
				new myServices.zip.BlobReader(crxBlob),
				function(reader) {

					// get all entries from the zip
					reader.getEntries(
						function(entries) {
							if (entries.length) {
								// get first entry content as text
								entries[0].getData(
									new myServices.zip.TextWriter(),
									function(text) {
										// text contains the entry data as a String
										console.log(text);

										// close the zip reader
										reader.close(function() {
											console.info('onclose callback');
										});

									},
									function(current, total) {
										console.info('onprogress callback', current, total);
									}
								);
							} else {
								console.error('no entries!');
							}
						}
					);
				},
				function(error) {
					console.error('onerror callback, error:', error);
				}
			);
			*/
		};
		
		var step4 = function() {
			// install to firefox
			var postInstallEnded = function() {
				if (!Services.prefs.getBoolPref('extensions.chrome-store-foxified@jetpack.save')) {
				   // delete it
				   console.log('ok deleting it');
				   var promise_del = OS.File.remove(tmpFilePath);
					promise_del.then(
						function(aVal) {
							console.log('Fullfilled - promise_del - ', aVal);
							// start - do stuff here - promise_del
							// end - do stuff here - promise_del
						},
						function(aReason) {
							var rejObj = {name:'promise_del', aReason:aReason};
							console.warn('Rejected - promise_del - ', rejObj);
							// deferred_createProfile.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_del', aCaught:aCaught};
							console.error('Caught - promise_del - ', rejObj);
							// deferred_createProfile.reject(rejObj);
						}
					);
			   }
			};
			if (Services.vc.compare('45.0a1', core.firefox.version) == 1) {
				var doPre45_install = function() {
					var installListener = {
						onInstallEnded: function(aInstall, aAddon) {
						   var str = [];
						   //str.push('"' + aAddon.name + '" Install Ended!');
						   // jsWin.addMsg('"' + aAddon.name + '" Install Ended...');
						   if (aInstall.state != AddonManager.STATE_INSTALLED) {
							   //str.push('aInstall.state: ' + aInstall.state)
							   //jsWin.addMsg('aInstall.state: ' + aInstall.state);
							   // jsWin.addMsg('<red>Addon Install Failed - Status Code: ' + aInstall.state);
							   deferredMain_actOnExt.resolve([true, myServices.sb.GetStringFromName('addon-install-failed') + aInstall.state]);
						   } else {
							   //str.push('aInstall.state: Succesfully Installed')
							   //jsWin.addMsg('aInstall.state: Succesfully Installed')
							   // jsWin.addMsg('<green>Addon Succesfully Installed!');
							   deferredMain_actOnExt.resolve([true, myServices.sb.GetStringFromName('addon-installed')]);
						   }
						   if (aAddon.appDisabled) {
							   //str.push('appDisabled: ' + aAddon.appDisabled);
							   // jsWin.addMsg('<red>Addon is disabled by application');
							   deferredMain_actOnExt.resolve([true, myServices.sb.GetStringFromName('addon-installed-appdisabled')]);
						   }
						   if (aAddon.userDisabled) {
							   //str.push('userDisabled: ' + aAddon.userDisabled);
							   //jsWin.addMsg('userDisabled: ' + aAddon.userDisabled);
							   // jsWin.addMsg('<orange>Addon is currently disabled - go to addon manager to enable it');
							   deferredMain_actOnExt.resolve([true, myServices.sb.GetStringFromName('addon-installed-userdisabled')]);
						   }
						   if (aAddon.pendingOperations != AddonManager.PENDING_NONE) {
							   //str.push('NEEDS RESTART: ' + aAddon.pendingOperations);
							   //jsWin.addMsg('NEEDS RESTART: ' + aAddon.pendingOperations);
							   // jsWin.addMsg('Needs to RESTART to complete install...');
							   deferredMain_actOnExt.resolve([true, 'this should never happen, webexts are restartless']);
						   }
						   //alert(str.join('\n'));
						   aInstall.removeListener(installListener);
						   
						   postInstallEnded();
						},
						onInstallStarted: function(aInstall) {
							// jsWin.addMsg('"' + aInstall.addon.name + '" Install Started...');
						}
					};
					
					AddonManager.getInstallForFile(xpi, function(aInstall) {
					  // aInstall is an instance of AddonInstall
						aInstall.addListener(installListener);
						aInstall.install(); //does silent install
						// AddonManager.installAddonsFromWebpage('application/x-xpinstall', Services.wm.getMostRecentWindow('navigator:browser').gBrowser.selectedBrowser, null, [aInstall]); //does regular popup install
					}, 'application/x-xpinstall');
				};
				
				// meaning the current version is less than 45.0a1
				if (Services.prefs.getBoolPref('xpinstall.signatures.required') == true) {
					var rez_confirm = Services.prompt.confirm(Services.wm.getMostRecentWindow('navigator:browser'), myServices.sb.GetStringFromName('addon_name'), myServices.sb.GetStringFromName('request-pref-toggle'));
					if (rez_confirm) {
						Services.prefs.setBoolPref('xpinstall.signatures.required', false);
						doPre45_install();
					} else {
						deferredMain_actOnExt.resolve([true, myServices.sb.GetStringFromName('addon-install-failed-signatures')]);
					}
				} else {
					doPre45_install();
				}
			} else {
				try {
					var promise_tempInstall = AddonManager.installTemporaryAddon(xpi);
					promise_tempInstall.then(
						function(aVal) {
							console.log('Fullfilled - promise_tempInstall - ', aVal, 'arguments:', arguments);
							deferredMain_actOnExt.resolve([true, myServices.sb.GetStringFromName('addon-installed')]);
							postInstallEnded();
						},
						function(aReason) {
							var rejObj = {
								name: 'promise_tempInstall',
								aReason: aReason
							};
							console.error('Rejected - promise_tempInstall - ', rejObj);
							deferredMain_actOnExt.resolve([true, myServices.sb.GetStringFromName('addon-install-failed') + rejObj.aReason.message]);
							postInstallEnded();
						}
					).catch(
						function(aCaught) {
							var rejObj = {
								name: 'promise_tempInstall',
								aCaught: aCaught
							};
							console.error('Caught - promise_tempInstall - ', rejObj);
							Services.prompt.alert(null, 'Error', "devleoper error!!! Error while installing the addon: see browser console!!\n");
						}
					);
				} catch (e) {
					Services.prompt.alert(null, 'Error', "devleoper error!!! Error while installing the addon:\n" + e.message + "\n");
					throw e;
				}
			}
		};
		
		step1();
		
		return deferredMain_actOnExt.promise;
	}
};
var fsMsgListener = {
	funcScope: fsFuncs,
	receiveMessage: function(aMsgEvent) {
		var aMsgEventData = aMsgEvent.data;
		console.log('fsMsgListener getting aMsgEventData:', aMsgEventData, 'aMsgEvent:', aMsgEvent);
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
							console.error('aReject:', aReason);
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aReason]]);
						}
					).catch(
						function(aCatch) {
							console.error('aCatch:', aCatch);
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aCatch]]);
						}
					);
				} else {
					// assume array
					console.warn('ok responding to callback id:', callbackPendingId, aMsgEvent.target);
					aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, rez_parentscript_call]);
				}
			}
		}
		else { console.warn('funcName', funcName, 'not in scope of this.funcScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
		
	}
};
// end - server/framescript comm layer

// start - common helper functions
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
		console.error('Promise not available!', ex);
		throw new Error('Promise not available!');
	}
}

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
function xhr(aStr, aOptions={}) {
	// update 092315 - added support for aMethod when posting data, so like we can use PUT and still post data
	// update 092315 - also am now testing if aOptions.aPostData is a key value pair by testing aOptions.aPostData.consturctor.name == 'Object'. if its Object then i assume its key  value pair, else its a blob or something so i just do xhr.send with it
	// update 072615 - added support for aOptions.aMethod
	// currently only setup to support GET and POST
	// does an async request
	// aStr is either a string of a FileURI such as `OS.Path.toFileURI(OS.Path.join(OS.Constants.Path.desktopDir, 'test.png'));` or a URL such as `http://github.com/wet-boew/wet-boew/archive/master.zip`
	// Returns a promise
		// resolves with xhr object
		// rejects with object holding property "xhr" which holds the xhr object
	
	/*** aOptions
	{
		aLoadFlags: flags, // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/NsIRequest#Constants
		aTiemout: integer (ms)
		isBackgroundReq: boolean, // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#Non-standard_properties
		aResponseType: string, // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#Browser_Compatibility
		aPostData: string
	}
	*/
	
	var aOptions_DEFAULT = {
		aLoadFlags: Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_BYPASS_CACHE | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING,
		aPostData: null,
		aResponseType: 'text',
		isBackgroundReq: true, // If true, no load group is associated with the request, and security dialogs are prevented from being shown to the user
		aTimeout: 0, // 0 means never timeout, value is in milliseconds
		Headers: null
	}
	
	for (var opt in aOptions_DEFAULT) {
		if (!(opt in aOptions)) {
			aOptions[opt] = aOptions_DEFAULT[opt];
		}
	}
	
	// Note: When using XMLHttpRequest to access a file:// URL the request.status is not properly set to 200 to indicate success. In such cases, request.readyState == 4, request.status == 0 and request.response will evaluate to true.
	
	var deferredMain_xhr = new Deferred();
	console.log('here222');
	var xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);

	var handler = ev => {
		evf(m => xhr.removeEventListener(m, handler, !1));

		switch (ev.type) {
			case 'load':
			
					if (xhr.readyState == 4) {
						if (xhr.status == 200) {
							deferredMain_xhr.resolve(xhr);
						} else {
							var rejObj = {
								name: 'deferredMain_xhr.promise',
								aReason: 'Load Not Success', // loaded but status is not success status
								xhr: xhr,
								message: xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']'
							};
							deferredMain_xhr.reject(rejObj);
						}
					} else if (xhr.readyState == 0) {
						var uritest = Services.io.newURI(aStr, null, null);
						if (uritest.schemeIs('file')) {
							deferredMain_xhr.resolve(xhr);
						} else {
							var rejObj = {
								name: 'deferredMain_xhr.promise',
								aReason: 'Load Failed', // didnt even load
								xhr: xhr,
								message: xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']'
							};
							deferredMain_xhr.reject(rejObj);
						}
					}
					
				break;
			case 'abort':
			case 'error':
			case 'timeout':
				
					var rejObj = {
						name: 'deferredMain_xhr.promise',
						aReason: ev.type[0].toUpperCase() + ev.type.substr(1),
						xhr: xhr,
						message: xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']'
					};
					deferredMain_xhr.reject(rejObj);
				
				break;
			default:
				var rejObj = {
					name: 'deferredMain_xhr.promise',
					aReason: 'Unknown',
					xhr: xhr,
					message: xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']'
				};
				deferredMain_xhr.reject(rejObj);
		}
	};

	var evf = f => ['load', 'error', 'abort'].forEach(f);
	evf(m => xhr.addEventListener(m, handler, false));

	if (aOptions.isBackgroundReq) {
		xhr.mozBackgroundRequest = true;
	}
	
	if (aOptions.aTimeout) {
		xhr.timeout
	}
	
	var do_setHeaders = function() {
		if (aOptions.Headers) {
			for (var h in aOptions.Headers) {
				xhr.setRequestHeader(h, aOptions.Headers[h]);
			}
		}
	};
	
	if (aOptions.aPostData) {
		xhr.open(aOptions.aMethod ? aOptions.aMethod : 'POST', aStr, true);
		do_setHeaders();
		xhr.channel.loadFlags |= aOptions.aLoadFlags;
		xhr.responseType = aOptions.aResponseType;
		
		/*
		var aFormData = Cc['@mozilla.org/files/formdata;1'].createInstance(Ci.nsIDOMFormData);
		for (var pd in aOptions.aPostData) {
			aFormData.append(pd, aOptions.aPostData[pd]);
		}
		xhr.send(aFormData);
		*/
		if (aOptions.aPostData.constructor.name == 'Object') {
			var aPostStr = [];
			for (var pd in aOptions.aPostData) {
				aPostStr.push(pd + '=' + encodeURIComponent(aOptions.aPostData[pd])); // :todo: figure out if should encodeURIComponent `pd` also figure out if encodeURIComponent is the right way to do this
			}
			console.info('aPostStr:', aPostStr.join('&'));
			xhr.send(aPostStr.join('&'));
		} else {
			xhr.send(aOptions.aPostData);
		}
	} else {
		xhr.open(aOptions.aMethod ? aOptions.aMethod : 'GET', aStr, true);
		do_setHeaders();
		xhr.channel.loadFlags |= aOptions.aLoadFlags;
		xhr.responseType = aOptions.aResponseType;
		xhr.send(null);
	}
	
	return deferredMain_xhr.promise;
}
var _getSafedForOSPath_pattWIN = /([\\*:?<>|\/\"])/g;
var _getSafedForOSPath_pattNIXMAC = /\//g;
const repCharForSafePath = '-';
function getSafedForOSPath(aStr, useNonDefaultRepChar) {
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				return aStr.replace(_getSafedForOSPath_pattWIN, useNonDefaultRepChar ? useNonDefaultRepChar : repCharForSafePath);
				
			break;
		default:
		
				return aStr.replace(_getSafedForOSPath_pattNIXMAC, useNonDefaultRepChar ? useNonDefaultRepChar : repCharForSafePath);
	}
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
// end - common helper functions