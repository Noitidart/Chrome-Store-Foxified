import React, { PureComponent } from 'react'
import { Route, Switch, withRouter } from 'react-router-dom'

import { ENDPOINTS } from '../../connect'

import CounterPage from './CounterPage'
import GalleryPage from './GalleryPage'
import SettingsPage from './SettingsPage'
import ServicesPage from './ServicesPage'

const PAGES = [
    { path:'/',         label:'Gallery',  Body:GalleryPage  },
    { path:'/counter',  label:'Counter',  Body:CounterPage  },
    { path:'/services', label:'Services', Body:ServicesPage },
    { path:'/settings', label:'Settings', Body:SettingsPage }
]

type Props = {

}

class PagesDumb extends PureComponent<Props, void> {
    componentDidMount() {
        console.log('Pages mounted, this.props:', this.props);
        ENDPOINTS.loadSettings = () =>this.props.history.push('settings');
    }
    render() {
        return (
            <div>
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