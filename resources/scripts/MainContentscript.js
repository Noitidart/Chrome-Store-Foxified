// this file is not triggered till DOMContentLoaded

var core;
var gFsComm;

var gAriaLabels = [
	'‏متوفر في Chrome',
	'Налице за Chrome',
	'Chrome এ উপলব্ধ',
	'Disponible a Chrome',
	'K dispozici v Chromu',
	'Tilgængelig til Chrome',
	'Für Chrome verfügbar',
	'Available on Chrome',
	'Disponible en Chrome',
	'Saadaval Chrome\'ile',
	'ΔΙΑΘΕΣΙΜΟ ΣΤΟ CHROME',
	'‏در Chrome موجود است',
	'Available sa Chrome',
	'Saatavilla Chromelle',
	'Disponible sur Chrome',
	'Chrome પર ઉપલ્બ્ધ છે',
	'‏זמין ב-Chrome',
	'Chrome पर उपलब्ध है',
	'Dostupno na Chromeu',
	'Elérhető Chrome-hoz',
	'Tersedia di Chrome',
	'Disponibile su Chrome',
	'Chrome に追加',
	'Chrome에서 사용 가능',
	'Galima „Chrome“',
	'Pieejama Chrome',
	'Tersedia di Chrome',
	'Chrome-ൽ ലഭ്യം',
	'Chrome वर उपलब्ध',
	'Beschikbaar voor Chrome',
	'Tilgjengelig for Chrome',
	'Dostępna dla Chrome',
	'Disponível no Google Chrome',
	'Disponível no Chrome',
	'Disponibilă pe Chrome',
	'Доступно в Chrome',
	'K dispozícii v prehliadači Chrome',
	'Na voljo za Chrome',
	'Доступно у Chrome-у',
	'Lägg till i Chrome',
	'Chrome இல் உள்ளது',
	'Chromeలో అందుబాటులో ఉంది',
	'พร้อมใช้งานบน Chrome',
	'Chrome için mevcut',
	'Доступно для Chrome',
	'Khả dụng trên Chrome',
	'适用于 Chrome 浏览器',
	'加到 Chrome'
];

function init() {
	gFsComm.postMessage('callInBootstrap', {method:'fetchCore',wait:true}, null, function(aCore) {
		console.log('core:', aCore);
		core = aCore;

		window.addEventListener('click', genericClick, true);

		var styleEl = document.createElement('style');
		styleEl.setAttribute('id', 'foxified-style')
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

		// init the react app
		var rootEl = document.createElement('div');
		rootEl.setAttribute('id', 'foxified-root');
		document.documentElement.insertBefore(rootEl, document.documentElement.firstChild);

		ReactDOM.render(
			React.createElement(ReactRedux.Provider, { store },
				React.createElement(AppContainer)
			),
			rootEl
		);

		setTimeout(function() {
			store.dispatch(toggleDisplay(true));
		}, 2000);

		setTimeout(function() {
			store.dispatch(toggleDisplay(false));
		}, 4000);

	});
}
// div[aria-label="Available on Chrome"] .webstore-test-button-label::before
function uninit() {
	var styleEl = document.getElementById('foxified-style');
	if (styleEl) {
		styleEl.parentNode.removeChild(styleEl);
	}

	var rootEl = document.getElementById('foxified-root');
	if (rootEl) {
		rootEl.parentNode.removeChild(rootEl);
	}

	window.removeEventListener('click', genericClick, true);
}

