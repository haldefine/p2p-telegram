const Scene = require('telegraf/scenes/base');

const middlewares = require('../scripts/middlewares');
const messages = require('../scripts/messages');

const { sender } = require('../services/sender');
const {
    userDBService,
    proxyDBService
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

    admin.action('proxies', async (ctx) => {
        const { user } = ctx.state;

        const message = messages.addProxies(user.lang);

        ctx.scene.state.key = ctx.callbackQuery.data;

        await ctx.deleteMessage();

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

        if (key === 'proxies' && PROXIES_REG.test(text)) {
            const data = text.split('\n');

            for (let i = 0; i < data.length; i++) {
                const el = data[i].split(':');
                await proxyDBService.create({
                    isUse: false,
                    host: el[0] + ':' + el[1],
                    username: el[2],
                    password: el[3]
                });
            }

            message = messages.proxiesIsAdded(user.lang);
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