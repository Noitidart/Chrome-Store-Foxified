// Imports
importScripts('resource://gre/modules/osfile.jsm');

// Globals
var core;
var gBsComm;
const AMODOMAIN = 'https://addons.mozilla.org';

function dummyForInstantInstantiate() {}
function init(objCore) {
	//console.log('in worker init');

	core = objCore;

	importScripts(core.addon.path.scripts + '3rd/hmac-sha256.js');
	importScripts(core.addon.path.scripts + '3rd/enc-base64-min.js');
	importScripts(core.addon.path.scripts + '3rd/jszip.min.js');
	importScripts(core.addon.path.scripts + 'cws_pattern__firefox-worker.js');

	core.addon.path.storage = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage');
	core.addon.path.storage_crx = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage', 'crx');
	core.addon.path.storage_unsigned = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage', 'unsigned');
	core.addon.path.storage_signed = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage', 'signed');
	core.addon.path.storage_installations = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage', 'installations');

	// load all localization pacakages
	formatStringFromName('blah', 'main');
	core.addon.l10n = _cache_formatStringFromName_packages;
	console.log('will now remove dir 2');

	var st = Date.now();
	try {
		OS.File.removeDir(core.addon.path.storage, {ignorePermissions:true, ignoreAbsent:true});
		console.log('ok removed');
	} catch(OSFileError) {
		if (!OSFileError.becauseNoSuchFile) {
			console.error('OSFileError on remove:', OSFileError);
		}
		else { console.error('just no such file') }
	}
	var dur = Date.now() - st;
	console.error('took', dur, 'to remoe dir');

	if (dur < 1000) {
		setTimeoutSync(1000); // i want to delay 1sec to allow old framescripts to destroy
	}

	return core;
}

// Start - Addon Functionality

function b64utoa(aStr) {
	// base64url encode
	return btoa(aStr)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/\=+$/m, '')
}

function JSON_stringify_sorted(aObj) {
	var keys = Object.keys(aObj);
	keys.sort();
	var strArr = [];
	var l = keys.length;
	for(var i = 0; i < l; i++) {
		var stry = JSON.stringify({
			[keys[i]]: aObj[keys[i]]
		});
		stry = stry.substr(1, stry.length - 2); // remove the opening and closing curly
		strArr.push(stry);
	}
	return '{' + strArr.join(',') + '}'
}

function jwtSignOlympia(aKey, aSecret, aDateMs) {
	// aKey and aSecret should both be strings
	// jwt signature function for using with signing addons on AMO (addons.mozilla.org)
	var part1 = b64utoa(JSON_stringify_sorted({
		typ: 'JWT',
		alg: 'HS256'
	}));

	var iat = Math.ceil(aDateMs / 1000); // in seconds
	var part2 = b64utoa(JSON_stringify_sorted({
		iss: aKey,
		jti: Math.random().toString(),
		iat,
		exp: iat + 60
	}));

	var part3 = CryptoJS.HmacSHA256(part1 + '.' + part2, aSecret).toString(CryptoJS.enc.Base64).replace(/\=+$/m, '');
	return part1 + '.' + part2 + '.' + part3;
}

function downloadCrx(extid, aComm) {
	// called by bootstrap
	var deferredMain_downloadCrx = new Deferred();

	var onprogress = function(e) {
		// var percent;
		// if (e.lengthComputable) {
		// 	percent = Math.round((e.loaded / e.total) * 100);
		// }

		// console.log('percent:', percent, 'loaded:', e.loaded, 'total:', e.total);
		// if (percent !== 100) {
			updateStatus(extid, {
				downloading_crx: formatBytes(e.loaded, 1)
			});
		// }
	};

	console.log('get_crx_url(extid):', get_crx_url(extid));
	xhrAsync(get_crx_url(extid), {
		responseType: 'arraybuffer',
		timeout: 300000, // 5 minutes
		onprogress
	}, function(xhrArg) {
		var { request, ok, reason } = xhrArg; // reason is undefined if ok==true
		console.log('xhrArg:', xhrArg);
		try {
			console.log('request.responseText:', request.responseText);
		} catch(ex) {
			console.error('failed to read responseText, ex:', ex);
		}

		if (ok && request.status != 200) {
			ok = false;
		}
		var rezObj = {
			ok,
			reason, // is undefined if ok==true
			request: {
				status: request.status,
				statusText: request.statusText
				// , responseText: request.responseText
			}
		};

		if (ok) {
			try {
				writeThenDir(OS.Path.join(core.addon.path.storage_crx, extid + '.crx'), new Uint8Array(request.response), OS.Constants.Path.profileDir);
			} catch(ex) {
				console.error('ex:', ex, uneval(ex), ex.toString());
				throw ex;
			}
		}

		deferredMain_downloadCrx.resolve(rezObj);
	});

	return deferredMain_downloadCrx.promise;
}

