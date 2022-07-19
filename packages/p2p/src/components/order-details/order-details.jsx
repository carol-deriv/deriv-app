import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import { Accordion, HintBox, Icon, Text, ThemedScrollbars } from '@deriv/components';
import { getFormattedText, isDesktop, isMobile } from '@deriv/shared';
import { observer } from 'mobx-react-lite';
import { Localize, localize } from 'Components/i18next';
import Chat from 'Components/orders/chat/chat.jsx';
import RatingModal from 'Components/rating-modal';
import StarRating from 'Components/star-rating';
import UserRatingButton from 'Components/user-rating-button';
import OrderDetailsFooter from 'Components/order-details/order-details-footer.jsx';
import OrderDetailsTimer from 'Components/order-details/order-details-timer.jsx';
import OrderInfoBlock from 'Components/order-details/order-info-block.jsx';
import OrderDetailsWrapper from 'Components/order-details/order-details-wrapper.jsx';
import { useStores } from 'Stores';
import PaymentMethodAccordionHeader from './payment-method-accordion-header.jsx';
import PaymentMethodAccordionContent from './payment-method-accordion-content.jsx';
import MyProfileSeparatorContainer from '../my-profile/my-profile-separator-container';
import 'Components/order-details/order-details.scss';

const OrderDetails = observer(({ onPageReturn }) => {
    const { order_store, sendbird_store } = useStores();
    const {
        account_currency,
        advert_details,
        amount_display,
        chat_channel_url: order_channel_url,
        contact_info,
        has_timer_expired,
        id,
        is_active_order,
        is_buy_order_for_user,
        is_buyer_confirmed_order,
        is_completed_order,
        is_pending_order,
        is_reviewable,
        labels,
        local_currency,
        other_user_details,
        payment_info,
        price,
        purchase_time,
        rate,
        review_details,
        should_highlight_alert,
        should_highlight_danger,
        should_highlight_success,
        should_show_lost_funds_banner,
        should_show_order_footer,
        status_string,
    } = order_store?.order_information;

    const { chat_channel_url } = sendbird_store;

    const page_title = is_buy_order_for_user
        ? localize('Buy {{offered_currency}} order', { offered_currency: account_currency })
        : localize('Sell {{offered_currency}} order', { offered_currency: account_currency });

    const rating_average_decimal = review_details ? Number(review_details.rating).toFixed(1) : undefined;

    React.useEffect(() => {
        const disposeListeners = sendbird_store.registerEventListeners();
        const disposeReactions = sendbird_store.registerMobXReactions();

        order_store.setRatingValue(0);
        order_store.setIsRecommended(undefined);

        if (order_channel_url) {
            sendbird_store.setChatChannelUrl(order_channel_url);
        } else {
            sendbird_store.createChatForNewOrder(order_store.order_id);
        }

        return () => {
            disposeListeners();
            disposeReactions();
            order_store.setOrderPaymentMethodDetails(undefined);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (sendbird_store.should_show_chat_on_orders) {
        return <Chat />;
    }

    return (
        <OrderDetailsWrapper page_title={page_title} onPageReturn={onPageReturn}>
            {is_active_order && (
                <RatingModal
                    is_buy_order_for_user={is_buy_order_for_user}
                    is_rating_modal_open={order_store.is_rating_modal_open}
                    onClickDone={() => order_store.confirmOrderRequest(id)}
                    onClickNotRecommended={() => order_store.setIsRecommended(0)}
                    onClickRecommended={() => order_store.setIsRecommended(1)}
                    onClickSkip={() => {
                        order_store.confirmOrderRequest(id);
                        order_store.setIsRatingModalOpen(false);
                    }}
                    onClickStar={order_store.handleRating}
                    rating_value={order_store.rating_value}
                />
            )}
            {should_show_lost_funds_banner && (
                <div className='order-details--warning'>
                    <HintBox
                        icon='IcAlertWarning'
                        message={
                            <Text size='xxxs' color='prominent' line_height='xs'>
                                <Localize i18n_default_text='To avoid loss of funds, please do not use cash transactions. We recommend using e-wallets or bank transfers.' />
                            </Text>
                        }
                        is_warn
                    />
                </div>
            )}
            <div className='order-details'>
                <div className='order-details-card'>
                    <div className='order-details-card__header'>
                        <div className='order-details-card__header--left'>
                            <div
                                className={classNames(
                                    'order-details-card__header-status',
                                    'order-details-card__header-status--info',
                                    {
                                        'order-details-card__header-status--alert': should_highlight_alert,
                                        'order-details-card__header-status--danger': should_highlight_danger,
                                        'order-details-card__header-status--success': should_highlight_success,
                                    }
                                )}
                            >
                                {status_string}
                            </div>
                            {should_highlight_success && (
                                <div className='order-details-card__message'>{labels.result_string}</div>
                            )}
                            {!has_timer_expired && (is_pending_order || is_buyer_confirmed_order) && (
                                <div className='order-details-card__header-amount'>
                                    {getFormattedText(price, local_currency)}
                                </div>
                            )}
                            <div className='order-details-card__header-id'>
                                <Localize i18n_default_text='Order ID {{ id }}' values={{ id }} />
                            </div>
                        </div>
                        <div className='order-details-card__header--right'>
                            <OrderDetailsTimer />
                        </div>
                    </div>
                    <ThemedScrollbars height='unset' className='order-details-card__info'>
                        <div className='order-details-card__info-columns'>
                            <div className='order-details-card__info--left'>
                                <OrderInfoBlock
                                    label={labels.counterparty_nickname_label}
                                    value={
                                        <Text size='xs' line_height='m'>
                                            {other_user_details.name}
                                        </Text>
                                    }
                                />
                            </div>
                            <div className='order-details-card__info--right'>
                                <OrderInfoBlock
                                    label={labels.counterparty_real_name_label}
                                    value={`${other_user_details.first_name} ${other_user_details.last_name}`}
                                />
                            </div>
                        </div>
                        <div className='order-details-card__info-columns'>
                            <div className='order-details-card__info--left'>
                                <OrderInfoBlock
                                    label={labels.left_send_or_receive}
                                    value={getFormattedText(price, local_currency)}
                                />
                                <OrderInfoBlock
                                    label={localize('Rate (1 {{ account_currency }})', { account_currency })}
                                    value={getFormattedText(rate, local_currency)}
                                />
                            </div>
                            <div className='order-details-card__info--right'>
                                <OrderInfoBlock
                                    label={labels.right_send_or_receive}
                                    value={`${amount_display} ${account_currency}`}
                                />
                                <OrderInfoBlock label={localize('Time')} value={purchase_time} />
                            </div>
                        </div>
                        <MyProfileSeparatorContainer.Line className='order-details-card--line' />
                        {is_active_order && (
                            <React.Fragment>
                                {order_store?.has_order_payment_method_details ? (
                                    <div className='order-details-card--padding'>
                                        <Text size='xs' weight='bold'>
                                            {labels.payment_details}
                                        </Text>
                                        <Accordion
                                            className='order-details-card__accordion'
                                            icon_close='IcChevronRight'
                                            icon_open='IcChevronDown'
                                            list={order_store?.order_payment_method_details?.map(payment_method => ({
                                                header: (
                                                    <PaymentMethodAccordionHeader payment_method={payment_method} />
                                                ),
                                                content: (
                                                    <PaymentMethodAccordionContent payment_method={payment_method} />
                                                ),
                                            }))}
                                        />
                                    </div>
                                ) : (
                                    <OrderInfoBlock
                                        className='order-details-card--padding'
                                        label={
                                            <Text size='xs' weight='bold'>
                                                {labels.payment_details}
                                            </Text>
                                        }
                                        value={payment_info || '-'}
                                    />
                                )}
                                <MyProfileSeparatorContainer.Line className='order-details-card--line' />
                                <OrderInfoBlock
                                    className='order-details-card--padding'
                                    label={
                                        <Text size='xs' weight='bold'>
                                            {labels.contact_details}
                                        </Text>
                                    }
                                    value={contact_info || '-'}
                                />
                                <MyProfileSeparatorContainer.Line className='order-details-card--line' />
                                <OrderInfoBlock
                                    className='order-details-card--padding'
                                    label={
                                        <Text size='xs' weight='bold'>
                                            {labels.instructions}
                                        </Text>
                                    }
                                    value={advert_details.description.trim() || '-'}
                                />
                            </React.Fragment>
                        )}
                        {is_completed_order && !review_details && (
                            <React.Fragment>
                                <RatingModal
                                    is_buy_order_for_user={is_buy_order_for_user}
                                    is_rating_modal_open={order_store.is_rating_modal_open}
                                    onClickDone={() => order_store.setOrderRating(id)}
                                    onClickNotRecommended={() => order_store.setIsRecommended(0)}
                                    onClickRecommended={() => order_store.setIsRecommended(1)}
                                    onClickSkip={() => order_store.setIsRatingModalOpen(false)}
                                    onClickStar={order_store.handleRating}
                                    rating_value={order_store.rating_value}
                                />
                                <div className='order-details-card--rating'>
                                    <UserRatingButton
                                        button_text={
                                            is_reviewable ? localize('Rate this transaction') : localize('Not rated')
                                        }
                                        is_disabled={!is_reviewable}
                                        large
                                        onClick={() => order_store.setIsRatingModalOpen(true)}
                                    />
                                </div>
                                <Text color='less-prominent' size='xxxs'>
                                    {!is_reviewable && (
                                        <Localize i18n_default_text='You can no longer rate this transaction.' />
                                    )}
                                </Text>
                            </React.Fragment>
                        )}
                        {review_details && (
                            <div className='order-details-card__ratings'>
                                <Text color='prominent' size='s' weight='bold'>
                                    <Localize i18n_default_text='Your transaction experience' />
                                </Text>
                                <div className='order-details-card__ratings--row'>
                                    <StarRating
                                        empty_star_className='order-details-card__star'
                                        empty_star_icon='IcEmptyStar'
                                        full_star_className='order-details-card__star'
                                        full_star_icon='IcFullStar'
                                        initial_value={rating_average_decimal}
                                        is_readonly
                                        number_of_stars={5}
                                        should_allow_hover_effect={false}
                                        star_size={isMobile() ? 17 : 20}
                                    />
                                    <div className='order-details-card__ratings--row'>
                                        {review_details.recommended === 1 ? (
                                            <React.Fragment>
                                                <Icon
                                                    className='order-details-card__ratings--icon'
                                                    custom_color='var(--status-success)'
                                                    icon='IcThumbsUp'
                                                    size={14}
                                                />
                                                <Text color='prominent' size='xxs'>
                                                    <Localize i18n_default_text='Recommended' />
                                                </Text>
                                            </React.Fragment>
                                        ) : (
                                            <React.Fragment>
                                                <Icon
                                                    className='order-details-card__ratings--icon'
                                                    custom_color='var(--status-danger)'
                                                    icon='IcThumbsDown'
                                                    size={14}
                                                />
                                                <Text color='prominent' size='xxs'>
                                                    <Localize i18n_default_text='Not Recommended' />
                                                </Text>
                                            </React.Fragment>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {should_show_order_footer && isDesktop() && (
                            <MyProfileSeparatorContainer.Line className='order-details-card--line' />
                        )}
                    </ThemedScrollbars>
                    {should_show_order_footer && isDesktop() && (
                        <OrderDetailsFooter order_information={order_store.order_information} />
                    )}
                </div>
                {chat_channel_url && <Chat />}
            </div>
        </OrderDetailsWrapper>
    );
});

OrderDetails.propTypes = {
    onPageReturn: PropTypes.func,
};

export default OrderDetails;
