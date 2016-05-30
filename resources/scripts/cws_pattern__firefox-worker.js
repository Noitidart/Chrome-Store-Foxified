// updated to based on - https://github.com/Rob--W/crxviewer/blob/6113c25e3569e1ec59365ad9a177aa97e2bcda61/src/cws_pattern.js
/**
 * (c) 2014 Rob Wu <rob@robwu.nl>
 */

/* globals location, getPlatformInfo, navigator */
'use strict';

// cws_pattern[1] = extensionID
var cws_pattern = /^https?:\/\/chrome.google.com\/webstore\/.+?\/([a-z]{32})(?=[\/#?]|$)/;
var cws_download_pattern = /^https?:\/\/clients2\.google\.com\/service\/update2\/crx\b.*?%3D([a-z]{32})%26uc/;
// match pattern per Chrome spec
var cws_match_pattern = '*://chrome.google.com/webstore/detail/*';

// Opera add-on gallery
var ows_pattern = /^https?:\/\/addons.opera.com\/.*?extensions\/(?:details|download)\/([^\/]+)/i;
var ows_match_pattern = '*://addons.opera.com/*extensions/details/*';

// string extensionID if valid URL
// null otherwise
function get_extensionID(url) {
    var match = cws_pattern.exec(url);
    if (match) return match[1];
    match = cws_download_pattern.exec(url);
    return match && match[1];
}

// Returns location of CRX file for a given extensionID or CWS url or Opera add-on URL
function get_crx_url(extensionID_or_url) {
    var url;
    var match = ows_pattern.exec(extensionID_or_url);
    if (match) {
        url = 'https://addons.opera.com/extensions/download/';
        url += match[1];
        url += '/';
        return url;
    }
    // Chrome Web Store
    match = get_extensionID(extensionID_or_url);
    var extensionID = match ? match : extensionID_or_url;

    if (!/^[a-z]{32}$/.test(extensionID)) {
        return extensionID_or_url;
    }

    var platformInfo = getPlatformInfoFallback();

    // Omitting this value is allowed, but add it just in case.
    // Source: http://cs.chromium.org/file:omaha_query_params.cc%20GetProdIdString
    var product_id = isChromeNotChromium() ? 'chromecrx' : 'chromiumcrx';
    // Channel is "unknown" on Chromium on ArchLinux, so using "unknown" will probably be fine for everyone.
    var product_channel = 'unknown';
    // As of July, the Chrome Web Store sends 204 responses to user agents when their
    // Chrome/Chromium version is older than version 31.0.1609.0
    var product_version = '9999.0.9999.0';
    // Try to detect the Chrome version, and if it is lower than 31.0.1609.0, use a very high version.
    // $1 = m.0.r.p  // major.minor.revision.patch where minor is always 0 for some reason.
    // $2 = m
    // $3 =     r
    var cr_version = get_stable_chrome_version_by_date() + '.0'; // /Chrome\/((\d+)\.0\.(\d+)\.\d+)/.exec(navigator.userAgent);
    if (cr_version && +cr_version[2] >= 31 && +cr_version[3] >= 1609) {
        product_version = cr_version[1];
    }

    url = 'https://clients2.google.com/service/update2/crx?response=redirect';
    url += '&os=' + platformInfo.os;
    url += '&arch=' + platformInfo.arch;
    url += '&nacl_arch=' + platformInfo.nacl_arch;
    url += '&prod=' + product_id;
    url += '&prodchannel=' + product_channel;
    url += '&prodversion=' + product_version;
    url += '&x=id%3D' + extensionID;
    url += '%26uc';
    return url;
}

// Weak detection of whether the user is using Chrome instead of Chromium/Opera/RockMelt/whatever.
function isChromeNotChromium() {
    try {
        // Chrome ships with a PDF Viewer by default, Chromium does not.
        return null !== navigator.plugins.namedItem('Chrome PDF Viewer');
    } catch (e) {
        // Just in case.
        return false;
    }
}

// Get location of addon gallery for a given extension
function get_webstore_url(url) {
    var cws = cws_pattern.exec(url) || cws_download_pattern.exec(url);
    if (cws) {
        return 'https://chrome.google.com/webstore/detail/' + cws[1];
    }
    var ows = ows_pattern.exec(url);
    if (ows) {
        return 'https://addons.opera.com/extensions/details/' + ows[1];
    }
}

// Return the suggested name of the zip file.
function get_zip_name(url, /*optional*/filename) {
    if (!filename) {
        var extensionID = get_extensionID(url);
        if (extensionID) {
            filename = extensionID;
        } else {
            filename = /([^\/]+?)\/*$/.exec(url)[1];
        }
    }
    return filename.replace(/\.(crx|nex|zip)$/i, '') + '.zip';
}

function is_crx_url(url) {
    return cws_pattern.test(url) || ows_pattern.test(url) || /\.(crx|nex)\b/.test(url);
}

function getParam(name) { // Assume name contains no RegEx-specific char
    var haystack = location.search || location.hash;
    var pattern = new RegExp('[&?#]' + name + '=([^&]*)');
    var needle = pattern.exec(haystack);
    return needle && decodeURIComponent(needle[1]);
}

// start - noit may 20 2016 edits for firefox worker scope
function get_stable_chrome_version_by_date() {
	// returns the current stable google chrome version
	// per https://www.chromium.org/developers/calendar - it assumes that from mar 8, 2016 it is v49, and every 6 weeks after that it will add 1
	const v49_gmt_epoch = 1457395200000;
	const days_in_6_weeks = 42;

	var today_epoch = Date.now();
	var days_between = (today_epoch - v49_gmt_epoch) / 1000 / 60 / 60 / 24;
	var releases_since = Math.floor(days_between / days_in_6_weeks);

	return 49 + releases_since;
}

// taken from verbatim - https://github.com/Rob--W/crxviewer/blob/6f741466f75d7ca48bfa21cba4d0207153073147/src/chrome-platform-info.js#L39-L91
function getPlatformInfoFallback() {
    var os;
    var arch;

    // For the definition of the navigator object, see Chromium's source code:
    //  third_party/WebKit/Source/core/page/NavigatorBase.cpp
    //  webkit/common/user_agent/user_agent_util.cc

    // UA := "Mozilla/5.0 (%s) AppleWebKit/%d.%d (KHTML, like Gecko) %s Safari/%d.%d"
    //                     ^^                                        ^^
    //                     Platform + CPUinfo                        Product, Chrome/d.d.d.d
    // appVersion = UA without "Mozilla/"
    var ua = navigator.appVersion.split('AppleWebKit')[0];
    // After splitting, we get the next string:
    // ua := "5.0 (%s) "

    // The string in comments is the line with the actual definition in user_agent_util.cc,
    // unless said otherwise.
    if (ua.indexOf('Mac') >= 0) {
        // "Intel Mac OS X %d_%d_%d",
        os = 'mac';
    } else if (ua.indexOf('Win') >= 0) {
        // "Windows NT %d.%d%s",
        os = 'win';
    } else if (ua.indexOf('Android') >= 0) {
        // Note: "Linux; " is preprended, so test Android before Linux
        // "Android %s%s",
        os = 'android';
    } else if (ua.indexOf('CrOS') >= 0) {
        // "CrOS "
        // "%s %d.%d.%d",
        os = 'cros';
    } else if (ua.indexOf('BSD') >= 0) {
        os = 'openbsd';
    } else { // if (ua.indexOf('Linux') >= 0) {
        os = 'Linux';
    }

    if (/\barm/.test(ua)) {
        arch = 'arm';
    } else if (/[^.0-9]64(?![.0-9])/.test(ua)) {
        // WOW64, Win64, amd64, etc. Assume 64-bit arch when there's a 64 in the string, not surrounded
        // by dots or digits (this restriction is set to avoid matching version numbers)
        arch = 'x86-64';
    } else {
        arch = 'x86-32';
    }
    return {
        os: os,
        arch: arch,
        nacl_arch: arch
    };
}
// end - noit may 20 2016 edits for firefox worker scope
