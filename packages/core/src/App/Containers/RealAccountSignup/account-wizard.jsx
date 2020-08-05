import PropTypes from 'prop-types';
import fromEntries from 'object.fromentries';
import React from 'react';
import { DesktopWrapper, MobileWrapper, Div100vhContainer, FormProgress } from '@deriv/components';
import { isDesktop, toMoment } from '@deriv/shared';
import { Localize } from '@deriv/translations';
import { connect } from 'Stores/connect';
import { makeCancellablePromise } from '_common/base/cancellable_promise';

import { getItems } from './account-wizard-form';

// TODO: [deriv-eu] remove and merge this with the original function in PersonalDetails
const getLocation = (location_list, value, type) => {
    const location_obj = location_list.find(
        location => location[type === 'text' ? 'value' : 'text'].toLowerCase() === value.toLowerCase()
    );

    if (location_obj) return location_obj[type];
    return '';
};

const SetCurrencyHeader = ({ has_target, has_real_account, has_currency, items, step }) => (
    <React.Fragment>
        {(!has_real_account || has_target) && (
            <React.Fragment>
                <DesktopWrapper>
                    <FormProgress steps={items} current_step={step} />
                </DesktopWrapper>
                <MobileWrapper>
                    <div className='account-wizard__header-steps'>
                        <h4 className='account-wizard__header-steps-title'>
                            <Localize
                                i18n_default_text='Step {{step}}: {{step_title}} ({{step}} of {{steps}})'
                                values={{
                                    step: step + 1,
                                    steps: items.length,
                                    step_title: items[step].header.title,
                                }}
                            />
                        </h4>
                        {items[step].header.active_title && (
                            <h4 className='account-wizard__header-steps-subtitle'>{items[step].header.active_title}</h4>
                        )}
                    </div>
                </MobileWrapper>
            </React.Fragment>
        )}
        <DesktopWrapper>
            {has_real_account && !has_target && (
                <div className='account-wizard__set-currency'>
                    {!has_currency && (
                        <p>
                            <Localize i18n_default_text='You have an account that do not have currency assigned. Please choose a currency to trade with this account.' />
                        </p>
                    )}
                    <h2>
                        <Localize i18n_default_text='Please choose your currency' />
                    </h2>
                </div>
            )}
        </DesktopWrapper>
    </React.Fragment>
);

