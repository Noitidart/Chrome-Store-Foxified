import 'cmn/lib/extension-polyfill'
import './connect'

import React from 'react'
import { render } from 'react-dom'

import Dashboard from './Dashboard'

window.addEventListener( 'DOMContentLoaded', () => render(<Dashboard />, document.getElementById('root')) );