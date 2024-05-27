import express from "express";
import bodyParser from "body-parser";
import axios from 'axios';
import {IBot} from "../models/botModel";


class WebService {
    private eventHandler: ((event: any) => Promise<any>) | undefined;
    constructor() {
        const app = express();
        app.use(bodyParser.text())
        app.use(bodyParser.json());
        app.post("/", (req: express.Request, res: express.Response) => {
            if (this.eventHandler) {
                this.eventHandler(req.body).catch(console.log);
            }
            res.send("Success");
        });
        app.listen(8081, () => {
            console.log("Server is listening on port 8081");
        });
    }

    setEventHandler(eventHandler: (event: any) => Promise<any>) {
        this.eventHandler = eventHandler;
    }


    async getDelays(bot: IBot) {
        const response = await this.sendRequest({
            event: 'getDelays',
            data: bot.id
        });
        return response.data
    }

    async startBot(bot: IBot) {
        const orderKey = bot.order_keys.find(key => key.name === bot.use_order_key)
        if (!orderKey) return `Can't find key for orders`;
        const request = {
            event: 'startBot',
            data: {
                ...bot,
                orderKey: orderKey,
                is_cookie: orderKey.isCookie,
            }
        }
        const response = await this.sendRequest(request);
        return response.data
    }

    async stopBot(bot: IBot) {
        const request = {
            event: 'stopBot',
            data: bot.id
        }
        const response = await this.sendRequest(request);
        return response.data
    }

    sendRequest(data: any) {
        return axios.post(process.env.BACKEND_URL!, {
            maxBodyLength: Infinity,
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(data)
        })
    }
}

export default new WebService();