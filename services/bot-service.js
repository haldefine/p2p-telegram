const WebService = require('./web-service');
const {
    userDBService,
    proxyDBService,
    botDBService
} = require('./db');

class BotService {
    async createBot(creator, name) {
        const admins = await userDBService.getAll({ role: 'admin' });
        const assignedToUser = admins.map(admin => admin.tg_id);

        if (!assignedToUser.includes(creator.tg_id)) {
            assignedToUser.push(creator.tg_id);
        }

        const bot = await botDBService.create({
            name,
            assignedToUser
        });

        for (const admin of admins) {
            if (admin.tg_id === creator.tg_id) {
                creator.assignedBots.push(bot.id);
            } else {
                admin.assignedBots.push(bot.id);

                await userDBService.update({ tg_id: admin.tg_id }, admin);
            }
        }

        if (!admins.some(admin => admin.tg_id === creator.tg_id)) {
            const user = await userDBService.get({ tg_id: creator.tg_id });

            if (user) {
                user.assignedBots.push(bot.id);

                await userDBService.update({ tg_id: user.tg_id }, user);
            }
        }

        return bot;
    }

    async startBot(botId, proxiesLimit = 1) {
        const bot = await botDBService.get({ id: botId });

        if (!bot) throw new Error("There's must be a bot");

        const temp = await proxyDBService.getAll({ isUse: false }, {}, {}, proxiesLimit);
        const proxies = [];

        for (let i = 0; i < temp.length; i++) {
            proxies[proxies.length] = {
                host: temp[i].host,
                username: temp[i].username,
                password: temp[i].password
            };

            await proxyDBService.update({ host: temp[i].host }, { isUse: true });
        }

        const response = await WebService.startBot(bot, proxies);

        let changed = false;

        if (bot.working === false && (response === 'success' || response === 'This bot already started')) {
            changed = true;
            bot.working = true;

            await botDBService.update({ id: bot.id }, bot);
        }

        return {
            response,
            changed
        };
    }

    async stopBot(botId) {
        const bot = await botDBService.get({ id: botId });

        if (!bot) throw new Error("There's must be a bot");

        const response = await WebService.stopBot(bot);

        let changed = false;

        if (bot.working) {
            bot.working = false;

            await botDBService.update({ id: bot.id }, bot);

            changed = true;
        }

        return {
            response,
            changed
        };
    }

    async getDelays(bot) {
        const response = await WebService.getDelays(bot);

        try {
            const delays = JSON.parse(response.delays);
            const num_req = parseInt(response.num_req);

            return {
                delays: delays.map((delay, index) => ({
                    delay: delay,
                    proxy: `${bot.proxies[index].host}:${bot.proxies[index].username}`
                })),
                num_req
            };
        } catch (e) {
            return response;
        }
    }

    getSearchKeysFile(bot) {
        let output = '';

        for (const key of bot.search_keys || []) {
            output += `${key.api_key},${key.secret_key}\n`;
        }

        if (!output) return 'example_api_key,example_secret_key';

        return output;
    }

    setSearchKeys(data, bot) {
        const lines = data.split('\n');
        const keys = [];

        for (const line of lines) {
            const [api_key, secret_key] = line.split(',');

            if (!api_key || !secret_key) continue;

            keys.push({
                api_key: api_key.trim(),
                secret_key: secret_key.trim()
            });
        }

        bot.search_keys = keys;
    }

    getProxiesFile(bot) {
        let output = '';

        for (const proxy of bot.proxies) {
            output += `${proxy.host}:${proxy.username}:${proxy.password}\n`;
        }

        if (!output) return 'example_host:example_port:example_login:example_password';

        return output;
    }

    setProxies(data, bot) {
        const lines = data.split('\n');
        const proxies = [];

        for (const line of lines) {
            const [host, port, login, password] = line.split(':');

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

module.exports = new BotService();