import Bot, {IBot} from "../models/botModel"
import User, {IUser} from "../models/userModel"
import WebService from "./web-service";

class BotService {
    async createBot(creator: IUser, name: string, userId: number) {
        const admins: IUser[] = await User.find({role: 'ADMIN'});
        const assignedToUser = admins.map(admin => admin.id);
        if (!assignedToUser.includes(userId)) {
            assignedToUser.push(userId);
        }
        const bot = await Bot.create({
            name,
            assignedToUser
        })

        for (const admin of admins) {
            if (admin.id === creator.id) {
                creator.assignedBots.push(bot.id);
            } else {
                admin.assignedBots.push(bot.id);
                await admin.save();
            }
        }
        if (!admins.some(admin => admin.id === userId)) {
            const user = await User.findOne({id: userId});
            if (user) {
                user.assignedBots.push(bot.id);
                await user.save();
            }
        }

        return bot;
    }

    async startBot(botId: string) {
        const bot = await Bot.findOne({id: botId});
        if (!bot) throw new Error("There's must be a bot")
        const response = await WebService.startBot(bot);
        let changed = false;
        if (bot.working === false && (response === 'success' || response === 'This bot already started')) {
            changed = true;
            bot.working = true;
            await bot.save();
        }
        return {response, changed};
    }

    async stopBot(botId: string) {
        const bot = await Bot.findOne({id: botId});
        if (!bot) throw new Error("There's must be a bot")
        const response = await WebService.stopBot(bot);
        let changed = false;
        if (bot.working) {
            bot.working = false;
            await bot.save();
            changed = true;
        }
        return {response, changed};
    }

    async getDelays(bot: IBot) {
        const response = await WebService.getDelays(bot);
        try {
            const delays = JSON.parse(response.delays)
            const num_req = parseInt(response.num_req)
            return {
                delays: delays.map((delay:number, index:number) => ({
                    delay: delay,
                    proxy: `${bot.proxies[index].host}:${bot.proxies[index].username}`
                })) as {delay: number, proxy: string}[],
                num_req
            };
        } catch (e) {
            return response as string;
        }
    }

    getSearchKeysFile(bot: IBot) {
        let output = '';
        for (const key of bot.search_keys || []) {
            output += `${key.api_key},${key.secret_key}\n`
        }
        if (!output) return 'example_api_key,example_secret_key'
        return output;
    }

    setSearchKeys(data: string, bot: IBot) {
        const lines = data.split('\n');
        const keys = [];
        for (const line of lines) {
            const [api_key, secret_key] = line.split(',')
            if (!api_key || !secret_key) continue;
            keys.push({api_key: api_key.trim(), secret_key: secret_key.trim()});
        }
        bot.search_keys = keys;
    }

    getProxiesFile(bot: IBot) {
        let output = '';
        for (const proxy of bot.proxies) {
            output += `${proxy.host}:${proxy.username}:${proxy.password}\n`
        }
        if (!output) return 'example_host:example_port:example_login:example_password'
        return output;
    }

    setProxies(data: string, bot: IBot) {
        const lines = data.split('\n');
        const proxies = [];
        for (const line of lines) {
            const [host, port, login, password] = line.split(':')
            if (!host || !port || !login || !password) continue;
            proxies.push({
                "host": (host+':'+port).trim(),
                "username": login.trim(),
                "password": password.trim()
            });
        }
        bot.proxies = proxies;
    }
}

export default new BotService();