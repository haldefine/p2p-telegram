const messages = require('../scripts/messages');

const BinanceService = require('./binance-service');
const { sender } = require('./sender');
const {
    userDBService,
    botDBService
} = require('./db');

class EventsService {
    constructor () {
        this.lastErrorTime = 0;
    }

    async handleEvent(message) {
        const data = JSON.parse(message);
        const bot = await botDBService.get({ id: data.botId });

        if (!bot) {
            console.log(`Can't find bot`, data);
            return null;
        }

        if (data.error) {
            await this.proceedError(bot, data);
        }

        if (data.order && data.responses) {
            const order = JSON.parse(data.order);
            const responses = JSON.parse(data.responses);

            await this.proceedOrder(bot, order, responses);
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
                await teact.sendMessage(userId, `Bot: ${bot.name}\nError: ${data.error}`, {
                    disable_web_page_preview: true,
                });
            }
        }
    }


    async proceedOrder(bot, order, responses) {
        const users = await userDBService.getAll({ tg_id: { $in: bot.assignedToUser }});

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

            responsesTextUser += messages.orderTextForUser('en', orderNo, binanceResponse.message || binanceResponse.msg);
            responsesTextAdmin += messages.orderTextForAdmin('en', orderNo, proxy.host, proxy.username, response.delay, binanceResponse.message || binanceResponse.msg);

            if (binanceResponse.code === '000000') {
                const payMethods = [];

                result = 'success';
                taken.push(binanceResponse?.data?.orderMatch?.totalPrice);
                ordersData.push({
                    payMethods: `[${payMethods.join(', ')}]`,
                    orderNo,
                    side,
                    nickname: side === 'BUY' ?
                        binanceResponse?.data?.orderMatch?.sellerNickname :
                        binanceResponse?.data?.orderMatch?.buyerNickname,
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

                        sender.enqueue({
                            chat_id: user.tg_id,
                            message
                        });
                    }
                })().catch(console.log)
            });
        }

        const targetUser = users.find(user => user.role !== 'admin');

        for (const user of users) {
            //const t = translation[user.lang];

            const fullData = {
                //result: t.order[result],
                price: order.price,
                amounts: taken.join(`${bot.fiat}, `),
                coin: bot.coin,
                fiat: bot.fiat,
                totalAmount: order.totalAmount.toFixed(2),
                minVolume: order.min_volume,
                maxVolume: order.max_volume,
                methods: ordersData[0]?.payMethods,
                targetUser,
                binanceUsername: ordersData[0]?.nickname,
                dateTime: this.getTime(),
                botName: bot.name,
                advNo: order.advNo,
                delay: order.delay,
                responses: user.role === 'admin' ?
                    responsesTextAdmin : responsesTextUser
            };
            const message = messages.orderCollapse(user.lang, fullData);

            sender.enqueue({
                chat_id: user.tg_id,
                message,
                expande: messages.orderExpande(user.lang, fullData),
                collapse: message
            });
        }
    }

}

module.exports = new EventsService();