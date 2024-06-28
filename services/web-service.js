const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const helper = require('../scripts/helper');
const messages = require('../scripts/messages');

const BinanceService = require("./binance-service");
const {
    promoDBService,
    userDBService
} = require('./db');
const { sender } = require('./sender');

class WebService {
    constructor() {
        const app = express();

        app.use(bodyParser.text());
        app.use(bodyParser.json());

        app.post('/', (req, res) => {
            if (this.eventHandler) {
                this.eventHandler(req.body).catch(console.log);
            }

            res.send('Success');
        });
        app.post('/payment/:type', async (req, res) => {
            const CONFIG = helper.getConfig();

            const {
                params,
                body
            } = req;

            let message = null;

            if (params.type === 'success') {
                const { order_id } = body;

                console.log(body)

                if (order_id) {
                    const match = order_id.split('-');

                    if (match[0] === 'subscription') {
                        const days = (Number(match[1])) ? Number(match[1]) : 30;
                        const sub_end_date = new Date();
                        sub_end_date.setDate(sub_end_date.getDate() + days);

                        let user = await userDBService.update({ tg_id: match[2] }, {
                            registrationStatus: 'subscription',
                            sub_end_date
                        }, 'after');

                        const key = (user.assignedBots.length === 0) ? 'create' : 'start';

                        if (!user.isPromoCodeActivated && user.promo_code) {
                            const promo = await promoDBService.get({ id: user.promo_code });

                            user = await userDBService.update({ tg_id: user.tg_id }, { isPromoCodeActivated: true });

                            console.log('Promo', promo);
                        }

                        message = messages.subscriptionPaidSuccessfullyLogs('en', user, body, days);

                        sender.enqueue({
                            chat_id: user.tg_id,
                            message: messages.subscriptionPaidSuccessfully(user.lang, key)
                        });
                    }
                }
            } else if (params.type === 'cancel') {
                console.log('[payment]', body);

                message = messages.paidFailedLogs('en', body);
            }

            if (message) {
                sender.enqueue({
                    chat_id: CONFIG['LOGS'],
                    message
                });
            }

            res.send('Success');
        });
        app.listen(8081, () => {
            console.log('Server is listening on port 8081');
        });
    }

    setEventHandler(eventHandler) {
        this.eventHandler = eventHandler;
    }

    async getDelays(bot) {
        const response = await this.sendRequest({
            event: 'getDelays',
            data: bot.id
        });

        return response.data;
    }

    async startBot(bot, proxies) {
        const temp = {
            ...bot
        };
        delete temp._id;
        delete temp.working;
        delete temp.assignedToUser;

        const request = {
            event: 'startBot',
            data: {
                ...temp,
                proxies,
                currencyPrice: await BinanceService.getPrice(temp.fiat)
            }
        };

        if (temp.name === '3days') {
            request.data.orderKey = [];
            request.data.is_cookie = false;
        } else {
            const orderKey = temp.order_keys.find(key => key.name === temp.use_order_key);

            if (!orderKey) return `Can't find key for orders`;

            request.data.orderKey = orderKey;
            request.data.is_cookie = orderKey.isCookie;
        }

        const response = await this.sendRequest(request);

        return response.data;
    }

    async stopBot(bot) {
        const request = {
            event: 'stopBot',
            data: bot.id
        };
        const response = await this.sendRequest(request);

        return response.data;
    }

    async sendRequest(data) {
        try {
            return await axios.post(process.env.BACKEND_URL, data, {
                maxBodyLength: Infinity,
                headers: {'Content-Type': 'application/json'},
            });
        } catch (error) {
            console.log('[sendRequest]', error);

            return {
                data: (typeof error.data === 'object') ?
                    JSON.stringify(error.data) : ''
            };
        }
    }
}

module.exports = new WebService();