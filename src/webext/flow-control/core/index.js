// @flow

export type Shape = {
    id: string,
    version: string,
    locales: string[] // TODO: get enum
}

const INITIAL = {
    id: '~ADDON_ID~',
    version: '~ADDON_VERSION~',
    locales: ['en_US']
    // // startup: string; enum[STARTUP, UPGRADE, DOWNGRADE, INSTALL] - startup_reason
};

export default function reducer(state: Shape = INITIAL) {
    return state;
}