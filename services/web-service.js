const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const BinanceService = require("./binance-service");

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
            ...bot._doc
        };
        delete temp._id;
        delete temp.name;
        delete temp.working;
        delete temp.assignedToUser;
        delete temp.use_order_key;
        delete temp.order_keys;

        const request = {
            event: 'startBot',
            data: {
                ...temp,
                proxies,
                currencyPrice: await BinanceService.getPrice(bot.fiat)
            }
        };

        const orderKey = bot.order_keys.find(key => key.name === bot.use_order_key);

        if (!orderKey) return `Can't find key for orders`;

        request.data.orderKey = orderKey;
        request.data.is_cookie = orderKey.isCookie;

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