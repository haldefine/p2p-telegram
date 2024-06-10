import {IBot} from "./models/botModel";
import BinanceService from "./binance-service";

class EventsService {
    private lastErrorTime: number = 0;

    async handleEvent(message: string) {
        const data = JSON.parse(message);
        const bot = await Bot.findOne({id: data.botId})
        if (!bot) {
            console.log(`Can't find bot`, data);
            return
        }
        if (data.error) {
            await this.proceedError(bot, data);
        }
        if (data.order && data.responses) {
            const order = JSON.parse(data.order);
            const responses = JSON.parse(data.responses);
            await this.proceedOrder(bot, order, responses)
        }
    }


    async proceedError(bot: IBot, data: {error: string}) {
        if (['unexpected EOF', 'context deadline exceeded',
            'EOF', 'Timestamp for this request is outside of the recvWindow',
            '{"code":"000000","message":"success","data":[],"total":0,"success":true}'
        ].some(str => data.error.includes(str))) return;
        if (Date.now() > this.lastErrorTime + 1000) {
            this.lastErrorTime = Date.now();
            for (const userId of bot.assignedToUser) {
                await teact.sendMessage(userId, `Bot: ${bot.name}\nError: ${data.error}`, {
                    disable_web_page_preview: true,
                });
            }
        }
    }


    async proceedOrder(bot: IBot,
                       order: {isLimits: boolean, min_volume: number, max_volume: number, totalAmount: number, volume: number, amounts: number[], price: number, advNo: string, delay: number},
                       responses: {response: string, delay: number, numProxy: number}[]
    ) {
        let responsesTextAdmin = '';
        let responsesTextUser = '';

        const users = await User.find({id: {$in: bot.assignedToUser}})
        let result: 'success' | 'unsuccess' | 'limits' = 'unsuccess';
        if (order.isLimits) result = 'limits';
        let ordersData = [];
        let taken = [];
        for (const response of responses) {
            if (!response.response) continue;

            const binanceResponse = JSON.parse(response.response)
            const orderNo = binanceResponse?.data?.orderMatch?.orderNumber
            const side = binanceResponse?.data?.orderMatch?.tradeType;
            const proxy = bot.proxies[response.numProxy];
            responsesTextUser += `orderNo: ${orderNo}\nresponse: ${binanceResponse.message || binanceResponse.msg}\n`
            responsesTextAdmin += `orderNo: ${orderNo}\nproxy: ${proxy.host}:${proxy.username}\ndelay: ${response.delay}\nresponse: ${binanceResponse.message || binanceResponse.msg}\n`

            if (binanceResponse.code === '000000') {
                const payMethods = [];
                taken.push(binanceResponse?.data?.orderMatch?.totalPrice)
                result = 'success';
                ordersData.push({
                    payMethods: `[${payMethods.join(', ')}]`,
                    orderNo,
                    side,
                    nickname: side === 'BUY' ? binanceResponse?.data?.orderMatch?.sellerNickname : binanceResponse?.data?.orderMatch?.buyerNickname,
                })
            }
        }
        for (const order of ordersData) {
            const bot_key = bot.order_keys.find(key => key.name === bot.use_order_key)
            if (!bot_key || bot_key?.isCookie) break;
            BinanceService.waitWhenFulfill(order.orderNo, bot_key.first_key,bot_key.second_key, (status: string) => {
                (async ()=>{
                    for (const user of users) {
                        await teact.sendMessage(user.id, `Status: ${status}\n`+
                            `Bot: ${bot.name}\n` +
                            `Order: ${order.orderNo}`
                        )
                    }
                })().catch(console.log)
            })
        }
        const targetUser = users.find(user => user.role !== "ADMIN");
        for (const user of users) {
            const t = translation[user.lang];

            const fullData = {
                result: t.order[result],
                price: order.price,
                amounts: taken.join(`${bot.fiat}, `),
                coin: bot.coin,
                fiat: bot.fiat,
                totalAmount: order.totalAmount.toFixed(2),
                min_volume: order.min_volume,
                max_volume: order.max_volume,
                methods: ordersData[0]?.payMethods,
                botuser: `@${targetUser?.username}`,
                binanceuser: ordersData[0]?.nickname,
                datetime: this.getTime(),
                botName: bot.name,
                advNo: order.advNo,
                delay: order.delay,
                responses: user.role === "ADMIN" ? responsesTextAdmin : responsesTextUser
            }

            // SEND MESSAGE
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

export default new EventsService();
