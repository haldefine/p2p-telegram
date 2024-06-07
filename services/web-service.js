const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

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
        const orderKey = bot.order_keys.find(key => key.name === bot.use_order_key);

        if (!orderKey) return `Can't find key for orders`;

        const request = {
            event: 'startBot',
            data: {
                ...bot,
                proxies,
                orderKey: orderKey,
                is_cookie: orderKey.isCookie,
            }
        }
        const response = await this.sendRequest(request);

        return response.data
    }

    async stopBot(bot) {
        const request = {
            event: 'stopBot',
            data: bot.id
        };
        const response = await this.sendRequest(request);

        return response.data;
    }

    sendRequest(data) {
        return axios.post(process.env.BACKEND_URL, {
            maxBodyLength: Infinity,
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(data)
        });
    }
}

module.exports = new WebService();