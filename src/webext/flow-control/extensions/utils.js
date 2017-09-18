// @flow

type StatusOk = void;
type StatusFail = { [string]:string }; // redux-form SubmissionError style keys ie: _error for whole form
type StatusResolve = StatusOk => void
type StatusPromise = Promise<StatusOk | StatusFail>
export type StatusInjection = { promise:StatusPromise, resolve:StatusResolve }
export function injectStatusPromise(action) {
    action.promise = new Promise(resolve => action.resolve = resolve);
    return action;
}
