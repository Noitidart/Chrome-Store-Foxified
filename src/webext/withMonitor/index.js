// @flow

import React from 'react'
import wrapDisplayName from 'recompose/wrapDisplayName'
import shallowEqual from 'recompose/shallowEqual'

/* USAGE:
await this.monitor( ()=> this.state.blah === true )
*/
type PredicateTruthyReturn = any;
type PredicateFalsyReturn = 0 | false | void | null;
type Predicate = (props:{}, state:{}) => PredicateTruthyReturn | PredicateFalsyReturn;
type PredicateWrapped = () => void;

type MonitorChange = (predicate: Predicate) => Promise<PredicateTruthyReturn>;

type Monitors = Array<{
    predicateWrapped: PredicateWrapped,
    predicate: Predicate
}>

function withMonitor(WrappedComponent) {
    return (
        class WithMonitor extends WrappedComponent {
            static displayName = wrapDisplayName(WrappedComponent, 'withMonitor')

            monitors: Monitors = []

            componentDidUpdate(propsOld: {}, stateOld: {}) {
                if (!shallowEqual(this.state, stateOld) || !shallowEqual(this.props, propsOld)) {
                    // execute predicateWrapped's
                    const predicateWrappeds = this.monitors.slice(); // TODO: can i just .forEach and execute predicateWrapped this? worry is that it modifies the array itself with splice thats why i cloned (i always forget if thats safe), test this
                    predicateWrappeds.forEach( ( { predicateWrapped }) => predicateWrapped() );
                }

                if (super.componentDidUpdate) super.componentDidUpdate(propsOld, stateOld);
            }
            render() {
                return super.render();
            }

            monitor: MonitorChange = predicate => {
                return new Promise (resolve => {
                    const { monitors } = this;
                    const hasPredicate = monitors.find( monitor => monitor.predicate === predicate );
                    if (hasPredicate) throw new Error('monitor already installed');
                    const predicateWrapped: PredicateWrapped = () => {
                        const rez = predicate(this.props, this.state);
                        if (rez) {
                            const ix = monitors.findIndex( aPredicateWrapped => aPredicateWrapped === predicateWrapped );
                            monitors.splice(ix, 1);
                            resolve(rez);
                        }
                    }
                    monitors.push({ predicateWrapped, predicate });
                })
            }
        }
    )
}

export default withMonitor