function genericClick(e) {
	var targetEl = e.target;
	// console.log('clicked, targetEl:', targetEl.innerHTML);
	if (targetEl) {

		var isTestBtn = targetEl.classList.contains('webstore-test-button-label');
		var isRoleBtn = (targetEl.getAttribute('role') == 'button');
		var containsTestBtn;
		try {
			containsTestBtn = targetEl.querySelector('.webstore-test-button-label');
		} catch(ignore) {}
		// console.log('isTestBtn:', isTestBtn, 'isRoleBtn:', isRoleBtn, 'containsTestBtn:', containsTestBtn);

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
	var extid;
	var idPatt = /[^a-p]([a-p]{32})[^a-p]/i; // Thanks to @Rob--W the id is accurately obtained: "It is the first 32 characters of the public key's sha256 hash, with the 0-9a-f replaced with a-p"
	var searchEl = e.target;
	var i = 0;
	var idExec;
	while (i < 100) {
		searchEl = searchEl.parentNode;
		if (!searchEl) {
			break;
		}
		idExec = idPatt.exec(searchEl.innerHTML);
		if (idExec) {
			extid = idExec[1];
			break;
		}
	}

	if (!extid) {
		alert(formatStringFromNameCore('fail_extract_id', 'main'));
	} else {

		// figure out name
		var name;
		var searchEl = e.target;
		var i = 0;
		while (i < 100) {
			searchEl = searchEl.parentNode;
			if (!searchEl) {
				break;
			}

			try {
				var nameSearch = searchEl.querySelector('.a-na-d-w');
				var nameFeatured = searchEl.querySelector('.l-w');
				var nameModal = searchEl.querySelector('.e-f-w');

				if (nameSearch) {
					name = nameSearch.textContent.trim();
				} else if (nameFeatured) {
					name = nameFeatured.textContent.trim();
				} else if (nameModal) {
					name = nameModal.textContent.trim();
				}

				if (name) {
					break;
				}
			} catch(ignore) {}
		}

		if (!name) {
			name = formatStringFromNameCore('unknown_ext_name', 'main');
		}
		// ok do with the extid now
		// store.dispatch(addExt(extid, name));
		store.dispatch(replaceStatus(extid, {
			name
		}));
		store.dispatch(showPage(extid));
		store.dispatch(toggleDisplay(true));

		downloadCrx(extid);
	}

	// insert modal

}

function downloadCrx(extid) {
	store.dispatch(updateStatus(extid, {
		downloading_crx: true,
		downloading_crx_failed: undefined
	}));
	gFsComm.postMessage('callInBootstrap', {
		method: 'callInWorker',
		wait: true,
		arg: {
			method: 'downloadCrx',
			wait: true,
			arg: extid
		}
	}, undefined, function(aArg, aComm) {
		console.log('back in content after triggering downloadCrx, got back aArg:', aArg);
		var { request, ok, reason } = aArg; // reason only available when ok==false
		store.dispatch(updateStatus(extid, {
			downloading_crx: false,
			downloaded_crx: ok,
			downloading_crx_failed: ok ? undefined : formatStringFromNameCore('downloading_crx_failed_server', 'main', [request.statusText, request.status, reason])
		}));

		if (ok) {
			convertXpi(extid);
		}
	});
}

function convertXpi(extid) {
	store.dispatch(updateStatus(extid, {
		converting_xpi: true
	}));
	gFsComm.postMessage('callInBootstrap', {
		method: 'callInWorker',
		wait: true,
		arg: {
			method: 'convertXpi',
			wait: true,
			arg: extid
		}
	}, undefined, function(aArg, aComm) {
		console.log('back in content after triggering downloadCrx, got back aArg:', aArg);
		var { request, ok, reason, version } = aArg; // reason only available when ok==false
		store.dispatch(updateStatus(extid, {
			converting_xpi: false,
			converted_xpi: ok,
			asking_perm_or_temp: true,
			version
		}));

	});
}

function signXpi(extid, install_normal) {
	// install_normal is bool, set to true if you want it to go to install_normal after succesful signing_xpi

	store.dispatch(updateStatus(extid, {
		signing_xpi: true,
		asking_perm_or_temp: undefined,
		signing_xpi_failed: undefined
	}));
	gFsComm.postMessage('callInBootstrap', {
		method: 'callInWorker',
		wait: true,
		arg: {
			method: 'signXpi',
			wait: true,
			arg: extid
		}
	}, undefined, function(aArg, aComm) {
		console.log('back in content after triggering downloadCrx, got back aArg:', aArg);
		var { request, ok, reason, reason_details } = aArg; // reason only available when ok==false
		store.dispatch(updateStatus(extid, {
			signing_xpi: undefined,
			downloaded_signed: ok,
			signing_xpi_failed: ok ? undefined : reason,
			reason_details
		}));

		if (ok && install_normal) {
			// TODO: go to install_normal function as perm
			installXpi(extid, false);
		}
	});
}

function installXpi(extid, temp) {
	// install is bool, set to true if you want it to go to install after succesful signing_xpi

	store.dispatch(updateStatus(extid, {
		[temp ? 'unsigned_installing' : 'signed_installing']: true,
		asking_perm_or_temp: undefined
	}));
	gFsComm.postMessage('callInBootstrap', {
		method: 'callInWorker',
		wait: true,
		arg: {
			method: 'installAddon',
			wait: true,
			arg: { extid, temp }
		}
	}, undefined, function(aArg, aComm) {
		console.log('back in content after installing, aArg:', aArg);
		var { request, ok, reason } = aArg; // reason only available when ok==false
		store.dispatch(updateStatus(extid, {
			[temp ? 'unsigned_installing' : 'signed_installing']: undefined,
			[temp ? 'unsigned_installed' : 'signed_installed']: ok
		}));
	});
}

// start - functions called by framescript

// end - functions called by framescript

// start - react-redux

function dispatchInContent(aArg, aComm) {
	// called by framescript
	var { creator, argarr } = aArg;
	store.dispatch(gSubContent[creator].apply(null, argarr))
}

// ACTIONS
const TOGGLE_DISPLAY = 'TOGGLE_DISPLAY'; // should set true or false
const SHOW_PAGE = 'SHOW_PAGE'; // should be a extension id, or any other special ids i give like "all exts" or "prefs" or something
const UPDATE_STATUS = 'UPDATE_STATUS';
const ADD_EXT = 'ADD_EXT';
const REPLACE_STATUS = 'REPLACE_STATUS';

// non-action constants

// ACTION CREATORS
function addExt(extid, name) {
	return {
		type: ADD_EXT,
		extid,
		name
	};
}

function replaceStatus(extid, status) {
	return {
		type: REPLACE_STATUS,
		extid,
		status
	};
}

function toggleDisplay(visible) { // true or false
	return {
		type: TOGGLE_DISPLAY,
		visible
	};
}
function showPage(id) { // extid is extension id
	return {
		type: SHOW_PAGE,
		id
	};
}

function updateStatus(extid, obj) {
	/* key - value
	txt - string
	name - string - extension name
	// progresses
	downloading_crx
	converting_xpi
	signing_xpi
	signing_uploading
	signing_checking
	signing_downloading
	installing
	// flags
	downloaded_crx - bool
	converted_xpi - bool
	downloaded_signed - bool
	signed - bool
	failed_signing - false or string - string is the failed reason
	*/
	return {
		type: UPDATE_STATUS,
		extid,
		obj
	}
}

// REDUCERS
/*
const initialState = {
	visibility: false,
	pageid: null, // is extid
	statuses: {} // object, where key is extid and value is object with keys: txt,
};
*/
function visibility(state=false, action) {
	switch (action.type) {
		case TOGGLE_DISPLAY:
			return action.visible;
		default:
			return state;
	}
}

function pageid(state='PAGE_NONE', action) {
	switch (action.type) {
		case SHOW_PAGE:
			return action.id;
		default:
			return state;
	}
}

function statuses(state={}, action) {
	switch (action.type) {
		case UPDATE_STATUS:

			var { extid, obj } = action;

			var stateEntryOld = state[extid];
			var stateEntryNew = Object.assign({}, stateEntryOld, obj);

			return Object.assign({}, state, {
				[extid]: stateEntryNew
			});

		case ADD_EXT:
			var { extid, name } = action;

			var stateNew;

			if (state[extid]) {
				// dont add, as its already there
				stateNew = state;
			} else {
				stateNew = Object.assign({}, state, {
					[extid]: {
						name
					}
				});
			}

			return stateNew;
		case REPLACE_STATUS:
			var { extid, status } = action;

			var stateEntryOld = state[extid];
			var stateEntryNew = status;

			var stateNew;
			if (React.addons.shallowCompare({props:stateEntryOld}, stateEntryNew)) {
				stateNew = Object.assign({}, state, {
					[extid]: stateEntryNew
				});
			} else {
				// its unchanged
				stateNew = state;
			}

			return stateNew;
		default:
			return state;
	}
}

const foxifiedApp = Redux.combineReducers({
	visibility,
	pageid,
	statuses
});

// STORE
var store = Redux.createStore(foxifiedApp);

var unsubscribe = store.subscribe(() =>
	console.log(store.getState())
);

// REACT COMPONENTS - PRESENTATIONAL
var App = React.createClass({
	render() {
		var { visibility } = this.props;

		var cProps = {
			className: 'foxified-app',
			style: {
				display: visibility ? undefined : 'none'
			}
		};

		return React.createElement('div', cProps,
			React.createElement('link', { rel:'stylesheet', type:'text/css', media:'screen', href:'chrome://chrome-store-foxified-accessible/content/styles/content-app.css' }),
			React.createElement(Modal, null,
				React.createElement(Header),
				React.createElement(PageContainer)
			)
		);
	}
});

var Header = React.createClass({
	render() {
		return React.createElement('div', { className:'foxified-header' })
	}
});

var Modal = React.createClass({
	render() {
		return React.createElement('div', { className:'foxified-modal' },
			React.createElement(Header),
			React.createElement(PageContainer)
		);
	}
});

var ExtActions = React.createClass({
	retry() {
		// short for retryDownloadInstallFlow
		var { extid, status } = this.props;
		if (status.downloading_crx_failed) {
			downloadCrx(extid);
		} else if (status.signing_xpi_failed) {
			signXpi(extid);
		}
	},
	saveCrx() {
		this.save(2);
	},
	saveUnsigned() {
		this.save(0);
	},
	saveSigned() {
		this.save(1);
	},
	save(which) {
		var { version, name } = this.props.status;
		gFsComm.postMessage('callInBootstrap', {
			method: 'callInWorker',
			wait: true,
			arg: {
				method: 'saveToFile',
				wait: true,
				arg: {
					extid: this.props.extid,
					which,
					name,
					version
				}
			}
		}, undefined, function(aArg, aComm) {
			console.log('back in content after triggering saveToFile, got back aArg:', aArg);
			var { ok, reason } = aArg; // reason only available when ok==false
			if (!ok) {
				switch (reason) {
					case 'no_src_file':
							var noSrcFileArr;
							switch (which) {
								case 0:
									noSrcFileArr = [formatStringFromNameCore('no_unsigned_file', 'main')]
								case 1:
									noSrcFileArr = [formatStringFromNameCore('no_signed_file', 'main')]
								case 2:
									noSrcFileArr = [formatStringFromNameCore('no_crx_file', 'main')]
							}
							alert(formatStringFromNameCore('failed_save', 'main', noSrcFileArr))
						break;
				}
			}
		});
	},
	sign: function() {
		var { extid, status, dispatch } = this.props;
		// if (status.asking_perm_or_temp) {
		// 	dispatch( updateStatus(extid, { asking_perm_or_temp:undefined }) );
		// }
		signXpi(extid);
	},
	tempInstall: function() {
		installXpi(this.props.extid, true);
	},
	normInstall: function() {
		installXpi(this.props.extid, false);
	},
	render() {
		var { extid, status, dispatch } = this.props;

		var cChildren = [];
		if (status.downloading_crx_failed || status.signing_xpi_failed) {
			cChildren.push( React.createElement('button', { onClick:this.retry }, formatStringFromNameCore('retry', 'main')) );
		}
		if (status.downloaded_crx) {
			cChildren.push( React.createElement('button', { onClick:this.saveCrx }, formatStringFromNameCore('crx_save', 'main')) );
		}
		if (status.converted_xpi) {
			if (!status.unsigned_installing && !status.unsigned_installed) {
				cChildren.push( React.createElement('button', { onClick:this.tempInstall }, formatStringFromNameCore('unsigned_install', 'main')) );
			}
			cChildren.push( React.createElement('button', { onClick:this.saveUnsigned }, formatStringFromNameCore('unsigned_save', 'main')) );
			if (!status.signing_xpi && !status.downloaded_signed) {
				cChildren.push( React.createElement('button', { onClick:this.sign }, formatStringFromNameCore('sign_unsigned_addon', 'main')) );
			}
		}
		if (status.downloaded_signed) {
			if (!status.signed_installing && !status.signed_installed) {
				cChildren.push( React.createElement('button', { onClick:this.normInstall }, formatStringFromNameCore('signed_install', 'main')) );
			}
			cChildren.push( React.createElement('button', { onClick:this.saveSigned }, formatStringFromNameCore('signed_save', 'main')) );
		}

		return React.createElement('div', { className:'foxified-ext-actions' },
			cChildren
		);
	}
});
var ExtStatus = React.createClass({
	retry(e) {
		var { extid, status } = this.props;

		e.preventDefault(); // so it doesnt changel locaiton to "#"

		if (status.signing_xpi_failed) {
			signXpi(extid);
		} else if (status.downloading_crx_failed) {
			downloadCrx(extid);
		}
	},
	installTemp(e) {
		var { extid } = this.props;

		e.preventDefault(); // so it doesnt changel locaiton to "#"

		installXpi(extid, true);
	},
	installPerm(e) {
		var { extid } = this.props;

		e.preventDefault(); // so it doesnt changel locaiton to "#"

		signXpi(this.props.extid, true);
	},
	close(e) {
		var { dispatch } = this.props;

		e.preventDefault(); // so it doesnt changel locaiton to "#"

		dispatch(toggleDisplay(false));
	},
	render() {
		// downloading_crx_failed - is set to string when failed
		var { extid, status, dispatch } = this.props;

		var cChildren = [];

		cChildren.push(React.createElement('div', { className:'foxified-title' }, status.name));
		cChildren.push(React.createElement('a', { href:'#', className:'foxified-close', onClick:this.close }, '\xD7'));
		cChildren.push(React.createElement('br'));
		if (status.asking_perm_or_temp) {
			cChildren.push(
				React.createElement('div', undefined,
					formatStringFromNameCore('asking_perm_or_temp0', 'main'),
					React.createElement('br'),
					React.createElement('br'),
					React.createElement('div', {style:{fontWeight:'bold', textAlign:'center'}}, formatStringFromNameCore('asking_perm_or_temp1', 'main')),
					React.createElement('br'),
					React.createElement('div', {style:{textAlign:'center'}},
						React.createElement('a', { href:'#', onClick:this.installPerm },
							formatStringFromNameCore('perm_install', 'main')
						),
						React.createElement('br'),
						React.createElement('a', { href:'#', onClick:this.installTemp },
							formatStringFromNameCore('temp_install', 'main')
						)
					),
					React.createElement('br'),
					React.createElement('div', {style:{fontStyle:'italic',textAlign:'center',fontSize:'.9em'}},
						formatStringFromNameCore('asking_perm_or_temp2', 'main'),
						React.createElement('a', { href:'http://addons.mozilla.org/', target:'_blank' },
							'addons.mozilla.org'
						),
						formatStringFromNameCore('asking_perm_or_temp3', 'main')
					)
				)
			);
		}
		if (status.signing_xpi_failed) {
			switch (status.signing_xpi_failed) {
				case 'no_login_amo':
						cChildren.push(formatStringFromNameCore('signing_xpi_failed_no_login_amo', 'main'));
						cChildren.push(
							' ',
							React.createElement('a', {href:'https://addons.mozilla.org/en-US/firefox/users/login?to=%2Fen-US%2Ffirefox%2F', target:'_blank'},
								formatStringFromNameCore('signing_xpi_failed_no_login_amo_link', 'main')
							)
						);
					break;
				case 'missing_field':
						cChildren.push(formatStringFromNameCore('singin_xpi_failed_missing_fields', 'main', [status.reason_details.fields.join(', ')]));
					break;
				case 'no_agree_amo':
						cChildren.push(
							formatStringFromNameCore('signing_failed_agreement', 'main')
						);
						cChildren.push(' ');
						cChildren.push(
							React.createElement('a', {href:'http://addons.mozilla.org/en-US/developers/addon/api/key/', target:'_blank'},
								formatStringFromNameCore('signing_failed_agreement_link', 'main')
							)
						);
					break;
				case 'fail_xhr':
						cChildren.push(
							formatStringFromNameCore('signing_xpi_failed_xhr', 'main', [status.reason_details.status, status.reason_details.statusText, status.reason_details.url])
						);
						if (status.reason_details.validation_url) {
							cChildren.push(
								React.createElement('a', {href:status.reason_details.validation_url, target:'_blank'},
									formatStringFromNameCore('signing_xpi_failed_report_url', 'main')
								)
							);
						}
					break;
				case 'max_attempts':
						cChildren.push(
							formatStringFromNameCore('signing_xpi_failed_max_attempts', 'main')
						);
						cChildren.push(
							React.createElement('a', {href:status.reason_details.validation_url, target:'_blank'},
								formatStringFromNameCore('signing_xpi_failed_report_url', 'main')
							)
						);
					break;
				default:
					cChildren.push(formatStringFromNameCore('signing_xpi_failed_unknown', 'main'));
					if (status.reason_details.validation_url) {
						cChildren.push(
							React.createElement('a', {href:status.reason_details.validation_url, target:'_blank'},
								formatStringFromNameCore('signing_xpi_failed_report_url', 'main')
							)
						);
					}
			}
			cChildren.push(
				' ',
				React.createElement('a', {href:'#', onClick:this.retry},
					formatStringFromNameCore('retry', 'main')
				)
			);
		}
		if (status.downloading_crx && !status.downloaded_crx) {
			if (typeof(status.downloading_crx) == 'string') {
				cChildren.push( React.createElement('div', undefined, formatStringFromNameCore('downloading_crx_progress', 'main', [status.downloading_crx])) );
			} else {
				cChildren.push( React.createElement('div', undefined, formatStringFromNameCore('downloading_crx', 'main')) );
			}
		}
		if (status.converting_xpi && !status.converted_xpi) {
			cChildren.push( React.createElement('div', undefined, formatStringFromNameCore('converting_xpi', 'main')) );
		}
		if (status.signing_xpi) {
			var signing_status;
			if (status.signing_xpi === true) {
				signing_status = formatStringFromNameCore('signing_xpi', 'main');
			} else {
				signing_status = status.signing_xpi; // note: so signing_xpi can be a string
			}
			cChildren.push( React.createElement('div', undefined, signing_status) );
		}
		if (status.downloading_crx_failed) {
			cChildren.push( React.createElement('div', undefined, status.downloading_crx_failed) );
			cChildren.push(
				' ',
				React.createElement('a', {href:'#', onClick:this.retry},
					formatStringFromNameCore('retry', 'main')
				)
			);
		}
		cChildren.push(React.createElement('br'));

		return React.createElement('div', { className:'foxified-ext-status' },
			cChildren
		);
	}
});

var Page = React.createClass({
	render() {
		var { pageid, status, dispatch } = this.props;
		// status is only available if pageid is extid

		var cChildren = [];
		console.error('pageid:', pageid);
		switch (pageid) {
			case 'PAGE_PREFS':

					// not yet supported

				break;
			case 'PAGE_ALL_EXTS':

					// not yet supported

				break;
			case 'PAGE_NONE':

					cChildren.push('showing PAGE_NONE');

				break;
			default:
				// pageid is extid, so we show PAGE_EXT
				var extid = pageid;
				var name = status.name;
				cChildren.push( React.createElement(ExtStatus, { extid, status, dispatch, name, status }) );
				cChildren.push( React.createElement(ExtActions, { extid, status, dispatch, name, status }) );
		}

		return React.createElement('div', { className:'foxified-page' },
			cChildren
		);
	}
});

// REACT COMPONENTS - CONTAINER
const AppContainer = ReactRedux.connect(
	function mapStateToProps(state, ownProps) {
		return {
			visibility: state.visibility
		}
	}
)(App);

const PageContainer = ReactRedux.connect(
	function mapStateToProps(state, ownProps) {
		var { pageid } = state;
		var status;

		switch(pageid) {
			case 'PAGE_PREFS':

					// not yet supported

				break;
			case 'PAGE_ALL_EXTS':

					// not yet supported

				break;
			case 'PAGE_NONE':

					// not yet supported

				break;
			default:
				// PAGE_EXT
				var extid = pageid;
				status = state.statuses[extid];
		}

		return {
			status,
			pageid
		};
	},
	function mapDispatchToProps(dispatch, ownProps) {
		return {
			dispatch
		};
	}
)(Page);
// end - react-redux


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
