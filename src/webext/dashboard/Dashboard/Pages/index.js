// @flow

import React, { PureComponent } from 'react'
import { Route, Switch, withRouter } from 'react-router-dom'

import CounterPage from './CounterPage'
import DashboardPage from './DashboardPage'
import SettingsPage from './SettingsPage'
import InstallPage from './InstallPage'

import './index.css'

const PAGES = [
    { path:'/',                     label:'Dashboard', Body:DashboardPage  },
    { path:'/counter',              label:'Counter',   Body:CounterPage  },
    { path:'/settings',             label:'Settings',  Body:SettingsPage },
    { path:'/install/:kind/:extid', label:null,        Body:InstallPage }

]

type Props = {

}

class PagesDumb extends PureComponent<Props, void> {
    render() {
        return (
            <div className="Page">
                <Switch>
                    { PAGES.map( ({ Body, path }) => <Route path={path} key={path} exact component={Body} /> ) }
                </Switch>
            </div>
        )
    }
}

const Pages = withRouter(PagesDumb)

export { PAGES }
export default Pages
