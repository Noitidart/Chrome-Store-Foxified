// @flow

import React from 'react'
import { connect } from 'react-redux'
import wrapDisplayName from 'recompose/wrapDisplayName'
import { reduxForm, SubmissionError } from 'redux-form'

import * as API from '../flow-control/api'
import { getStatus, isStatusBusy, splitActionId } from '../flow-control/api/utils'

import withMonitor from '../withMonitor'

import type { Shape as AppShape } from '../flow-control'
import type { ActionStatus } from '../flow-control/api'

type OwnProps = {
    actionId: Id // register_12 or just register
}

type Props = {
    ...OwnProps,
    status: ActionStatus,
    dispatch?: Dispatch
}

// must be wrapped by redux-form

function withApiForm(actionId: string, reduxFormConfig?: {}={}, dispatcher?: ()=>void) {
    return function(WrappedComponent: ComponentType) {
        class WithApiFormDumb extends WrappedComponent<Props> {
            static displayName = wrapDisplayName(WrappedComponent, 'withApiForm')

            constructor(props) {
                super(props);
                this.triggerSubmit = this.props.handleSubmit(this.triggerSubmit);
                this.monitorSubmit = this.props.handleSubmit(this.monitorSubmit);
            }

            render() {
                return super.render();
            }

            triggerSubmit = values => {
                const { dispatch, actionId } = this.props;
                const [ action ] = splitActionId(actionId);
                if (dispatcher) {
                    dispatcher(API[action](values))
                } else {
                    dispatch(API[action](values));
                }
            }
            monitorSubmit = async () => {
                const { actionId, dispatch, status } = this.props;

                if (status === undefined) return console.error('WARNING how getting into monitorSubmit when status is undefined?? this should never happen');
                try {
                    if (isStatusBusy(status)) await this.monitor(this.hasSubmitCompleted); // else status is OK/ERROR
                } catch(ex) {
                    console.error('ex.message:', ex.message);
                    return;
                }

                const {status:{ errors, reply }} = this.props; // must destructure first, because this dispatch happen so fast apparently that it changes props to status undefined
                dispatch(API.update({ [actionId]:undefined }));

                if (errors) throw new SubmissionError({ _err:status, ...errors });
                else this.handleSubmitOk && this.handleSubmitOk(reply);

            }

        }

        const withForm = connect({
            form: `form-${actionId}`,
            ...reduxFormConfig
        });

        const withRedux = connect(
            // function({ api }: AppShape, { actionId }: OwnProps) {
            function({ api }: AppShape) {
                return {
                    status: getStatus(actionId, api)
                }
            }
        )

        return withRedux(withForm(withMonitor(WithApiFormDumb)))
    }
}

export default withApiForm
