const messages = require('./messages');
const helper = require('./helper');
const timer = require('./timer');

const { sender } = require('../services/sender');
const { userService } = require('../services/db');

const stnk = process.env.STNK_ID;

const LANGUAGES = /en/;

const start = async (ctx, next) => {
    const { message } = ctx.update.callback_query || ctx.update;

    if (message && message.chat.type === 'private') {
        try {
            const locale = (LANGUAGES.test(ctx.from.language_code)) ?
                ctx.from.language_code : 'en';
            const username = ctx.chat.username || ctx.from.username || ctx.from.first_name;
            const status = (message.text && message.text.includes('/start ')) ?
                message.text.replace('/start ', '') : 'default';
            const end_date = new Date();

            if (status === '3days') {
                end_date.setDate(end_date.getDate() + 3);
            }

            ctx.state.user = await userService.get({ tg_id: ctx.from.id });

            if (!ctx.state.user) {
                ctx.state.user = await userService.create({
                    tg_id: ctx.from.id,
                    tg_username: username,
                    isAdmin: false,
                    isActive: true,
                    locale,
                    status,
                    end_date
                });
            }

            await ctx.i18n.locale(locale);

            if (ctx.state.user.tg_username !== username ||
                ctx.state.user.locale !== locale) {
                    ctx.state.user = await userService.update({ tg_id: ctx.from.id }, {
                        isActive: true,
                        tg_username:  username,
                        locale
                    }, 'after');
            }
        } catch (error) {
            //...
        }
    }

    return next();
};

const commands = async (ctx, next) => {
    const {
        message
    } = ctx.update;

    const { user } = ctx.state;

    if (message && message.chat.type === 'private' && message.text) {
        const { text } = message;

        let response_message = null;

        if (text.includes('/start')) {
            response_message = messages.start(user.locale);

            ctx.session.remindTimerId = timer.remind(user, 'start');
        }

        if (response_message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message: response_message
            });
        }
    }

    return next();
};

const cb = async (ctx, next) => {
    const {
        callback_query
    } = ctx.update;

    const { user } = ctx.state;

    if (callback_query && callback_query.message.chat.type === 'private') {
        const match = callback_query.data.split('-');

        let deleteMessage = false,
            response_message = null;

        if (match[0] === 'trial') {
            if (user.status === '3days') {
                response_message = messages.trial3days(user.locale, callback_query.message.message_id);
            }
        } else if (match[0] === '3days') {
            if (user.status === '3days') {
                clearTimeout(ctx.session.remindTimerId);

                return await ctx.scene.enter('trial_3days', {
                    message_id: callback_query.message.message_id,
                    step: 0,
                    data: {
                        currency: null
                    }
                });
            }
        } else if (match[0] === 'check') {
            if (match[1] === 'subscribe') {
                const channels = await helper.getChannels();
                const subscriber = await helper.checkSubscribe(channels, ctx.from.id);

                if (subscriber.isMember) {
                    response_message = messages.menu(user.locale, user, callback_query.message.message_id);
                }
            }
        }

        if (response_message) {
            if (deleteMessage) {
                await ctx.deleteMessage();
            }

            clearTimeout(ctx.session.remindTimerId);

            sender.enqueue({
                chat_id: ctx.from.id,
                message: response_message
            });
        }
    }

    return next();
};

module.exports = {
    start,
    commands,
    cb
}