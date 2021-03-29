import PropTypes from 'prop-types';
import React from 'react';
import QRCode from 'qrcode.react';
import {
    Timeline,
    DesktopWrapper,
    MobileWrapper,
    ThemedScrollbars,
    Clipboard,
    Icon,
    Loading,
    Text,
} from '@deriv/components';
import { getPropertyValue, isMobile } from '@deriv/shared';
import { localize, Localize } from '@deriv/translations';
import { WS } from 'Services/ws-methods';
import { connect } from 'Stores/connect';
import LoadErrorMessage from 'Components/load-error-message';
import DigitForm from './digit-form.jsx';
import TwoFactorAuthenticationArticle from './two-factor-authentication-article.jsx';

const TwoFactorAuthentication = ({ email_address, is_switching }) => {
    const [is_loading, setLoading] = React.useState(true);
    const [is_two_factor_enabled, setTwoFactorEnabled] = React.useState(false);
    const [is_qr_loading, setQrLoading] = React.useState(false);
    const [error_message, setErrorMessage] = React.useState('');
    const [secret_key, setSecretKey] = React.useState('');
    const [qr_secret_key, setQrSecretKey] = React.useState('');

    React.useEffect(() => {
        getDigitStatus();
    }, []);

    const generateQrCode = async () => {
        setQrLoading(true);
        const generate_response = await WS.authorized.accountSecurity({
            account_security: 1,
            totp_action: 'generate',
        });
        setLoading(false);

        if (generate_response.error) {
            setErrorMessage(generate_response.error.message);
            return;
        }
        const secret_key_value = getPropertyValue(generate_response, ['account_security', 'totp', 'secret_key']);
        const qr_secret_key_value = `otpauth://totp/${email_address}?secret=${secret_key_value}&issuer=Deriv.com`;

        setSecretKey(secret_key_value);
        setQrSecretKey(qr_secret_key_value);
        setQrLoading(false);
    };

    const setEnabled = is_enabled => {
        setTwoFactorEnabled(is_enabled);
        if (!is_enabled) generateQrCode();
    };

    const getDigitStatus = async () => {
        const status_response = await WS.authorized.accountSecurity({ account_security: 1, totp_action: 'status' });

        if (status_response.error) {
            setErrorMessage(status_response.error.message);
            return;
        }

        const is_enabled = !!getPropertyValue(status_response, ['account_security', 'totp', 'is_enabled']);
        if (is_enabled) setEnabled(is_enabled);
        else generateQrCode();

        setLoading(false);
    };

    if (is_loading || is_switching) return <Loading is_fullscreen={false} className='account__initial-loader' />;
    if (error_message) return <LoadErrorMessage error_message={error_message} />;

    const TwoFactorEnabled = (
        <ThemedScrollbars is_bypassed={isMobile()} className='two-factor__scrollbars'>
            <div className='two-factor__wrapper--enabled'>
                <Icon icon='IcQrPhone' className='two-factor__icon' />
                <Text as='h3' align='center' weight='bold' color='prominent' className='two-factor__qr--title'>
                    {localize('2FA enabled')}
                </Text>
                <Text as='h4' size='xs' align='center' className='two-factor__qr--message'>
                    {localize('You have enabled 2FA for your Deriv account.')}
                </Text>
                <Text as='h4' size='xs' align='center' className='two-factor__qr--message'>
                    {localize(
                        'To disable 2FA, please enter the six-digit authentication code generated by your 2FA app below:'
                    )}
                </Text>
                <DigitForm is_enabled={is_two_factor_enabled} setEnabled={setEnabled} />
            </div>
        </ThemedScrollbars>
    );

    const TwoFactorDisabled = (
        <React.Fragment>
            <ThemedScrollbars
                is_bypassed={isMobile()}
                autoHide
                className='two-factor__scrollbars'
                hideHorizontal={true}
            >
                <MobileWrapper>
                    <TwoFactorAuthenticationArticle />
                </MobileWrapper>
                <Text as='h2' color='prominent' weight='bold' className='two-factor__title'>
                    {localize('How to set up 2FA for your Deriv account')}
                </Text>
                <div>
                    <Timeline className='two-factor__timeline'>
                        <Timeline.Item
                            item_title={
                                <Localize
                                    i18n_default_text='Scan the QR code below with your 2FA app. We recommend <0>Authy</0> or <1>Google Authenticator</1>. We do not support <2>Duo Mobile</2>.'
                                    components={[
                                        <a
                                            className='link two-factor__link'
                                            href='https://authy.com/'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            key={0}
                                        />,
                                        <a
                                            className='link two-factor__link'
                                            href='https://github.com/google/google-authenticator/wiki#implementations'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            key={1}
                                        />,
                                        <a
                                            className='link two-factor__link'
                                            href='https://help.duo.com/s/article/2112?language=en_US'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            key={2}
                                        />,
                                    ]}
                                />
                            }
                        >
                            <div className='two-factor__qr'>
                                {is_qr_loading ? (
                                    <Loading is_fullscreen={false} />
                                ) : (
                                    <>
                                        <div className='two-factor__qr--wrapper'>
                                            <QRCode value={qr_secret_key} />
                                        </div>

                                        <Text as='h4' size='xs' align='center' className='two-factor__qr--message'>
                                            {localize(
                                                'If you are unable to scan the QR code, you can manually enter this code instead:'
                                            )}
                                        </Text>
                                        <div className='two-factor__qr--code'>
                                            <Text size='xs'>{secret_key}</Text>
                                            <Clipboard
                                                text_copy={secret_key}
                                                info_message='Click here to copy key'
                                                success_message='Key copied!'
                                                className='two-factor__qr--clipboard'
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </Timeline.Item>
                        <Timeline.Item
                            item_title={localize('Enter the authentication code generated by your 2FA app:')}
                        >
                            <DigitForm is_enabled={is_two_factor_enabled} setEnabled={setEnabled} />
                        </Timeline.Item>
                    </Timeline>
                </div>
            </ThemedScrollbars>
            <DesktopWrapper>
                <TwoFactorAuthenticationArticle />
            </DesktopWrapper>
        </React.Fragment>
    );

    return (
        <section className='two-factor'>
            <div className='two-factor__wrapper'>{is_two_factor_enabled ? TwoFactorEnabled : TwoFactorDisabled}</div>
        </section>
    );
};

TwoFactorAuthentication.propTypes = {
    email_address: PropTypes.string,
    is_switching: PropTypes.bool,
};

export default connect(({ client }) => ({
    email_address: client.email_address,
    is_switching: client.is_switching,
}))(TwoFactorAuthentication);