function convertXpi(extid) {
	// creates an unsigned xpi out of a crx
	// also gets version of crx and sends it to app
	var deferredMain_convertXpi = new Deferred();

	var rezMain = {
		/*
		ok: true or false
		version: // actually might be there on fail to. only available if ok==true. is definitely there on success though.
		reason: present only if ok==false - current values:
		 		no_crx - no source crx found
		*/
	};

	// read crx
	var crx_uint8;
	try {
		crx_uint8 = OS.File.read(OS.Path.join(core.addon.path.storage_crx, extid + '.crx'));
	} catch (ex) {
		rez.ok = false;
		rez.reason = 'no_crx';
	}

	if (crx_uint8) {
		var locOfPk = new Uint8Array(crx_uint8.buffer.slice(0, 1000));
		// console.log('locOfPk:', locOfPk);
		for (var i=0; i<locOfPk.length; i++) {
			if (locOfPk[i] == 80 && locOfPk[i+1] == 75 && locOfPk[i+2] == 3 && locOfPk[i+3] == 4) {
				locOfPk = null;
				break;
			}
		}
		console.log('pk found at:', i);

		// TODO: possible error point here, if pk not found

		var zip_buffer = crx_uint8.buffer.slice(i);
		crx_uint8 = null;

		var zip_jszip = new JSZip(zip_buffer);

		var manifest = JSON.parse(zip_jszip.file('manifest.json').asText());
		var version = manifest.version;
		rezMain.version = version;
		// TODO: possible error point, if the JSON.parse fails

		manifest.applications = {
			gecko: {
				id: extid + '@chrome-store-foxified-unsigned'
			}
		};

		// TODO: many error points here - handle them all

		gBsComm.postMessage('beautifyManifest', JSON.stringify(manifest), null, function(manfiest_pretty, aComm) {
			zip_jszip.file('manifest.json', manfiest_pretty);

			var zip_uint8 = zip_jszip.generate({type:'uint8array'});

			try {
				writeThenDir(OS.Path.join(core.addon.path.storage_unsigned, extid + '.xpi'), zip_uint8, OS.Constants.Path.profileDir);
			} catch(ex) {
				console.error('ex:', ex, uneval(ex), ex.toString());
				throw ex;
			}

			rezMain.ok = true;

			deferredMain_convertXpi.resolve(rezMain);
		});
	} else {
		deferredMain_convertXpi.resolve(rezMain);
	}

	return deferredMain_convertXpi.promise;
}

