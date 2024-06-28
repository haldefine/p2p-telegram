const WebService = require('./web-service');
const {
    userDBService,
    proxyDBService,
    keyDBService,
    botDBService
} = require('./db');

class BotService {
    async createBot(creator, data) {
        const admins = await userDBService.getAll({ role: 'admin' });
        const assignedToUser = admins.map(admin => admin.tg_id);

        let newBot = {
            ...data,
            assignedToUser
        };

        if (!assignedToUser.includes(creator.tg_id)) {
            assignedToUser.push(creator.tg_id);
        }

        const req = (data.type === '3days') ?
            {
                $expr: { $lt: [{ $size: '$bot_id' }, 2] }
            } :
            {
                tg_id: creator.tg_id,
                $expr: { $lt: [{ $size: '$bot_id' }, 2] }
            };
        const keys = await keyDBService.getAll(req, {}, {}, 1);

        if (data.type === '3orders') {
            newBot.maxOrder = 100;
        }

        if (keys[0]) {
            const temp = keys.reduce((acc, el) => {
                acc.order_keys[acc.order_keys.length] = {
                    name: el.name,
                    first_key: el.api,
                    second_key: el.secret,
                    isCookie: false
                };
                acc.search_keys[acc.search_keys.length] = {
                    api_key: el.api,
                    secret_key: el.secret
                };
                return acc;
            }, {
                order_keys: [],
                search_keys: []
            });

            newBot.use_order_key = temp.order_keys[0].name;
            newBot.order_keys = temp.order_keys;
            newBot.search_keys = temp.search_keys;
        } else {
            return {
                isSuccess: false,
                response: 'No keys available'
            };
        }

        const bot = await botDBService.create(newBot);

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

        return {
            isSuccess: true,
            bot
        };
    }

    async startBot(botId, proxy = { req: { isUse: false }, limit: 1 }) {
        let bot = await botDBService.get({ id: botId });

        let response = 'Bot is not found in DB',
            isSuccess = false,
            update = null;

        if (bot) {
            let proxies_temp = await proxyDBService.getAll(proxy.req, {}, {}, proxy.limit);

            if (proxies_temp.length === 0) {
                proxies_temp = await proxyDBService.getAll({}, {}, {}, proxy.limit);
            }

            const proxies = [];

            for (let i = 0; i < proxies_temp.length; i++) {
                proxies[proxies.length] = {
                    host: proxies_temp[i].host,
                    username: proxies_temp[i].username,
                    password: proxies_temp[i].password
                };
            }

            response = await WebService.startBot(bot._doc, proxies);

            if (response === 'success' || response === 'This bot already started') {
                isSuccess = true;

                if (!bot.working) {
                    update = {
                        working: true
                    };
                }

                for (let i = 0; i < proxies.length; i++) {
                    const el = proxies[i];

                    await proxyDBService.update({ host: el.host }, {
                        isUse: true,
                        bot_id: bot.id
                    });
                }

                for (let i = 0; i < bot.search_keys.length; i++) {
                    const { api_key } = bot.search_keys[i];

                    await keyDBService.update({ api: api_key }, {
                        $addToSet: { bot_id: bot.id },
                        isUse: true
                    });
                }
            }

            if (update) {
                bot = await botDBService.update({ id: bot.id }, update, 'after');
            }
        }

        return {
            isSuccess,
            response,
            bot
        };
    }

    async stopBot(botId) {
        let bot = await botDBService.get({ id: botId });

        let response = 'Bot is not found in DB',
            isSuccess = false;

        if (bot) {
            response = await WebService.stopBot(bot);

            if (bot.working) {
                isSuccess = true;

                bot = await botDBService.update({ id: bot.id }, { working: false }, 'after');

                await proxyDBService.updateAll({
                    isUse: true,
                    bot_id: bot.id
                }, { isUse: false });
            }
        }

        return {
            isSuccess,
            response,
            bot
        };
    }

    async updateBot(botId, data) {
        const bot = await botDBService.get({ id: botId });

        let response = 'Bot is not found in DB',
            isSuccess = false;

        if (bot) {
            if (data.key === 'remove user') {
                bot.assignedToUser = bot.assignedToUser.filter(el => el !== data.user.tg_id);

                if (bot.assignedToUser.length === 0) {
                    return await this.stopBot(bot.id);
                } else {
                    isSuccess = true;
                    response = 'Bot is updated';

                    await botDBService.update({ id: bot.id }, bot);
                }
            }
        }

        return {
            isSuccess,
            response
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