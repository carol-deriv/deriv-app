import React from 'react';
import { Loading, Text } from '@deriv/components';
import { daysSince, isMobile } from '@deriv/shared';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useStores } from 'Stores';
import PageReturn from 'Components/page-return/page-return.jsx';
import { Localize, localize } from 'Components/i18next';
import { buy_sell } from 'Constants/buy-sell';
import RateChangeModal from 'Components/buy-sell/rate-change-modal.jsx';
import BuySellModal from 'Components/buy-sell/buy-sell-modal.jsx';
import RecommendedBy from 'Components/recommended-by';
import UserAvatar from 'Components/user/user-avatar/user-avatar.jsx';
import AdvertiserPageStats from './advertiser-page-stats.jsx';
import AdvertiserPageAdverts from './advertiser-page-adverts.jsx';
import StarRating from 'Components/star-rating';
import TradeBadge from '../trade-badge/trade-badge.jsx';
import './advertiser-page.scss';

const AdvertiserPage = () => {
    const { advertiser_page_store, buy_sell_store } = useStores();

    const {
        basic_verification,
        buy_orders_count,
        created_time,
        first_name,
        full_verification,
        last_name,
        rating_average,
        rating_count,
        recommended_average,
        recommended_count,
        sell_orders_count,
    } = advertiser_page_store.advertiser_info;

    // rating_average_decimal converts rating_average to 1 d.p number
    const rating_average_decimal = rating_average ? Number(rating_average).toFixed(1) : null;
    const joined_since = daysSince(created_time);

    React.useEffect(() => {
        advertiser_page_store.onMount();

        return reaction(
            () => advertiser_page_store.active_index,
            () => advertiser_page_store.onTabChange(),
            { fireImmediately: true }
        );

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (advertiser_page_store.is_loading) {
        return <Loading is_fullscreen={false} />;
    }

    if (advertiser_page_store.error_message) {
        return <div className='advertiser-page__error'>{advertiser_page_store.error_message}</div>;
    }

    return (
        <div className='advertiser-page'>
            <RateChangeModal onMount={advertiser_page_store.setShowAdPopup} />
            <BuySellModal
                selected_ad={advertiser_page_store.advert}
                should_show_popup={advertiser_page_store.show_ad_popup}
                setShouldShowPopup={advertiser_page_store.setShowAdPopup}
                table_type={advertiser_page_store.counterparty_type === buy_sell.BUY ? buy_sell.BUY : buy_sell.SELL}
            />
            <PageReturn
                className='buy-sell__advertiser-page-return'
                onClick={buy_sell_store.hideAdvertiserPage}
                page_title={localize("Advertiser's page")}
            />
            <div className='advertiser-page-details-container'>
                <div className='advertiser-page__header-details'>
                    <UserAvatar
                        nickname={advertiser_page_store.advertiser_details_name}
                        size={isMobile() ? 32 : 64}
                        text_size={isMobile() ? 's' : 'sm'}
                    />
                    <div className='advertiser-page__header-name--column'>
                        <div className='advertiser-page__header-name'>
                            <Text color='prominent' line-height='m' size='s' weight='bold'>
                                {advertiser_page_store.advertiser_details_name}
                            </Text>
                            {first_name && last_name && (
                                <div className='advertiser-page__header-real-name'>
                                    <Text color='less-prominent' line_height='xs' size='xs'>
                                        {`(${first_name} ${last_name})`}
                                    </Text>
                                </div>
                            )}
                        </div>
                        <div className='advertiser-page__rating'>
                            <div className='advertiser-page__rating--row'>
                                {rating_average && recommended_average ? (
                                    <React.Fragment>
                                        <StarRating
                                            empty_star_className='advertiser-page__rating--star'
                                            empty_star_icon='IcEmptyStar'
                                            full_star_className='advertiser-page__rating--star'
                                            full_star_icon='IcFullStar'
                                            initial_value={rating_average_decimal}
                                            is_readonly
                                            number_of_stars={5}
                                            should_allow_hover_effect={false}
                                            star_size={isMobile() ? 17 : 20}
                                        />
                                        <div className='advertiser-page__rating--text'>
                                            <Text color='prominent' size={isMobile() ? 'xxxs' : 'xs'}>
                                                {rating_average_decimal}
                                            </Text>
                                            <Text color='less-prominent' size={isMobile() ? 'xxxs' : 'xs'}>
                                                {rating_count === 1 ? (
                                                    <Localize
                                                        i18n_default_text='({{number_of_ratings}} rating)'
                                                        values={{ number_of_ratings: rating_count }}
                                                    />
                                                ) : (
                                                    <Localize
                                                        i18n_default_text='({{number_of_ratings}} ratings)'
                                                        values={{ number_of_ratings: rating_count }}
                                                    />
                                                )}
                                            </Text>
                                        </div>
                                        <div className='advertiser-page__rating--row'>
                                            <RecommendedBy
                                                recommended_average={recommended_average}
                                                recommended_count={recommended_count}
                                            />
                                        </div>
                                    </React.Fragment>
                                ) : (
                                    <Text color='less-prominent' size={isMobile() ? 'xxxs' : 'xs'}>
                                        <Localize i18n_default_text='Not rated yet' />
                                    </Text>
                                )}
                            </div>
                            <div className='advertiser-page__rating--row'>
                                <Text color='less-prominent' size={isMobile() ? 'xxxs' : 'xs'}>
                                    {joined_since > 0 ? (
                                        <Localize
                                            i18n_default_text='Joined {{days_since_joined}}d'
                                            values={{ days_since_joined: joined_since }}
                                        />
                                    ) : (
                                        <Localize i18n_default_text='Joined today' />
                                    )}
                                </Text>
                            </div>
                        </div>
                        <div className='advertiser-page__row'>
                            <TradeBadge
                                is_poa_verified={!!full_verification}
                                is_poi_verified={!!basic_verification}
                                trade_count={Number(buy_orders_count) + Number(sell_orders_count)}
                                large
                            />
                        </div>
                    </div>
                </div>
                <AdvertiserPageStats />
            </div>
            <AdvertiserPageAdverts />
        </div>
    );
};

export default observer(AdvertiserPage);
