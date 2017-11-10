// @flow

import React, { PureComponent } from 'react'
import { Route, Switch, withRouter } from 'react-router-dom'

import CounterPage from './CounterPage'
import DashboardPage from './DashboardPage'
import SettingsPage from './SettingsPage'
import InstallPage from './InstallPage'
import ForumsPage from './ForumsPage'
import ForumPage from './ForumPage'
import TopicPage from './TopicPage'

import './index.css'

const PAGES = [
    { path:'/',                     label:'Dashboard', Body:DashboardPage  },
    { path:'/forums',               label:'Forums',    Body:ForumsPage  },
    { path:'/forum/:kind',          label:null,        Body:ForumPage  },
    { path:'/topic/:kind/:name',    label:null,        Body:TopicPage  },
    { path:'/settings',             label:'Settings',  Body:SettingsPage },
    { path:'/install/:kind/:name',  label:null,        Body:InstallPage }

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