class AccountWizard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            finished: undefined,
            mounted: true,
            step: 0,
            form_error: '',
            items: [],
        };
    }

    componentDidMount() {
        this.fetchFromStorage();
        this.props.fetchStatesList();
        const { cancel, promise } = makeCancellablePromise(this.props.fetchResidenceList());
        this.cancel = cancel;
        promise
            .then(() => {
                this.setState({
                    items: getItems(this.props),
                    mounted: false,
                });

                if (!this.residence_list?.length) {
                    const items = this.state.items.slice(0);
                    this.getCountryCode().then(phone_idd => {
                        if ('phone' in items[1].form_value) {
                            items[1].form_value.phone = items[1].form_value.phone || phone_idd || '';
                            this.setState(items);
                        }
                    });
                }
            })
            // eslint-disable-next-line no-unused-vars
            .catch(error => {
                // Cancelled. no op.
            });
    }

    fetchFromStorage = () => {
        const stored_items = localStorage.getItem('real_account_signup_wizard');
        try {
            const items = JSON.parse(stored_items);
            const cloned = this.state.items.slice(0);
            items.forEach((item, index) => {
                if (typeof item === 'object') {
                    cloned[index].form_value = item;
                }
            });
            this.setState({
                items: cloned,
                step: 1, // Send the user back to personal details.
            });
            localStorage.removeItem('real_account_signup_wizard');
        } catch (e) {
            localStorage.removeItem('real_account_signup_wizard');
        }
    };

    get form_values() {
        return this.state.items
            .map(item => item.form_value)
            .reduce((obj, item) => {
                const values = fromEntries(new Map(Object.entries(item)));
                if (values.date_of_birth) {
                    values.date_of_birth = toMoment(values.date_of_birth).format('YYYY-MM-DD');
                }
                if (values.place_of_birth) {
                    values.place_of_birth = values.place_of_birth
                        ? getLocation(this.props.residence_list, values.place_of_birth, 'value')
                        : '';
                }
                if (values.citizen) {
                    values.citizen = values.citizen
                        ? getLocation(this.props.residence_list, values.citizen, 'value')
                        : '';
                }

                if (values.tax_residence) {
                    values.tax_residence = values.tax_residence
                        ? getLocation(this.props.residence_list, values.tax_residence, 'value')
                        : values.tax_residence;
                }

                if (values.address_state) {
                    values.address_state = this.props.states_list.length
                        ? getLocation(this.props.states_list, values.address_state, 'value')
                        : values.address_state;
                }

                return {
                    ...obj,
                    ...values,
                };
            });
    }

    get state_index() {
        return this.state.step;
    }

    get has_target() {
        return this.props.real_account_signup_target !== 'manage';
    }

    getCountryCode = async () => {
        await this.props.fetchResidenceList();
        this.props.fetchStatesList();
        const response = this.props.residence_list.find(item => item.value === this.props.residence);
        if (!response || !response.phone_idd) return '';
        return `+${response.phone_idd}`;
    };

    clearError = () => {
        this.setState({
            form_error: '',
        });
    };

    getCurrent = key => {
        return key ? this.state.items[this.state_index][key] : this.state.items[this.state_index];
    };

    getFinishedComponent = () => {
        return this.state.finished;
    };

    nextStep = setSubmitting => {
        this.clearError();
        // Check if account wizard is not finished
        if (this.hasMoreSteps()) {
            this.goNext();
        } else {
            this.props.onLoading();
            this.createRealAccount(setSubmitting);
        }
    };

    prevStep = () => {
        if (this.state.step - 1 < 0) {
            this.cancel();
            this.props.onClose();
            return;
        }

        this.setState({
            step: this.state.step - 1,
            form_error: '',
        });
    };

    submitForm = () => {
        const clone = { ...this.form_values };
        delete clone?.tax_identification_confirm; // This is a manual field and it does not require to be sent over

        return this.props.realAccountSignup(clone);
    };

    setAccountCurrency = () => this.props.setAccountCurrency(this.form_values.currency);

    updateValue = (index, value, setSubmitting) => {
        this.saveFormData(index, value);
        this.nextStep(setSubmitting);
    };

    saveFormData = (index, value) => {
        const cloned_items = Object.assign([], this.state.items);
        cloned_items[index].form_value = value;

        this.setState({
            items: cloned_items,
        });
    };

    getPropsForChild = () => {
        const passthrough = this.getCurrent('passthrough');
        const props = this.getCurrent('props') || {};

        if (passthrough && passthrough.length) {
            passthrough.forEach(item => {
                Object.assign(props, { [item]: this.props[item] });
            });
        }
        return props;
    };

    createRealAccount(setSubmitting) {
        if (this.props.has_real_account && !this.props.has_currency) {
            this.setAccountCurrency()
                .then(response => {
                    this.props.onFinishSuccess(response.echo_req.set_account_currency.toLowerCase());
                })
                .catch(error_message => {
                    this.setState(
                        {
                            form_error: error_message,
                        },
                        () => setSubmitting(false)
                    );
                });
        } else {
            this.submitForm()
                .then(response => {
                    if (this.props.real_account_signup_target === 'maltainvest') {
                        this.props.onFinishSuccess(response.new_account_maltainvest.currency.toLowerCase());
                    } else {
                        this.props.onFinishSuccess(response.new_account_real.currency.toLowerCase());
                    }
                })
                .catch(error => {
                    this.props.onError(error, this.state.items);
                });
        }
    }

    goNext() {
        this.setState({
            step: this.state.step + 1,
        });
    }

    hasMoreSteps() {
        if (!this.props.has_currency && this.props.has_real_account) {
            return false;
        }
        return this.state.step + 1 < this.state.items.length;
    }

    render() {
        if (this.state.mounted) return null;
        if (!this.state.finished) {
            const BodyComponent = this.getCurrent('body');
            const passthrough = this.getPropsForChild();
            return (
                <div className='account-wizard'>
                    <SetCurrencyHeader
                        has_real_account={this.props.has_real_account}
                        step={this.state.step}
                        items={this.state.items}
                        has_currency={this.props.has_currency}
                        has_target={this.has_target}
                    />
                    <Div100vhContainer className='account-wizard__body' is_disabled={isDesktop()} height_offset='110px'>
                        <BodyComponent
                            value={this.getCurrent('form_value')}
                            index={this.state_index}
                            onSubmit={this.updateValue}
                            onCancel={this.prevStep}
                            onSave={this.saveFormData}
                            has_currency={this.props.has_currency}
                            form_error={this.state.form_error}
                            {...passthrough}
                        />
                    </Div100vhContainer>
                </div>
            );
        }

        const FinishedModalItem = this.getFinishedComponent();
        return <FinishedModalItem />;
    }
}

AccountWizard.propTypes = {
    fetchResidenceList: PropTypes.func,
    has_currency: PropTypes.bool,
    has_real_account: PropTypes.bool,
    onError: PropTypes.func,
    onLoading: PropTypes.func,
    onFinishSuccess: PropTypes.func,
    realAccountSignup: PropTypes.func,
    residence: PropTypes.string,
    residence_list: PropTypes.array,
    setAccountCurrency: PropTypes.func,
};

export default connect(({ client, ui }) => ({
    account_settings: client.account_settings,
    is_fully_authenticated: client.is_fully_authenticated,
    realAccountSignup: client.realAccountSignup,
    has_real_account: client.has_active_real_account,
    real_account_signup_target: ui.real_account_signup_target,
    has_currency: !!client.currency,
    setAccountCurrency: client.setAccountCurrency,
    residence: client.residence,
    residence_list: client.residence_list,
    states_list: client.states_list,
    fetchStatesList: client.fetchStatesList,
    fetchResidenceList: client.fetchResidenceList,
    refreshNotifications: client.refreshNotifications,
}))(AccountWizard);
