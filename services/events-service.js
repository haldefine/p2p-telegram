const messages = require('../scripts/messages');
const timer = require('../scripts/timer');

const BinanceService = require('./binance-service');
const BotService = require('./bot-service');
const { signals } = require('./sender');
const {
    userDBService,
    botDBService,
    orderDBService
} = require('./db');

class EventsService {
    constructor () {
        this.lastErrorTime = 0;
    }

    async handleEvent(message) {
        const data = (message && typeof message === 'string') ? JSON.parse(message) : message;

        if (data && data.botId) {
            const bot = await botDBService.get({ id: data.botId });

            if (!bot) {
                console.log(`[handleEvent] Can't find bot`, data);
                return null;
            }

            if (data.error) {
                console.log('[handleEvent] Error', data.error);

                await this.proceedError(bot, data);
            }

            if (data.order && data.responses) {
                const order = JSON.parse(data.order);
                const responses = JSON.parse(data.responses);

                console.log('[handleEvent] Order', order);
                console.log('[handleEvent] Resonses', responses);

                await this.proceedOrder(bot, order, responses);
            }
        }
    }

    async proceedError(bot, data) {
        const temp = [
            'unexpected EOF',
            'context deadline exceeded',
            'EOF',
            'Timestamp for this request is outside of the recvWindow',
            '{"code":"000000","message":"success","data":[],"total":0,"success":true}'
        ];

        if (temp.some(str => data.error.includes(str))) return;

        if (Date.now() > this.lastErrorTime + 1000) {
            this.lastErrorTime = Date.now();

            for (const userId of bot.assignedToUser) {
                signals.enqueue({
                    chat_id: userId,
                    message: messages.botError('en', bot, data.error)
                });
            }
        }
    }

    async proceedOrder(bot, order, responses) {
        const users = await userDBService.getAll({
            tg_id: {
                $in: bot.assignedToUser
            }
        });

        let result = (order.isLimits) ?
            'limits' : 'unsuccess';

        let ordersData = [];
        let taken = [];

        let responsesTextAdmin = '';
        let responsesTextUser = '';

        for (const response of responses) {
            if (!response.response)
                continue;

            const binanceResponse = JSON.parse(response.response);
            const orderNo = binanceResponse?.data?.orderMatch?.orderNumber;
            const side = binanceResponse?.data?.orderMatch?.tradeType;
            const proxy = bot.proxies[response.numProxy];

            responsesTextUser += messages.orderTextForUser('en',
                orderNo,
                binanceResponse.message || binanceResponse.msg
            );
            responsesTextAdmin += messages.orderTextForAdmin('en',
                orderNo,
                proxy.host,
                proxy.username,
                response.delay,
                binanceResponse.message || binanceResponse.msg
            );

            console.log(responsesTextUser, responsesTextAdmin)

            if (binanceResponse.code === '000000') {
                // const payMethods = [];

                result = 'success';
                taken.push(binanceResponse?.data?.orderMatch?.totalPrice);
                ordersData.push({
                    // payMethods: `[${payMethods.join(', ')}]`,
                    orderNo,
                    side,
                    // nickname: side === 'BUY' ?
                    //     binanceResponse?.data?.orderMatch?.sellerNickname :
                    //     binanceResponse?.data?.orderMatch?.buyerNickname,
                });
            }
        }

        for (const order of ordersData) {
            const bot_key = bot.order_keys.find(key => key.name === bot.use_order_key);

            if (!bot_key || bot_key?.isCookie)
                break;

            BinanceService.waitWhenFulfill(order.orderNo, bot_key.first_key, bot_key.second_key, (status) => {
                (() => {
                    for (const user of users) {
                        const message = messages.order(user.lang, status, bot.name, order.orderNo);

                        signals.enqueue({
                            chat_id: user.tg_id,
                            message
                        });
                    }
                })()
            });
        }

        //const targetUser = users.find(user => user.role !== 'admin');

        for (const user of users) {
            const fullData = {
                tg_id: user.tg_id,
                bot_id: bot.id,
                result: (user.registrationStatus === '3days') ?
                    'new' : result,
                price: order.price,
                amounts: taken.join(`${bot.fiat}, `),
                coin: bot.coin,
                fiat: bot.fiat,
                totalAmount: order.totalAmount.toFixed(2),
                minVolume: order.min_volume,
                maxVolume: order.max_volume,
                user,
                dateTime: this.getTime(),
                botName: bot.name,
                advNo: order.advNo,
                orderNo: '',
                delay: order.delay,
                responses: user.role === 'admin' ?
                    responsesTextAdmin : responsesTextUser,
                marketPrice: order.marketPrice,
                diffPrice: ((order.marketPrice / order.price - 1) * 100).toFixed(1),
                // methods: ordersData[0]?.payMethods,
                // binanceUsername: ordersData[0]?.nickname,
                methods: order.methods,
                binanceUsername: order.nickname,
            };

            const message = messages.orderCollapse(user.lang, fullData);

            signals.enqueue({
                chat_id: user.tg_id,
                message,
                expand: messages.orderExpand(user.lang, fullData),
                collapse: message
            });

            if (user.registrationStatus !== '3days') {
                await orderDBService.create(fullData);
            }

            if (user.registrationStatus === 'free') {
                await BotService.stopBot(bot.id);
            }

            if (user.registrationStatus === '3orders') {
                const counter = await orderDBService.getCount({ tg_id: user.tg_id });

                if (counter >= 3) {
                    await userDBService.update({ tg_id: user.tg_id }, { registrationStatus: 'free' });
                    await BotService.stopBot(bot.id);

                    timer.remind(user, 'reachedFreeOrderLimit', 3600000);
                } else if (counter === 2) {
                    timer.remind(user, 'lastOrder', 600000);
                }
            }
        }
    }

    getTime() {
        const now = new Date();

        const year = now.getUTCFullYear();
        const month = (now.getUTCMonth() + 1).toString().padStart(2, '0'); // getUTCMonth() возвращает месяц от 0 до 11
        const day = now.getUTCDate().toString().padStart(2, '0');
        const hours = now.getUTCHours().toString().padStart(2, '0');
        const minutes = now.getUTCMinutes().toString().padStart(2, '0');
        const seconds = now.getUTCSeconds().toString().padStart(2, '0');

        return `${year}.${month}.${day} ${hours}:${minutes}:${seconds} UTC`;
    }
}

module.exports = new EventsService();
