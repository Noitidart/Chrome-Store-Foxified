// this file is not triggered till DOMContentLoaded

var core;
var gFsComm;

var gAriaLabels = [
	'Available on Chrome'
];

function init() {
	gFsComm.postMessage('callInBootstrap', {method:'fetchCore',wait:true}, null, function(aCore) {
		console.log('core:', aCore);
		core = aCore;

		window.addEventListener('click', genericClick, true);

		var rootEl = document.createElement('div');
		rootEl.setAttribute('id', 'chrome-store-foxified-root');
		document.documentElement.insertBefore(rootEl, document.documentElement.firstChild);

		var styleEl = document.createElement('style');
		styleEl.setAttribute('id', 'chrome-store-foxified-style')
		styleEl.textContent = `
			XXXdiv[aria-label="Available on Chrome"] {
				overflow: hidden !important;
				background-color: rgb(124, 191, 54) !important;
				background-image: linear-gradient(to bottom, rgb(124, 191, 54), rgb(101, 173, 40)) !important; border-color:rgb(78, 155, 25) !important;
			}

			${gAriaLabels.map(arrEl=>{return 'div[aria-label="' + arrEl + '"] .webstore-test-button-label'}).join(',')}
			{
				/* this is needed, because on search results page, the parent of this is set to display flex, so it centers things vertically, showing my "add to firefox" line and the one i pushed "available on chrome"*/
				align-self: start;
				overflow: hidden;
				height: 100%;
			}

			${gAriaLabels.map(arrEl=>{return 'div[aria-label="' + arrEl + '"] .webstore-test-button-label::before'}).join(',')}
			{
				display: block;
				content: "${formatStringFromNameCore('install_button_label', 'main')}";
			}

			body > div:last-of-type > div:nth-of-type(2),	/* targeting download div */
			.h-Yb-wa.Yb-wa									/* alt target download div */
			{
				display: none;
			}
		`;

		document.documentElement.insertBefore(styleEl, document.documentElement.firstChild);
	});
}
// div[aria-label="Available on Chrome"] .webstore-test-button-label::before
function uninit() {
	var styleEl = document.getElementById('chrome-store-foxified-style');
	if (styleEl) {
		styleEl.parentNode.removeChild(styleEl);
	}

	window.removeEventListener('click', genericClick, true);
}

function genericClick(e) {
	var targetEl = e.target;
	console.log('clicked, targetEl:', targetEl.innerHTML);
	if (targetEl) {

		var isTestBtn = targetEl.classList.contains('webstore-test-button-label');
		var isRoleBtn = (targetEl.getAttribute('role') == 'button');
		var containsTestBtn;
		try {
			containsTestBtn = targetEl.querySelector('.webstore-test-button-label');
		} catch(ignore) {}
		console.log('isTestBtn:', isTestBtn, 'isRoleBtn:', isRoleBtn, 'containsTestBtn:', containsTestBtn);

		if (isTestBtn || (isRoleBtn && containsTestBtn)) {
			var ariaLabel;
			var btnText;

			if (isRoleBtn) {
				ariaLabel = targetEl.getAttribute('aria-label');
			}
			if (isTestBtn) {
				btnText = targetEl.textContent.trim();
			}

			console.log('ariaLabel:', ariaLabel, 'btnText:', btnText);
			if (gAriaLabels.indexOf(ariaLabel) > -1 || gAriaLabels.indexOf(btnText) > -1) {
				// alert('ok trigger');
				installClick(e);
				e.stopPropagation();
				e.preventDefault();
			}
		}
	}
}

function installClick(e) {
	// find ext id

	// http://chrome.google.com/webstore/permalink?id=pebppomjfocnoigkeepgbmcifnnlndla
	// https://chrome.google.com/webstore/report/pebppomjfocnoigkeepgbmcifnnlndla?hl=en-US&amp;gl=US


	// figure out id
	var id;
	var idPatt = /permalink\?id\=([a-z0-9]*)/i;
	var searchEl = e.target;
	var i = 0;
	var idExec;
	while (i < 20) {
		searchEl = searchEl.parentNode;
		idExec = idPatt.exec(searchEl.innerHTML);
		if (idExec) {
			id = idExec[1];
			break;
		}
	}

	if (!id) {
		alert('Chrome Store Foxified - Error - Failed to extract ID');
	} else {
		// ok do with the id now
		alert('http://chrome.google.com/webstore/permalink?id=' + id);
	}

	// insert modal

}

