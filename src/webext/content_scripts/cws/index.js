// @flow

import 'cmn/lib/extension-polyfill'

window.addEventListener('click', genericClick, true);

(function() {
    const style = document.createElement('style');
    style.setAttribute('id', 'foxified-style')
    style.textContent = `
        div[role=button][aria-label*="CHROME"],
        div[role=button][aria-label*="Chrome"]
        {
            background-color: rgb(124, 191, 54);
            background-image: linear-gradient(to bottom, rgb(124, 191, 54), rgb(101, 173, 40));
            border-color:rgb(78, 155, 25);
        }

        div[role=button][aria-label*="CHROME"] .webstore-test-button-label,
        div[role=button][aria-label*="Chrome"] .webstore-test-button-label
        {
            font-size: 0;
        }

        div[role=button][aria-label*="CHROME"] .webstore-test-button-label::before,
        div[role=button][aria-label*="Chrome"] .webstore-test-button-label::before
        {
            display: flex;
            content: "Add To Firefox";
            justify-content: center;
            align-items: center;
            font-size: 14px;
        }

        /* targeting download div */
        body > div:last-of-type > div:nth-of-type(2),
        /* alt target download div */
        .h-Yb-wa.Yb-wa
        {
            display: none;
        }
    `;

    document.documentElement.insertBefore(style, document.documentElement.firstChild);
})()

function uninit() {
	var style = document.getElementById('foxified-style');
	if (style) style.parentNode.removeChild(style);

	window.removeEventListener('click', genericClick, true);
}

function genericClick(e) {
	const target = e.target;
	console.log('clicked, target:', target.innerHTML);
	if (target) {
        if (e.button !== 0) return;

		const isTestButton = target.classList.contains('webstore-test-button-label');
		const isRoleButton = target.getAttribute('role') === 'button';
		let hasTestButton;
		try {
			hasTestButton = target.querySelector('.webstore-test-button-label');
		} catch(ignore) {} // eslint-disable-line no-empty
		// console.log('isTestButton:', isTestButton, 'isRoleButton:', isRoleButton, 'hasTestButton:', hasTestButton);

		if (isTestButton || (isRoleButton && hasTestButton)) { // eslint-disable-line no-extra-parens
			const ariaLabel = isRoleButton ? target.getAttribute('aria-label') : undefined;
			const buttonLabel = isTestButton ? target.textContent.trim() : undefined;

            console.log('ariaLabel:', ariaLabel, 'btnText:', buttonLabel);
            const patt = /(?:CHROM|Chrom)/;
			if (patt.test(ariaLabel) || patt.test(buttonLabel)) {
                e.stopPropagation();
                e.preventDefault();

                let extid;

                // start figure out id
                const extidPatt = /[^a-p]([a-p]{32})[^a-p]/i; // Thanks to @Rob--W the id is accurately obtained: "It is the first 32 characters of the public key's sha256 hash, with the 0-9a-f replaced with a-p"
                let searchTarget = target;
                let i = 0;
                while (i < 100) {
                    searchTarget = searchTarget.parentNode;
                    if (!searchTarget) break;
                    ([, extid] = extidPatt.exec(searchTarget.innerHTML) || []); // eslint-disable-line no-extra-parens
                    if (extid) break;
                }

                if (!extid) alert('Chrome Store Foxified enecountered an error. Failed to figure out extension ID.')
                else extension.runtime.sendMessage({ action:'request-add', kind:'cws', extid });
			}
		}
	}
}
