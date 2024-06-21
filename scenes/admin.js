const Scene = require('telegraf/scenes/base');

const middlewares = require('../scripts/middlewares');
const messages = require('../scripts/messages');
const timer = require('../scripts/timer');

const { sender } = require('../services/sender');
const {
    userDBService,
    proxyDBService,
    keyDBService
} = require('../services/db');

const PROXIES_REG = /(([0-9.]+):([0-9]+):([a-z0-9]+):([A-Za-z0-9]+))/gm;

function adminMenu() {
    const admin = new Scene('admin');

    admin.use(middlewares.start);
    admin.use(middlewares.start);
    admin.use(middlewares.cb);

    admin.enter(async (ctx) => {
        const { user } = ctx.state;

        const message = messages.adminMenu(user.lang);

        ctx.scene.state.key = null;

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    admin.action(['Proxies', 'Keys'], async (ctx) => {
        const { user } = ctx.state;

        const key = ctx.callbackQuery.data;

        const message = messages.addProxies(user.lang, key);

        ctx.scene.state.key = key;

        await ctx.deleteMessage();

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    admin.action('startBots', async (ctx) => {
        const { user } = ctx.state;

        const message = messages.adminMenu(user.lang);

        timer.startBots();

        await ctx.deleteMessage();

        await ctx.replyWithHTML('Done!');

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    admin.action('back', async (ctx) => {
        const { user } = ctx.state;

        const message = messages.adminMenu(user.lang);

        ctx.scene.state.key = null;

        await ctx.deleteMessage();

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    admin.hears(/del ([A-Za-z0-9_]+)/, async (ctx) => {
        const match = ctx.match[1];
        const user = await userDBService.get({
            $or: [
                { tg_id: match },
                { tg_username: match },
            ]
        });

        if (user) {
            await userDBService.delete({ tg_id: user.tg_id });

            await ctx.replyWithHTML('User deleted!');
        }
    });

    admin.hears(/admin ([A-Za-z0-9_]+)/, async (ctx) => {
        const match = ctx.match[1];
        const user = await userDBService.get({
            $or: [
                { tg_id: match },
                { tg_username: match },
            ]
        });

        if (user) {
            user.isAdmin = !user.isAdmin;
            user.role = (user.isAdmin) ? 'admin' : 'user';

            const message = messages.userInfo(user.lang, user);

            await userDBService.update({ tg_id: user.tg_id }, user);

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    });

    admin.on('text', async (ctx) => {
        const { user } = ctx.state;
        const { key } = ctx.scene.state;

        const { text } = ctx.message;

        let message = null;

        if (key === 'Proxies' && PROXIES_REG.test(text)) {
            const data = text.split('\n');

            for (let i = 0; i < data.length; i++) {
                const el = data[i].split(':');
                const host = el[0] + ':' + el[1];
                await proxyDBService.update({ host }, {
                    isUse: false,
                    host,
                    username: el[2],
                    password: el[3]
                }, 'after', true);
            }

            message = messages.proxiesIsAdded(user.lang, key);
        } else if (key === 'Keys') {
            const data = text.split('\n');

            for (let i = 0; i < data.length; i++) {
                const el = data[i].split(':');
                await keyDBService.update({ api: el[0] }, {
                    isUse: false,
                    api: el[0],
                    secret: el[1]
                }, 'after', true);
            }

            message = messages.proxiesIsAdded(user.lang, key);
        }

        if (message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    });

    return admin;
}

module.exports = {
    adminMenu
}