// start - common helper functions

function formatStringFromNameCore(aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements) {
	// 051916 update - made it core.addon.l10n based
    // formatStringFromNameCore is formating only version of the worker version of formatStringFromName, it is based on core.addon.l10n cache

	// try {
	// 	var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n];
	// } catch (ex) {
	// 	console.error('formatStringFromNameCore error:', ex, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements);
	// }
	var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr];
	// console.log('cLocalizedStr:', cLocalizedStr, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements);
    if (aReplacements) {
        for (var i=0; i<aReplacements.length; i++) {
            cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
        }
    }

    return cLocalizedStr;
}
// start - CommAPI
var gSubContent = this;

// start - CommAPI for bootstrap-content - loadSubScript-sandbox side - cross-file-link0048958576532536411
function contentComm(onHandshakeComplete) {
	// onHandshakeComplete is triggerd when handshake completed and this.postMessage becomes usable
	var scope = gSubContent;
	var handshakeComplete = false; // indicates this.postMessage will now work
	var port;
	this.nextcbid = 1; // next callback id
	this.callbackReceptacle = {};

	this.CallbackTransferReturn = function(aArg, aTransfers) {
		// aTransfers should be an array
		this.arg = aArg;
		this.xfer = aTransfers
	};
	this.listener = function(e) {
		var payload = e.data;
		console.log('content contentComm - incoming, payload:', payload); // , 'e:', e, 'this:', this);

		if (payload.method) {
			if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in WINDOW'); throw new Error('method of "' + payload.method + '" not in WINDOW') } // dev line remove on prod
			var rez_win_call = scope[payload.method](payload.arg, this);
			console.log('content contentComm - rez_win_call:', rez_win_call);
			if (payload.cbid) {
				if (rez_win_call && rez_win_call.constructor.name == 'Promise') {
					rez_win_call.then(
						function(aVal) {
							console.log('Fullfilled - rez_win_call - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_win_call', 0)
					).catch(genericCatch.bind(null, 'rez_win_call', 0));
				} else {
					this.postMessage(payload.cbid, rez_win_call);
				}
			}
		} else if (!payload.method && payload.cbid) {
			// its a cbid
			this.callbackReceptacle[payload.cbid](payload.arg, this);
			delete this.callbackReceptacle[payload.cbid];
		} else {
			console.error('contentComm - invalid combination');
			throw new Error('contentComm - invalid combination');
		}
	}.bind(this);
	this.postMessage = function(aMethod, aArg, aTransfers, aCallback) {

		// aMethod is a string - the method to call in framescript
		// aCallback is a function - optional - it will be triggered when aMethod is done calling
		if (aArg && aArg.constructor == this.CallbackTransferReturn) {
			// aTransfers is undefined - this is the assumption as i use it prorgramtic
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
		port.postMessage({
			method: aMethod,
			arg: aArg,
			cbid
		}, aTransfers ? aTransfers : undefined);
	};

	var winMsgListener = function(e) {
		var data = e.data;
		console.log('content contentComm - incoming window message, data:', uneval(data)); //, 'source:', e.source, 'ports:', e.ports);
		switch (data.topic) {
			case 'contentComm_handshake':

					window.removeEventListener('message', winMsgListener, false);
					port = data.port2;
					port.onmessage = this.listener;
					this.postMessage('contentComm_handshake_finalized');
					handshakeComplete = true;
					if (onHandshakeComplete) {
						onHandshakeComplete(true);
					}

				break;
			default:
				console.error('content contentComm - unknown topic, data:', data);
		}
	}.bind(this);
	window.addEventListener('message', winMsgListener, false);

}
// end - CommAPI for bootstrap-content - content side - cross-file-link0048958576532536411
// end - CommAPI
// end - common helper functions

gFsComm = new contentComm(init); // the onHandshakeComplete of initPage will trigger AFTER DOMContentLoaded because MainFramescript only does aContentWindow.postMessage for its new contentComm after DOMContentLoaded see cross-file-link884757009. so i didnt test, but i by doing this here i am registering the contentWindow.addEventListener('message', ...) before it posts. :TODO: i should test what happens if i send message to content first, and then setup listener after, i should see if the content gets that message (liek if it was waiting for a message listener to be setup, would be wonky if its like this but cool) // i have to do this after `var gContent = window` otherwise gContent is undefined
