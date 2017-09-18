// @flow

type StatusOk = void;
type StatusFail = { [string]:string }; // redux-form SubmissionError style keys ie: _error for whole form
type StatusReject = StatusFail => void;
type StatusResolve = StatusOk => void
type StatusPromise = Promise<StatusOk | StatusFail>
export type StatusInjection = { promise:StatusPromise, resolve:StatusResolve, reject:StatusReject }
export function injectStatusPromise(action) {
    action.promise = new Promise((resolve, reject) => {
        action.resolve = resolve;
        action.reject = reject;
    });
    return action;
}
