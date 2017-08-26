declare var extension : {
    [string]: { // extension.browserAction
        [string]: (...any) => any | { // extension.browserAction.setTitle | // extension.browserAction.onClicked
            [string]: (...any) => any // extension.browserAction.onClicked.addListener
        }
    }
}

declare var extensiona : (...string) => Promise<any>