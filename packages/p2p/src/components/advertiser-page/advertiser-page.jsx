import React from 'react';
import { Button, Dialog, Icon, Loading, Table, Tabs } from '@deriv/components';
import { generateHexColourFromNickname, getShortNickname } from 'Utils/string';
import { height_constants } from 'Utils/height_constants';
import Dp2pContext from 'Components/context/dp2p-context';
import { InfiniteLoaderList } from 'Components/table/infinite-loader-list.jsx';
import { requestWS } from 'Utils/websocket';
import Popup from '../buy-sell/popup.jsx';
import { localize } from '../i18next';
import './advertiser-page.scss';

const RowComponent = React.memo(({ data, is_buy_advert, showAdPopup, style }) => {
    const { advertiser_id } = React.useContext(Dp2pContext);
    const is_my_ad = data.advertiser_id === advertiser_id;

    return (
        <div style={style}>
            <Table.Row className='advertiser-details__adverts-table_row'>
                <Table.Cell>
                    {data.display_min_available}&ndash;{data.display_max_available} {data.offer_currency}
                </Table.Cell>
                <Table.Cell className='advertiser-details__adverts-price' flex='2fr'>
                    {data.display_price_rate} {data.transaction_currency}
                </Table.Cell>
                {is_my_ad ? (
                    <Table.Cell />
                ) : (
                    <Table.Cell className='advertiser-details__adverts-button'>
                        <Button primary small onClick={() => showAdPopup(data)}>
                            {is_buy_advert ? localize('Buy') : localize('Sell')} {data.offer_currency}
                        </Button>
                    </Table.Cell>
                )}
            </Table.Row>
        </div>
    );
});

RowComponent.displayName = 'RowComponent';

const buy_sell_tabs = {
    BUY: {
        text: localize('Buy'),
        value: 'buy',
    },
    SELL: {
        text: localize('Sell'),
        value: 'sell',
    },
};