var gLastSystemTimeOffset = 0;  // in seconds // for use in case server1 and server2 fail to provide time
function signXpi(extid) {
	var deferredMain_signXpi = new Deferred();

	var rezMain = {
		/*
		ok: true or false
		reason: present only if ok was set to false - current values:
		 		no_src_file - no source unsigned xpi found
				no_login_amo -
				no_agree_amo -
				fail_xhr -
				missing_field -
				failed_approval - uploaded, and the review process came back as "reject"
				fail_upload_toolong - failed to upload, it took so long that the singature expired, tell user its ok it happens, retrying is the solution here. it took so long that the signature expired.
				fail_upload_unknown - failed to upload for some unknown reason
		reason_details: // present only for some reason's
				// fail_xhr
				{
					status
					statusText
					url
					response - available when fail upload to amo
				}
				// missing_field
				{
					fields: [] - array of strings for field names
				}
				// failed_approval
				{
					report: {} - json of report of the review
				}
		*/
	};

	// read uint8 of core.addon.path.storage_unsigned
		// error no_unsigned
	var unsigned_uint8;
	try {
		unsigned_uint8 = OS.File.read(OS.Path.join(core.addon.path.storage_unsigned, extid + '.xpi'));
	} catch (ex) {
		rez.ok = false;
		rez.reason = 'no_src_file';
		deferredMain_signXpi.resolve(rezMain);
	}

	if (unsigned_uint8) {

		// navigate to get amo details - do not store globally, i need to do every time to ensure logged in each time
			// no_login_amo
			// no_agree_amo

		// start - async-proc25830
		var asynProc25830 = function() {
			updateStatus(extid, {
				signing_xpi: formatStringFromName('signing_xpi_checking_loggedin', 'main')
			});
			xhrAsync(AMODOMAIN + '/en-US/developers/addon/api/key/', {
				timeout: 10000
			}, callbackLoadkey);
		};

		var amo_user = {
			// key:
			// secret:
		};
		var didGenerate = false;
		var callbackLoadkey = function(xhrArg) {
			var { request, ok, reason } = xhrArg;
			if (!ok) {
				// xhr failed
				rezMain.ok = false;
				rezMain.reason = 'fail_xhr';
				rezMain.reason_details = {
					status: request.status,
					statusText: request.statusText,
					url: request.responseURL
				};
				deferredMain_signXpi.resolve(rezMain);
			} else {
				var html = request.response;
				if (html.includes('accept-agreement')) {
					rezMain.ok = false;
					rezMain.reason = 'no_agree_amo';
					deferredMain_signXpi.resolve(rezMain);
				} else if (!html.includes('firefox/users/edit') && !html.includes('android/users/edit')) {
					rezMain.ok = false;
					rezMain.reason = 'no_login_amo';
					deferredMain_signXpi.resolve(rezMain);
				} else {
					// logged in and accepted
					// but may not have generated credentials

					var fieldKeyHtml = /input[^<]+jwtkey[^>]+/i.exec(html);
					var fieldSecretHtml = /input[^<]+jwtsecret[^>]+/i.exec(html);

					console.log('fieldKeyHtml:', fieldKeyHtml);
					console.log('fieldSecretHtml:', fieldSecretHtml);

					if (!fieldKeyHtml || !fieldSecretHtml) {
						if (didGenerate) {
							// did generate, and keys are still not there - this is an error
							rezMain.ok = false;
							rezMain.reason = 'missing_field';
							rezMain.reason_details = {
								fields: ['key', 'secret']
							};
							deferredMain_signXpi.resolve(rezMain);
						} else {
							// keys are not there, need to generate
							var fieldTokenHtml = /input[^<]+csrfmiddlewaretoken[^>]+/i.exec(html);
							console.log('fieldTokenHtml:', fieldTokenHtml);
							if (!fieldTokenHtml) {
								rezMain.ok = false;
								rezMain.reason = 'missing_field';
								rezMain.reason_details = {
									fields: ['token']
								};
								deferredMain_signXpi.resolve(rezMain);
							} else {
								var token = /value=["']?(.*?)["' \/<]/i.exec(fieldTokenHtml)[1];
								didGenerate = true;

								updateStatus(extid, {
									signing_xpi: formatStringFromName('signing_xpi_generating_amo', 'main')
								});

								xhrAsync(AMODOMAIN + '/en-US/developers/addon/api/key/', {
									timeout: 10000,
									method: 'POST',
									data: jQLike.serialize({
										csrfmiddlewaretoken: token,
										action: 'generate'
									}),
									headers: {
										Referer: AMODOMAIN + '/en-US/developers/addon/api/key/',
										'Content-Type': 'application/x-www-form-urlencoded'
									}
								}, callbackLoadkey);
							}
						}
					} else {
						var key = /value=["']?(.*?)["' \/<]/i.exec(fieldKeyHtml)[1];
						var secret = /value=["']?(.*?)["' \/<]/i.exec(fieldSecretHtml)[1];

						amo_user.key = key;
						amo_user.secret = secret;

						afterAmouserPopulated();
					}
				}
			}
		};

		var presigned_zip_blob;
		var xpiid;
		var xpiversion;
		var afterAmouserPopulated = function() {
			// modify id in unsigned to use hash of user id - and get version of xpi

			updateStatus(extid, {
				signing_xpi: formatStringFromName('signing_xpi_setting_id', 'main')
			});

			var unsigned_jszip = new JSZip(unsigned_uint8.buffer);
			unsigned_uint8 = null;

			var manifest_txt = unsigned_jszip.file('manifest.json').asText();

			var manifest_json = JSON.parse(manifest_txt);
			xpiversion = manifest_json.version;

			xpiid = extid + '@chrome-store-foxified-' + HashString(amo_user.key);
			console.log('index of unsigned id:', manifest_txt.indexOf(extid + '@chrome-store-foxified-unsigned'));
			manifest_txt = manifest_txt.replace(extid + '@chrome-store-foxified-unsigned', xpiid);
			console.log('index of unsigned id afte replace:', manifest_txt.indexOf(extid + '@chrome-store-foxified-unsigned'));
			// TODO: error points here? JSZip failing? maybe think about it, if there are then handle it

			unsigned_jszip.file('manifest.json', manifest_txt);

			presigned_zip_blob = unsigned_jszip.generate({type:'blob'});

			afterXpiIdModded();
		};

		var systemTimeOffset; // in milliseconds
		var afterXpiIdModded = function() {
			// get offset of system clock to unix clock
				// if server1 fails use server2. if server2 fails continue with system clock (possible last globally stored offset - think about it)

			// start async-proc94848
			var requestStart; // start time of request
			var asyncProc94848 = function() {
				tryServer1();
			};

			var tryServer1 = function() {
				updateStatus(extid, {
					signing_xpi: formatStringFromName('signing_xpi_unix_server_1', 'main')
				});
				requestStart = Date.now();
				xhrAsync('http://currenttimestamp.com/', {
					timeout: 10000
				}, callbackServer1);
			};

			var callbackServer1 = function(xhrArg) {
				var { request, ok, reason } = xhrArg;

				var onFail = function() {
					tryServer2();
				};

				if (!ok) {
					onFail();
				} else {
					var requestEnd = Date.now();
					var requestDuration = requestEnd - requestStart;
					var html = request.response;

					// start - calc sys offset
					var nowDateServerMatch = /current_time = (\d+);/.exec(html);
					if (!nowDateServerMatch) {
						onFail();
					}
					console.log('nowDateServerMatch:', nowDateServerMatch);

					var nowDateServerUncompensated = parseInt(nowDateServerMatch[1]) * 1000;
					console.log('nowDateServerUncompensated:', nowDateServerUncompensated);

					var nowDateServer = nowDateServerUncompensated - requestDuration;
					console.log('nowDateServer:', nowDateServer);

					console.log('systemNow:', (new Date(requestStart)).toLocaleString(), 'serverNow:', (new Date(nowDateServer)).toLocaleString(), 'requestDuration seconds:', (requestDuration / 1000))
					systemTimeOffset = requestStart - nowDateServer;
					gLastSystemTimeOffset = systemTimeOffset;
					// end - calc sys offset

					afterSystemTimeOffsetGot();
				}
			};

			var tryServer2 = function() {
				updateStatus(extid, {
					signing_xpi: formatStringFromName('signing_xpi_unix_server_2', 'main')
				});
				requestStart = Date.now();
				xhrAsync('http://convert-unix-time.com/', {
					timeout: 10000
				}, callbackServer2);
			};

			var callbackServer2 = function(xhrArg) {
				var { request, ok, reason } = xhrArg;

				var onFail = function() {
					// rely on whatever gLastSystemTimeOffset is
					afterSystemTimeOffsetGot();
				};

				if (!ok) {
					onFail();
				} else {
					var requestEnd = Date.now();
					var requestDuration = requestEnd - requestStart;
					var html = request.response;


					// start - calc sys offset
					var nowDateServerMatch = /Seconds since 1970 (\d+)/.exec(html);
					if (!nowDateServerMatch) {
						onFail();
					}
					console.log('nowDateServerMatch:', nowDateServerMatch);

					var nowDateServerUncompensated = parseInt(nowDateServerMatch[1]) * 1000;
					console.log('nowDateServerUncompensated:', nowDateServerUncompensated);

					var nowDateServer = nowDateServerUncompensated - requestDuration;
					console.log('nowDateServer:', nowDateServer);

					console.log('systemNow:', (new Date(requestStart)).toLocaleString(), 'serverNow:', (new Date(nowDateServer)).toLocaleString(), 'requestDuration seconds:', (requestDuration / 1000))
					systemTimeOffset = requestStart - nowDateServer;
					gLastSystemTimeOffset = systemTimeOffset;
					// end - calc sys offset

					afterSystemTimeOffsetGot();
				}
			};

			asyncProc94848();
			// end - async-proc94848
		};

		var getCorrectedSystemTime = ()=>(Date.now() - systemTimeOffset);
		var afterSystemTimeOffsetGot = function() {
			// go through signing on amo - its errors including especially time not in sync

			console.log('systemTimeOffset:', systemTimeOffset);
			updateStatus(extid, {
				signing_xpi: formatStringFromName('signing_xpi_uploading', 'main')
			});

			var onuploadprogress = function(e) {
				var percent;
				if (e.lengthComputable) {
					percent = Math.round((e.loaded / e.total) * 100);
				}

				updateStatus(extid, {
					signing_xpi: formatStringFromName('signing_xpi_uploading_progress', 'main', [percent, formatBytes(e.loaded, 1)])
				});
			};

			var presigned_zip_file = new File([presigned_zip_blob], 'dummyname.xpi');
			var data = new FormData();
			data.append('Content-Type', 'multipart/form-data');
			data.append('upload', presigned_zip_file); // http://stackoverflow.com/a/24746459/1828637

			console.error('doing submit');

			xhrAsync(AMODOMAIN + '/api/v3/addons/' + encodeURIComponent(xpiid) + '/versions/' + xpiversion + '/', { // only on first time upload, the aAddonVersionInXpi can be anything
				method: 'PUT',
				data,
				responseType: 'json',
				headers: {
					Authorization: 'JWT ' + jwtSignOlympia(amo_user.key, amo_user.secret, getCorrectedSystemTime())
				},
				// timout: null - DO NOT set timeout, as the signature expiry will tell us of timeout link88444576
				onuploadprogress
			}, verifyUploaded);

		};

		var possible_uploadFailedDueToTooLong_if404onCheck = false;
		var validation_url; // on upload it gets the url, and it presents it to user on error so they can do inspection
		var verifyUploaded = function(xhrArg) {
			console.error('doing verifyUploaded');
			var { request, ok, reason } = xhrArg;
			console.log('request:', request, 'ok:', ok, 'reason:', reason);
			if (!ok && (request.status != 409)) { // link3922222
				// TODO: detail why it failed here, so it tells user, it would failed to upload, maybe bad status token etc
				// xhr failed
				rezMain.ok = false;
				rezMain.reason = 'fail_xhr';
				rezMain.reason_details = {
					status: request.status,
					statusText: request.statusText,
					url: request.responseURL,
					response: request.response
				};
				deferredMain_signXpi.resolve(rezMain);
			} else {
				// status is 201 or 202 - meaning ok new submission went through
				// status 409 - ok is false, as i expect 4xx status codes to be, so i add in check for 409 on link3922222 means version is already there, so go straight to check requestReviewStatus to get url to download
				// status 401 - ok is true for some reason - it means signature has expired `401 Object { detail: "Signature has expired." } UNAUTHORIZED` this happens when upload takes to long. in all my test cases, the upload did go through OR version was already existing

				if (request.status == 401) {
					// this happens when upload takes too long. however in all cases i saw where it took too long, the upload happend, its just that the response could not be recieved because of signature expired, so lets go ahead to requestReviewStatus to check if its there. if it gets a 404, it indeed means the upload failed
					// because of this reason i do not supply a timeout to the xhrAsync link88444576

					// TODO: tell user it failed to upload because it took too long (probably due to amo server being slow) - explain that the only solution here is to retry, and if still, then wait 15 min and try again, and if still then repet waiting and retrying
					rezMain.ok = false;
					rezMain.reason = 'fail_upload_toolong';
					rezMain.reason_details = {
						status: request.status,
						statusText: request.statusText,
						url: request.responseURL,
						response: request.response
					};
					deferredMain_signXpi.resolve(rezMain);

					// possible_uploadFailedDueToTooLong_if404onCheck = true;
					// requestReviewStatus();
				} else if ([409, 201, 202].includes(request.status)) {
					// wait for review to complete
					console.error('ok good uploaded, status:', request.status, request.response, request.statusText);
					validation_url = request.response.validation_url;
					requestReviewStatus();
				} else {
					rezMain.ok = false;
					rezMain.reason = 'fail_xhr';
					rezMain.reason_details = {
						status: request.status,
						statusText: request.statusText,
						url: request.responseURL,
						response: request.response
					};
					deferredMain_signXpi.resolve(rezMain);
				}
			}
		};

		var request_status_cnt = 0;
		const request_status_max = 10;
		var requestReviewStatus = function() {
			// sends xhr to check if review is complete
			request_status_cnt++;

			if (request_status_cnt > 1) {
				updateStatus(extid, {
					signing_xpi: formatStringFromName('signing_xpi_checking_review_reattempt', 'main', [request_status_cnt, request_status_max])
				});
			} else {
				updateStatus(extid, {
					signing_xpi: formatStringFromName('signing_xpi_checking_review_status_prelim', 'main')
				});
			}

			console.error('doing requestReviewStatus, request_status_cnt:',request_status_cnt);
			console.log('url:', AMODOMAIN + '/api/v3/addons/' + encodeURIComponent(xpiid) + '/versions/' + xpiversion + '/');
			xhrAsync(AMODOMAIN + '/api/v3/addons/' + encodeURIComponent(xpiid) + '/versions/' + xpiversion + '/', {
				responseType: 'json',
				headers: {
					Authorization: 'JWT ' + jwtSignOlympia(amo_user.key, amo_user.secret, getCorrectedSystemTime())
				}
			}, callbackReviewStatus);
		};

		var callbackReviewStatus = function(xhrArg) {
			console.error('doing callbackReviewStatus');
			var { request, ok, reason } = xhrArg;
			console.error('response on status review check:', { status: request.status, statusText: request.statusText, url: request.responseURL, response: request.response });
			if (!ok) {
				// TODO: detail why it failed here, so it tells user, failed checking status
				// xhr failed
				rezMain.ok = false;
				rezMain.reason = 'fail_xhr';
				rezMain.reason_details = {
					status: request.status,
					statusText: request.statusText,
					url: request.responseURL,
					response: request.response,
					validation_url
				};
				deferredMain_signXpi.resolve(rezMain);
			} else {
				// TODO: right now i check for files, i should check if review passed. because review can i fail i guess, if like they do some bad stuff

				// state changes of reponse.jon for eventual approved
				// active=false	processed=false	passed_review=false	files=[0]	reviewed=false	validation_results=null		valid:false	// immediately after upload
				// active=false	processed=true	passed_review=false	files=[0]	reviewed=false	validation_results={...}	valid:true 	// processing complete - takes some time
				// active=true	processed=true	passed_review=true	files=[1]	reviewed=true	validation_results={...}	valid:true 	// approved and file ready to download - takes some time

				// TODO: state changes of reponse.jon for eventual rejected
				// TODO: state changes of reponse.jon for eventual other non-approved (like error)

				console.error('review status check, xhr details:', request.status, request.response, request.statusText);
				if (request.status == 200) {
					// if (request.response.files) {
						if (request.response.files.length === 1) {
							// ok review complete and approved - download it
							updateStatus(extid, {
								signing_xpi: formatStringFromName('signined_xpi_downloading', 'main')
							});

							var onprogress = function(e) {
								var percent;
								if (e.lengthComputable) {
									percent = Math.round((e.loaded / e.total) * 100);
								}

								updateStatus(extid, {
									signing_xpi: formatStringFromName('signined_xpi_downloading_progress', 'main', [percent || '?', formatBytes(e.loaded, 1)])
								});
							};

							xhrAsync(request.response.files[0].download_url, {
								responseType: 'arraybuffer',
								headers: {
									Authorization: 'JWT ' + jwtSignOlympia(amo_user.key, amo_user.secret, getCorrectedSystemTime())
								},
								onprogress
							}, callbackDownloadSigned);
						} else if (request.response.files.length === 0) {
							console.error('addon not yet signed, wait, then check again')

							if (request.response.reviewed && !request.response.passed_review) { // i was using .response.processed however it was not right, as it gets processed before reviewed. so updated to .response.reviewed. as with fullscreenshot thing i got that warning for binary - https://chrome.google.com/webstore/detail/full-page-screen-capture/fdpohaocaechififmbbbbbknoalclacl
								// throw new Error('failed validation of the signing process');
								rezMain.ok = false;
								rezMain.reason = 'failed-approval';
								rezMain.reason_details = {
									report: request.response,
									validation_url
								};
								deferredMain_signXpi.resolve(rezMain);
							} else {
								// review is in process, check again after waiting
								console.error('review is in process, check after waiting');

								if (request_status_cnt == request_status_max) {
									rezMain.ok = false;
									rezMain.reason = 'max_attempts';
									rezMain.reason_details = {
										validation_url
									};
									deferredMain_signXpi.resolve(rezMain);
								} else {
									waitThenRequestReviewStatus();
								}
							}
						} else {
							// files are > 1 - how on earth?? // TODO: handle this with error to user
						}
					// }
				} else if (request.status == 404) {
					// failed to upload
					// if (possible_uploadFailedDueToTooLong_if404onCheck) {
					// 	// TODO: tell user it failed to upload because it took too long (probably due to amo server being slow) - explain that the only solution here is to retry, and if still, then wait 15 min and try again, and if still then repet waiting and retrying
					// 	rezMain.ok = false;
					// 	rezMain.reason = 'fail_upload_toolong';
					// 	deferredMain_signXpi.resolve(rezMain);
					// } else {
						// tell user it failed to upload for some unknown reason
						rezMain.ok = false;
						rezMain.reason = 'fail_upload_unknown';
						deferredMain_signXpi.resolve(rezMain);
					// }
				} else {
					rezMain.ok = false;
					rezMain.reason = 'fail_xhr';
					rezMain.reason_details = {
						status: request.status,
						statusText: request.statusText,
						url: request.responseURL,
						response: request.response
					};
					deferredMain_signXpi.resolve(rezMain);
				}
			}
		};

		var waited_for = 0; // for programtic use, devuser do not set this
		const wait_for = 10; // sec
		var waitThenRequestReviewStatus = function() {
			if (waited_for === 0) {
				waited_for = wait_for;
			} else {
				waited_for--;
			}
			if (waited_for === 0) {
				requestReviewStatus();
			} else {
				updateStatus(extid, {
					signing_xpi: formatStringFromName('signing_xpi_checking_review_wait', 'main', [waited_for, request_status_cnt, request_status_max])
				});
				setTimeout(waitThenRequestReviewStatus, 1000);
			}
		};

		var callbackDownloadSigned = function(xhrArg) {
			var { request, ok, reason } = xhrArg;
			if (!ok) {
				// TODO: detail why it failed here, so it tells user, failed downloading signed
				// xhr failed
				rezMain.ok = false;
				rezMain.reason = 'fail_xhr';
				rezMain.reason_details = {
					status: request.status,
					statusText: request.statusText,
					url: request.responseURL,
					response: request.response
				};
				deferredMain_signXpi.resolve(rezMain);
			} else {

				// save to disk
				console.error('ok downloaded data, saving to disk');
				try {
					writeThenDir(OS.Path.join(core.addon.path.storage_signed, extid + '.xpi'), new Uint8Array(request.response), OS.Constants.Path.profileDir);
				} catch(ex) {
					console.error('ex:', ex, uneval(ex), ex.toString());
					throw ex;
				}

				rezMain.ok = true;
				deferredMain_signXpi.resolve(rezMain);
			}
		};

		asynProc25830();
		// end - async-proc25830

	}

	return deferredMain_signXpi.promise;
}

function updateStatus(extid, obj) {
	// i shouldnt have to do method and arg objects, but i do here because .... // TODO: explain why
	// gBsComm.postMessage('callInAllContent', {
	// 	method: 'dispatchInContent',
	// 	arg: {
	// 		creator: 'updateStatus',
	// 		argarr: [
	// 			extid,
	// 			obj
	// 		]
	// 	}
	// });
	gBsComm.postMessage('dispatchInContent', {
		creator: 'updateStatus',
		argarr: [
			extid,
			obj
		]
	});
}

function saveToFile(aArg, aComm) {
	var { extid, which, name, version } = aArg;
	// which is: 0-unsigned, 1-signed, 2-crx

	var deferredMain_saveToFile = new Deferred();

	var rez = {
		/*
		ok: bool - true even when cancelled
		reason: only present on fail, current values:
				no_src_file - meaning the source for the one requested is not there yet
		*/
	};

	if (version === undefined) {
		version = formatStringFromName('version_unknown', 'main');
	}
	// get path
	var path;
	var browseFilters;
	var recommendSaveAs;
	var saveExtension; // must be set in lower case due to link11193333
	switch (which) {
		case 0:
				path = OS.Path.join(core.addon.path.storage_unsigned, extid + '.xpi');
				browseFilters = [formatStringFromName('mozilla_firefox_addon', 'main'), '*.xpi'];
				saveExtension = '.xpi';
				recommendSaveAs = formatStringFromName('save_as_rec_unsigned', 'main', [safedForPlatFS(name, {repStr:'_'}), version]) + saveExtension;
			break;
		case 1:
				path = OS.Path.join(core.addon.path.storage_signed, extid + '.xpi');
				browseFilters = [formatStringFromName('mozilla_firefox_addon', 'main'), '*.xpi'];
				saveExtension = '.xpi';
				recommendSaveAs = formatStringFromName('save_as_rec_signed', 'main', [safedForPlatFS(name, {repStr:'_'}), version]) + saveExtension;
			break;
		case 2:
				path = OS.Path.join(core.addon.path.storage_crx, extid + '.crx');
				browseFilters = [formatStringFromName('google_chrome_extension', 'main'), '*.crx'];
				saveExtension = '.crx';
				recommendSaveAs = formatStringFromName('save_as_rec_crx', 'main', [safedForPlatFS(name, {repStr:'_'}), version]) + saveExtension;
			break;
	}

	// check existance
	var exists = OS.File.exists(path);

	if (!exists) {
		rez.ok = false;
		rez.reason = 'no_src_file';
		deferredMain_saveToFile.resolve(rez);
	} else {
		// start - async-proc993
		var afterTargetPath = function(aOsPath) {
			if (!aOsPath.toLowerCase().endsWith(saveExtension)) { // link11193333
				aOsPath += saveExtension;
			}
			gBsComm.postMessage('downloadFile', {
				aSourceURL: OS.Path.toFileURI(path),
				aTargetOSPath: aOsPath
			});
			deferredMain_saveToFile.resolve(rez);
		};

		if (OS.Constants.Sys.Name != 'Android') {
			gBsComm.postMessage(
				'browseFile',
				{
					aDialogTitle: formatStringFromName('save_to_file_as', 'main'),
					aOptions: {
						mode: 'modeSave',
						filters: browseFilters,
						async: true,
						win: 'navigator:browser',
						defaultString: recommendSaveAs
					}
				},
				undefined,
				function(aArg, aComm) {
					var path_target = aArg;
					if (!path_target) {
						// user cancelled
						rez.ok = true;
						deferredMain_saveToFile.resolve(rez);
					} else {
						var path_target = aArg;
						afterTargetPath(path_target);
					}
				}
			);
		} else {
			afterTargetPath(OS.Path.join(core.addon.path.downloads, recommendSaveAs));
		}

		// end - async-proc993
	}

	return deferredMain_saveToFile.promise;
}

function bootstrapTimeout(milliseconds) {
	var mainDeferred_bootstrapTimeout = new Deferred();
	setTimeout(function() {
		mainDeferred_bootstrapTimeout.resolve();
	}, milliseconds)
	return mainDeferred_bootstrapTimeout.promise;
}

function installAddon(aArg, aComm) {
	var { temp, extid } = aArg;

	// xpi at `path` is opened to extract addon id from it
	// `temp` is bool, set to true for temp install, or false for normal install

	// a clone of the xpi at `path` is made in core.addon.path.storage_installations - this is because of a bug in that firefox locks the file on disk, and it cannot be modified while the lock is held by the "load as temporary addon" feature

	var mainDeferred_installAddon = new Deferred();
	var mainRez = {};

	var install_path;
	var copy_path;
	if (temp) {
		install_path = OS.Path.join(core.addon.path.storage_installations, extid + '-' + Date.now() + '.xpi');
		copy_path = OS.Path.join(core.addon.path.storage_unsigned, extid + '.xpi');
	} else {
		copy_path = OS.Path.join(core.addon.path.storage_signed, extid + '.xpi');
		install_path = OS.Path.join(core.addon.path.storage_installations, extid + '-' + Date.now() + '.xpi');
	}

	// make clone
	try {
		OS.File.copy(copy_path, install_path);
	} catch(ex) {
		console.error('ex when copying 1 - ', ex);
		if (ex.becauseNoSuchFile) {
			try {
				OS.File.makeDir(core.addon.path.storage_installations, {from:OS.Constants.Path.profileDir});
			} catch (ex) {
				mainRez.reason = 'filesystem_dir';
				console.error('ex when make dir - ', ex);
			}
			try {
				OS.File.copy(copy_path, install_path);
			} catch(ex) {
				console.error('ex when copying 2 - ', ex);
				mainRez.reason = 'no_src_file';
			}
		} else {
			mainRez.reason = 'filesystem';
		}
	}

	if (mainRez.reason) {
		mainRez.ok = false;
		mainDeferred_installAddon.resolve(mainRez);
	} else {
		if (!temp) {
			install_path = OS.Path.toFileURI(install_path);
			console.log('file uri of install_path:', install_path);
		}

		var install_method = temp ? 'installAddonAsTemp' : 'installAddonAsNormal';
		gBsComm.postMessage(install_method, {
			partial_id: extid,
			path: install_path
		}, undefined, function(aArg, aComm) {
			mainDeferred_installAddon.resolve(aArg);
		});
	}

	return mainDeferred_installAddon.promise;
}

self.onclose = function() {
	console.log('ok ready to terminate');
}

// End - Addon Functionality

// start - common helper functions
function formatBytes(bytes,decimals) {
   if(bytes == 0) return '0 Byte';
   var k = 1024; // or 1024 for binary
   var dm = decimals + 1 || 3;
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// rev3 - _ff-addon-snippet-safedForPlatFS.js - https://gist.github.com/Noitidart/e6dbbe47fbacc06eb4ca
var _safedForPlatFS_pattWIN = /([\\*:?<>|\/\"])/g;
var _safedForPlatFS_pattNIXMAC = /[\/:]/g;
function safedForPlatFS(aStr, aOptions={}) {
	// depends on core.os.mname - expects it to be lower case
	// short for getSafedForPlatformFilesystem - meaning after running this on it, you can safely use the return in a filename on this current platform
	// aOptions
	//	repStr - use this string, in place of the default repCharForSafePath in place of non-platform safe characters
	//	allPlatSafe - by default it will return a path safed for the current OS. Set this to true if you want to to get a string that can be used on ALL platforms filesystems. A Windows path is safe on all other platforms

	// 022816 - i added : to _safedForPlatFS_pattNIXMAC because on mac it was replacing it with a `/` which is horrible it will screw up OS.Path.join .split etc

	// set defaults on aOptions
	if (!('allPlatSafe' in aOptions)) {
		aOptions.allPlatSafe = false;
	}
	if (!('repStr' in aOptions)) {
		aOptions.repStr = '-';
	}

	var usePlat = aOptions.allPlatSafe ? 'winnt' : core.os.mname; // a windows path is safe in all platforms so force that. IF they dont want all platforms then use the current platform
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
// HashString - rev 052816 - not yet updated to gist.github
var _cache_HashString = {};
var HashString = (function (){
	/**
	 * Javascript implementation of
	 * https://hg.mozilla.org/mozilla-central/file/0cefb584fd1a/mfbt/HashFunctions.h
	 * aka. the mfbt hash function.
	 */
	// Note: >>>0 is basically a cast-to-unsigned for our purposes.
	const kGoldenRatio = 0x9E3779B9;

	// Multiply two uint32_t like C++ would ;)
	const mul32 = (a, b) => {
	// Split into 16-bit integers (hi and lo words)
		var ahi = (a >> 16) & 0xffff;
		var alo = a & 0xffff;
		var bhi = (b >> 16) & 0xffff
		var blo = b & 0xffff;
		// Compute new hi and lo seperately and recombine.
		return (
			(((((ahi * blo) + (alo * bhi)) & 0xffff) << 16) >>> 0) +
			(alo * blo)
		) >>> 0;
	};

	// kGoldenRatioU32 * (RotateBitsLeft32(aHash, 5) ^ aValue);
	const add = (hash, val) => {
		// Note, cannot >> 27 here, but / (1<<27) works as well.
		var rotl5 = (
			((hash << 5) >>> 0) |
			(hash / (1<<27)) >>> 0
		) >>> 0;
		return mul32(kGoldenRatio, (rotl5 ^ val) >>> 0);
	}

	return function(text) {
		// Convert to utf-8.
		// Also decomposes the string into uint8_t values already.
		if (!(text in _cache_HashString)) {
			var data = (new TextEncoder()).encode(text);

			// Compute the actual hash
			var rv = 0;
			for (var c of data) {
				rv = add(rv, c | 0);
			}
			_cache_HashString[text] = rv;
		}
		return _cache_HashString[text];
	};
})();
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

// https://gist.github.com/Noitidart/7810121036595cdc735de2936a7952da -rev1
function writeThenDir(aPlatPath, aContents, aDirFrom, aOptions={}) {
	// tries to writeAtomic
	// if it fails due to dirs not existing, it creates the dir
	// then writes again
	// if fail again for whatever reason it throws

	var cOptionsDefaults = {
		encoding: 'utf-8',
		noOverwrite: false,
		// tmpPath: aPlatPath + '.tmp'
	}

	var do_write = function() {
		return OS.File.writeAtomic(aPlatPath, aContents, aOptions); // doing unixMode:0o4777 here doesn't work, i have to `OS.File.setPermissions(path_toFile, {unixMode:0o4777})` after the file is made
	};



	try {
		do_write();
	} catch (OSFileError) {
		if (OSFileError.becauseNoSuchFile) { // this happens when directories dont exist to it
			OS.File.makeDir(OS.Path.dirname(aPlatPath), {from:aDirFrom});
			do_write(); // if it fails this time it will throw outloud
		} else {
			throw OSFileError;
		}
	}

}

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

function xhrAsync(aUrlOrFileUri, aOptions={}, aCallback) { // 052716 - added timeout support
	// console.error('in xhr!!! aUrlOrFileUri:', aUrlOrFileUri);

	// all requests are sync - as this is in a worker
	var aOptionsDefaults = {
		responseType: 'text',
		timeout: 0, // integer, milliseconds, 0 means never timeout, value is in milliseconds
		headers: null, // make it an object of key value pairs
		method: 'GET', // string
		data: null, // make it whatever you want (formdata, null, etc), but follow the rules, like if aMethod is 'GET' then this must be null
		onprogress: undefined, // set to callback you want called
		onuploadprogress: undefined // set to callback you want called
	};
	Object.assign(aOptionsDefaults, aOptions);
	aOptions = aOptionsDefaults;

	var request = new XMLHttpRequest();

	request.timeout = aOptions.timeout;

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

					// var result_details = {
					// 	reason: ev.type,
					// 	request,
					// 	message: request.statusText + ' [' + ev.type + ':' + request.status + ']'
					// };
					aCallback({request, ok:false, reason:ev.type});

				break;
			default:
				var result_details = {
					reason: 'unknown',
					request,
					message: request.statusText + ' [' + ev.type + ':' + request.status + ']'
				};
				aCallback({request, ok:false, reason:ev.type, result_details});
		}
	};


	var evf = f => ['load', 'error', 'abort', 'timeout'].forEach(f);
	evf(m => request.addEventListener(m, handler, false));

	if (aOptions.onprogress) {
		request.addEventListener('progress', aOptions.onprogress, false);
	}
	if (aOptions.onuploadprogress) {
		request.upload.addEventListener('progress', aOptions.onuploadprogress, false);
	}
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
