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
    form: string,
    api?: {}, // if cannot rely on redux to connect
    actionId: Id, // register_12 or just register
    dispatch?: ({}) => void // not necessarily dispatch, but anything dispatch-like that gets me to the store
}

type Props = {
    ...OwnProps,
    status: ActionStatus,
    dispatcher: Dispatch // or ownProps.dispatch
}

// must be wrapped by redux-form link910018

function withApiForm() {
    return function(WrappedComponent: ComponentType) {
        class WithApiFormDumb extends WrappedComponent<Props> {
            static displayName = wrapDisplayName(WrappedComponent, 'withApiForm')

            constructor(props) {
                super(props);
                this.triggerSubmit = props.handleSubmit(this.triggerSubmit); // link910018
                this.monitorSubmit = props.handleSubmit(this.monitorSubmit); // link910018
            }

            componentDidUpdate(propsOld) {
                const { status } = this.props;
                const { status:statusOld } = propsOld;

                if (status && status !== statusOld) this.monitorSubmit(); // status changed, so time for new display, it might be that it was so fast that status.code is back to OK and statusOld.code was also OK, thats why i needed reference to object UNLESS its undefiend, then dont monitorSubmit

                if (super.componentDidUpdate) super.componentDidUpdate();
            }
            componentWillMount() {
                if (this.props.status !== undefined) this.monitorSubmit();
                if (super.componentWillMount) super.componentWillMount();
            }

            render() {
                return super.render();
            }

            triggerSubmit = values => {
                const { dispatcher, actionId } = this.props;
                const [ action ] = splitActionId(actionId);
                dispatcher(API[action]({ actionId, values }));
            }

            hasSubmitCompleted = props => !isStatusBusy(props.status)
            monitorSubmit = async () => {
                const { actionId, dispatcher, status } = this.props;

                if (status === undefined) return console.error('WARNING how getting into monitorSubmit when status is undefined?? this should never happen');
                try {
                    if (isStatusBusy(status)) await this.monitor(this.hasSubmitCompleted); // else status is OK/ERROR
                } catch(ex) {
                    console.error('ex.message:', ex.message);
                    return;
                }

                const {status:{ errors, reply }} = this.props; // must destructure first, because this dispatch happen so fast apparently that it changes props to status undefined
                dispatcher(API.update({ [actionId]:undefined }));

                if (errors) throw new SubmissionError({ _err:status, ...errors });
                else if (this.handleSubmitOk) this.handleSubmitOk(reply);

            }

        }

        const withForm = reduxForm();

        const withRedux = connect(
            // function({ api }: AppShape, { actionId }: OwnProps) {
            function({ api:apiState }: AppShape, { actionId, api:apiBackup }: OwnProps) {
                const api = apiState || apiBackup;
                return {
                    status: getStatus(actionId, api)
                }
            },
            function(dispatch: Dispatch, props: OwnProps) {
                return {
                    dispatcher: props.dispatch || dispatch
                }
            }
        )

        return withRedux(withForm(withMonitor(WithApiFormDumb)))
    }
}

export default withApiForm