const AdvertiserPage = ({ navigate, selected_ad, showVerification }) => {
    const { is_advertiser } = React.useContext(Dp2pContext);
    const { advertiser_name, advertiser_id } = selected_ad;
    const [active_index, setActiveIndex] = React.useState(0);
    const [ad, setAd] = React.useState(null);
    const [adverts, setAdverts] = React.useState([]);
    const [counterparty_type, setCounterpartyType] = React.useState(buy_sell_tabs.BUY.value);
    const height_values = [
        height_constants.screen,
        height_constants.core_header,
        height_constants.page_overlay_header,
        height_constants.page_overlay_content_padding,
        height_constants.tabs,
        height_constants.filters,
        height_constants.filters_margin,
        height_constants.table_header,
        height_constants.core_footer,
    ];
    const item_height = 56;
    const [is_loading, setIsLoading] = React.useState(true);
    const [is_mounted, setIsMounted] = React.useState(false);
    const short_name = getShortNickname(advertiser_name);
    const [show_ad_popup, setShowAdPopup] = React.useState(false);
    const [stats, setStats] = React.useState({});
    const { buy_orders_count, completion_rate, release_time_avg, sell_orders_count, total_orders_count } = stats;

    React.useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    React.useEffect(() => {
        if (is_mounted) {
            setIsLoading(true);
            advertiserStats();
            advertiserAdverts();
        }
    }, [is_mounted]);

    React.useEffect(() => {
        advertiserAdverts();
    }, [active_index]);

    const advertiserStats = () => {
        return new Promise(resolve => {
            requestWS({
                p2p_advertiser_stats: 1,
                id: advertiser_id,
            }).then(response => {
                const { p2p_advertiser_stats } = response;
                setStats(p2p_advertiser_stats);
                setIsLoading(false);
                resolve();
            });
        });
    };

    const advertiserAdverts = () => {
        return new Promise(resolve => {
            requestWS({
                p2p_advert_list: 1,
                counterparty_type,
                advertiser_id,
            }).then(response => {
                setAdverts(response);
                resolve();
            });
        });
    };

    const handleTabItemClick = idx => {
        setActiveIndex(idx);
        if (idx === 0) {
            setCounterpartyType(buy_sell_tabs.BUY.value);
        } else {
            setCounterpartyType(buy_sell_tabs.SELL.value);
        }
    };

    const onCancelClick = () => {
        setShowAdPopup(false);
    };

    const onConfirmClick = order_info => {
        const nav = { location: 'buy_sell' };
        navigate('orders', { order_info, nav });
    };

    const Row = props => (
        <RowComponent
            {...props}
            is_buy_advert={counterparty_type === buy_sell_tabs.BUY.value}
            showAdPopup={showAdPopup}
        />
    );

    const showAdPopup = advert => {
        if (!is_advertiser) {
            showVerification();
        } else {
            setAd(advert);
            setShowAdPopup(true);
        }
    };

    if (is_loading) {
        return <Loading is_fullscreen={false} />;
    }

    if (show_ad_popup) {
        return (
            <div className='buy-sell__dialog'>
                <Dialog is_visible={show_ad_popup}>
                    <Popup ad={ad} handleClose={onCancelClick} handleConfirm={onConfirmClick} />
                </Dialog>
            </div>
        );
    }

    return (
        <div className='advertiser-details'>
            <div className='advertiser-details__container'>
                <div className='advertiser-details__header'>
                    <div className='advertiser-details__header-details'>
                        <div
                            className='advertiser-details__header-avatar'
                            style={{ backgroundColor: generateHexColourFromNickname(advertiser_name) }}
                        >
                            {short_name}
                        </div>
                        <div className='advertiser-details__header-name'>{advertiser_name}</div>
                    </div>
                    {/* TODO: add check for id and address verified */}
                    {/* <div className='advertiser-details__header-verification'>
                        <div className='advertiser-details__header-verification-id'>
                            {localize('ID Verified')}
                            <Icon icon='IcCashierVerificationBadge' size={14} />
                        </div>
                        <div className='advertiser-details__header-verification-address'>
                            {localize('Address verified')}
                            <Icon icon='IcCashierVerificationBadge' size={14} />
                        </div>
                    </div> */}
                </div>
                <Table>
                    <Table.Row className='advertiser-details__stats'>
                        <Table.Cell className='advertiser-details__stats-cell'>
                            <div className='advertiser-details__stats-cell-header'>{localize('Total Trades')}</div>
                            <div className='advertiser-details__stats-cell-info'>{total_orders_count || '-'}</div>
                        </Table.Cell>
                        <div className='advertiser-details__stats-cell-separator' />
                        <Table.Cell className='advertiser-details__stats-cell'>
                            <div className='advertiser-details__stats-cell-header'>{localize('Buy')}</div>
                            <div className='advertiser-details__stats-cell-info'>{buy_orders_count || '-'}</div>
                        </Table.Cell>
                        <div className='advertiser-details__stats-cell-separator' />
                        <Table.Cell className='advertiser-details__stats-cell'>
                            <div className='advertiser-details__stats-cell-header'>{localize('Sell')}</div>
                            <div className='advertiser-details__stats-cell-info'>{sell_orders_count || '-'}</div>
                        </Table.Cell>
                        <div className='advertiser-details__stats-cell-separator' />
                        <Table.Cell className='advertiser-details__stats-cell'>
                            <div className='advertiser-details__stats-cell-header'>{localize('Completion')}</div>
                            <div className='advertiser-details__stats-cell-info'>
                                {completion_rate ? `${completion_rate}%` : '-'}
                            </div>
                        </Table.Cell>
                        <div className='advertiser-details__stats-cell-separator' />
                        <Table.Cell className='advertiser-details__stats-cell'>
                            <div className='advertiser-details__stats-cell-header'>{localize('Avg. release')}</div>
                            <div className='advertiser-details__stats-cell-info'>
                                {release_time_avg ? `${(release_time_avg / 3600).toFixed(2)} min` : '-'}
                            </div>
                        </Table.Cell>
                        <Icon icon='IcInfoOutline' size={16} />
                    </Table.Row>
                </Table>
                <div className='advertiser-details__adverts'>
                    <Tabs
                        onTabItemClick={handleTabItemClick}
                        active_index={active_index}
                        className='advertiser-details__adverts-tabs'
                        top
                        header_fit_content
                    >
                        <div label={buy_sell_tabs.BUY.text} />
                        <div label={buy_sell_tabs.SELL.text} />
                    </Tabs>
                    <div className='advertiser-details__adverts-table'>
                        <Table>
                            <Table.Header>
                                <Table.Row className='advertiser-details__adverts-table_row'>
                                    <Table.Head>{localize('Limits')}</Table.Head>
                                    <Table.Head>{localize('Rate (1 USD)')}</Table.Head>
                                    <Table.Head>{''}</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                <InfiniteLoaderList
                                    autosizer_height={`calc(${height_values.join(' - ')})`}
                                    items={adverts}
                                    item_size={item_height}
                                    RenderComponent={Row}
                                />
                            </Table.Body>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvertiserPage;
