import 'cmn/lib/extension-polyfill'
import './connect'

// import { get_crx_url, get_webstore_url } from '../cws_pattern'
// window.get_crx_url = get_crx_url, get_webstore_url;
// window.get_webstore_url = get_webstore_url;

import React from 'react'
import { render } from 'react-dom'

import Dashboard from './Dashboard'

window.addEventListener( 'DOMContentLoaded', () => render(<Dashboard />, document.getElementById('root')) );
