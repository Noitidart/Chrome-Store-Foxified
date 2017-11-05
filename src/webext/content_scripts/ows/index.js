// @flow

import 'cmn/lib/extension-polyfill'

import { get_extensionID } from '../../cws_pattern'

window.addEventListener('click', genericClick, true);

(function() {
    const style = document.createElement('style');
    style.setAttribute('id', 'foxified-style')
    style.textContent = `
        a.btn-install.btn-install-gray
        {
            background: #28bd00;
            border-radius: 2px;
            box-shadow: 1px 1px 5px rgba(0,0,0,0.3);
            background: linear-gradient(top,#28bd00 0%,#21a100 100%);

            /* to get "Add to Firefox" to be over "Add to Opera" */
            display: flex;
            color: transparent;
        }
        a.btn-install.btn-install-gray::before {
            border-right: 1px solid #71BD4C; /* overide btn-gray border-right */
            color: white; /* override color:transparent i set above */
        }
        a.btn-install::after
        {
            display: block;
            content: "Add To Firefox";
            color: white; /* override color:transparent i set above */
            position: absolute; /* so it overlaps Add to opera */
        }
        .site-message.site-message--top
        {
            display: none;
        }
    `;

    document.documentElement.insertBefore(style, document.documentElement.firstChild);
})()

function uninit() {
	var style = document.getElementById('foxified-style');
	if (style) style.parentNode.removeChild(style);

	window.removeEventListener('click', genericClick, false);
}

function genericClick(e) {
	const target = e.target;
	// console.log('clicked, targetEl:', targetEl.innerHTML);
	if (target) {
        if (e.button !== 0) return;

		const isInstallButton = target.classList.contains('btn-install');

		if (isInstallButton) {
            e.preventDefault();
            e.stopPropagation();
            const extid = get_extensionID(window.location.href);
            if (!extid) alert('Chrome Store Foxified enecountered an error. Failed to figure out extension ID.')
            else extension.runtime.sendMessage({ action:'request-add', kind:'ows', extid });
		}
	}
}
