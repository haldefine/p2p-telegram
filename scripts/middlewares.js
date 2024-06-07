const messages = require('./messages');
const helper = require('./helper');
const timer = require('./timer');

const { sender } = require('../services/sender');
const {
    messageDBService,
    userDBService,
    botDBService
} = require('../services/db');
const BotService = require('../services/bot-service');

const stnk = process.env.STNK_ID;

const LANGUAGES = /en/;

const start = async (ctx, next) => {
    const { message } = ctx.update.callback_query || ctx.update;

    if (message && message.chat.type === 'private') {
        try {
            const lang = (LANGUAGES.test(ctx.from.language_code)) ?
                ctx.from.language_code : 'en';
            const username = ctx.chat.username || ctx.from.username || ctx.from.first_name;
            const registrationStatus = (message.text && message.text.includes('/start ')) ?
                message.text.replace('/start ', '') : '3orders';
            const subscription_end_date = new Date();

            if (registrationStatus === '3days') {
                subscription_end_date.setDate(subscription_end_date.getDate() + 3);
            }

            ctx.state.user = await userDBService.get({ tg_id: ctx.from.id });

            if (!ctx.state.user) {
                ctx.state.user = await userDBService.create({
                    tg_id: ctx.from.id,
                    tg_username: username,
                    isActive: true,
                    lang,
                    subscription_end_date,
                    role: 'user',
                    registrationStatus
                });
            }

            await ctx.i18n.locale(lang);

            if (ctx.state.user.tg_username !== username ||
                ctx.state.user.lang !== lang) {
                    ctx.state.user = await userDBService.update({ tg_id: ctx.from.id }, {
                        isActive: true,
                        tg_username:  username,
                        lang
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
            response_message = messages.start(user.lang);

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
            if (user.registrationStatus === '3days') {
                response_message = messages.trial3days(user.lang, callback_query.message.message_id);
            }
        } else if (match[0] === '3days') {
            if (user.registrationStatus === '3days') {
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
                    if (user.registrationStatus === '3days') {
                        const type = user.registrationStatus;
                        const check = await botDBService.get({
                            type,
                            fiat: user.currency
                        });
            
                        if (check) {
                            await botDBService.update({ id: check.id }, {
                                $addToSet: {
                                    assignedToUser: user.tg_id
                                }
                            });
                            await userDBService.update({ tg_id: user.tg_id }, {
                                $addToSet: {
                                    assignedBots: check.id
                                }
                            });
                        } else {
                            const _bot = await BotService.createBot(user, type);

                            await BotService.startBot(_bot.id);
                        }
                    }

                    response_message = messages.menu(user.lang, user, callback_query.message.message_id);
                }
            }
        } else if (match[0] === 'expande' || match[0] === 'collapse') {
            const { message } = await messageDBService.get({
                chat_id: ctx.from.id,
                message_id: callback_query.message.message_id
            });

            response_message = message;
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