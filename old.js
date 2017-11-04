//
const FETCH_API = 'FETCH_API';
const fetchApi = function* fetchApi(input:string, init={}, update): Generator<IOEffect, void, any> {
    while (true) {
        if (call(isServerDown)) {
            yield put(update({ other:'pingDown' }));
            yield take(SERVER_UP);
        }

        init.headers = Object.assign({ Accept:'application/json', 'Content-Type':'application/json' }, init.headers);
        if (init.body) init.body = JSON.stringify(init.body);
        if (!input.startsWith('http')) input = `${SERVER}/api/${input}`;

        let res;
        try {
            res = yield call(fetch, input, init);
        } catch(ex) {
            // is offline probably
            console.log('fetchApi :: fetch ex:', ex.message);
            yield put(update({ isDown:ex.message }));
            continue;
        }

        return res;
    }
}



// pings server until it is back up
const PING_DOWN = A`PING_DOWN`;
type PingDownAction = { type:typeof PING_DOWN };
const pingDown = (): PingDownAction => ({ type:PING_DOWN });

const pingDownSaga = function* pingDownSaga(): Generator<IOEffect, void, any> {
    const updateThis = (thisData?:{}, otherData?:{}) => update({ isLoggedIn:thisData, ...otherData });

    while (true) {
        yield take(PING_DOWN);

        while(true) {
            yield put(updateThis({ code:'FETCHING', placeholders:undefined }));

            let res;
            try {
                res = fetch(SERVER)
            } catch(ex) {
                console.warn('pingDownSaga fetch ex:', ex.message);
                yield put(updateThis({ code:'WAITING', placeholders:['5'] }));
                yield call(delay, 5000);
            }

            if (res.status === 200) {
                yield put(updateThis(undefined));
                break;
            }
        }
    }
}
sagas.push(pingDownSaga);

// pings server until it is back up
const PING_CWS_DOWN = A`PING_CWS_DOWN`;
type PingCwsDownAction = { type:typeof PING_CWS_DOWN };
const pingCwsDown = (): PingCwsDownAction => ({ type:PING_CWS_DOWN });

const pingCwsDownSaga = function* pingCwsDownSaga(): Generator<IOEffect, void, any> {
    const updateThis = (thisData?:{}, otherData?:{}) => update({ isCwsDown:thisData, ...otherData });

    while (true) {
        yield take(PING_CWS_DOWN);

        while (true) {
            yield put(updateThis({ code:'FETCHING', placeholders:undefined }));

            let res;
            try {
                res = fetch(CWS_SERVER)
            } catch(ex) {
                console.warn('pingCwsDownSaga fetch ex:', ex.message);
                yield call(delay, 5000)
                continue;
            }

            if (res.status === 200) {
                yield put(updateThis(undefined));
                break;
            }
        }
    }
}
sagas.push(pingCwsDownSaga);

// pings server until it is logged in
const PING_LOGGEDIN = A`PING_LOGGEDIN`;
type PingLoggedInAction = { type:typeof PING_LOGGEDIN };
const pingLoggedIn = (): PingLoggedInAction => ({ type:PING_LOGGEDIN });

const pingLoggedInSaga = function* pingLoggedInSaga(): Generator<IOEffect, void, any> {

    const updateThis = (thisData?:{}, otherData?:{}) => update({ isLoggedIn:thisData, ...otherData });

    while (true) {
        yield take(PING_LOGGEDIN);

        while (true) {
            yield put(updateThis({ code:'FETCHING' }));
            const res = yield call(fetchApi, SERVER);

            if (res.status === 401) {
                console.warn('pingLoggedInSaga still logged out, got 401');
                yield call(delay, 5000);
                continue;
            }

            if (res.status === 200) {
                yield put(updateThis(undefined));
                break;
            }
        }
    }
}
sagas.push(pingLoggedInSaga);

//
const SIGN = A`SIGN`;
type SignAction = { type:typeof SIGN, values:{| name:string, email:string, password:string, passwordConfirmation:string |} };
const sign = (values): SignAction => ({ type:SIGN, values });

const signSaga = function* sign(action: SignAction): Generator<IOEffect, void, any> {
    while (true) {
        const action: SignAction = yield take(SIGN);
        const { values } = action;
        console.log('in sign saga, values:', values);

        const { updateThis, actionId } = yield call(standardApi, 'validate', action);

        yield put(updateThis({ code:'FETCHING' }));

        yield call(delay, 5000);

        yield put(updateThis({ code:'OK' }));
    }
}
sagas.push(signSaga);
