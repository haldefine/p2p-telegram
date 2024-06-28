const messages = require('./messages');
const helper = require('./helper');
const timer = require('./timer');

const { sender } = require('../services/sender');
const {
    messageDBService,
    userDBService,
    botDBService
} = require('../services/db');
const PaymentService = require('../services/payment-service');
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
            const sub_end_date = new Date();

            if (registrationStatus === '3days') {
                sub_end_date.setDate(sub_end_date.getDate() + 3);
            } else {
                sub_end_date.setDate(sub_end_date.getDate() + 30);
            }

            ctx.state.user = await userDBService.get({ tg_id: ctx.from.id });

            if (!ctx.state.user) {
                ctx.state.user = await userDBService.create({
                    tg_id: ctx.from.id,
                    tg_username: username,
                    lang,
                    sub_end_date,
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

        const match = text.split(' ');

        let response_message = null;

        if (text.includes('/start')) {
            if (user.registrationStatus === 'subscription') {
                response_message = messages.menu(user.lang);
            } else {
                response_message = messages.startTrial(user.lang);
            }

            ctx.session.remindTimerId = timer.remind(user, 'start');
        }

        if (text.includes('/info') && (user.isAdmin || ctx.from.id == stnk)) {
            const data = await userDBService.get({
                $or: [
                    { tg_id: match[1] },
                    { tg_username: match[1] }
                ]
            });

            if (data) {
                response_message = messages.userStatus('en', data);
            }
        }

        if (text.includes('/admin') && (user.isAdmin || ctx.from.id == stnk)) {
            return ctx.scene.enter('admin');
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
        const { message_id } = callback_query.message;

        const match = callback_query.data.split('-');

        let deleteMessage = false,
            deleteRemind = false,
            response_message = null;

        if (match[0] === 'cancel' || match[0] === 'proceed') {
            sender.deleteMessage(ctx.from.id, message_id);

            if (match[0] === 'cancel') {
                response_message = messages.startTrial(user.lang);
            }
        } else if (match[0] === 'trial') {
            if (user.assignedBots.length === 0 &&
                user.registrationStatus !== 'free' &&
                user.registrationStatus !== 'subscription') {
                    clearTimeout(ctx.session.remindTimerId);

                    ctx.session.remindTimerId = timer.remind(user, 'startTrial');

                    deleteRemind = true;

                    response_message = (user.registrationStatus === '3days') ?
                        messages.startTrial3days(user.lang, message_id) :
                        messages.startTrial3orders(user.lang, message_id);
            }
        } else if (match[0] === '3days') {
            if (user.assignedBots.length === 0 && user.registrationStatus === '3days') {
                clearTimeout(ctx.session.remindTimerId);

                sender.deleteMessage(ctx.from.id, user.last_message_id);

                return await ctx.scene.enter('trial_3days', {
                    message_id,
                    step: 0,
                    data: {
                        currency: null
                    }
                });
            }
        } else if (match[0] === '3orders') {
            if (user.assignedBots.length === 0 && user.registrationStatus === '3orders') {
                clearTimeout(ctx.session.remindTimerId);

                sender.deleteMessage(ctx.from.id, user.last_message_id);

                return await ctx.scene.enter('trial_3orders', {
                    message_id,
                    step: 0,
                    data: {}
                });
            }
        } else if (match[0] === 'add') {
            clearTimeout(ctx.session.remindTimerId);

            sender.deleteMessage(ctx.from.id, user.last_message_id);

            return await ctx.scene.enter(match[1], {
                message_id,
                step: null
            });
        } else if (match[0] === 'check') {
            if (match[1] === 'subscribe') {
                const channels = await helper.getChannels();
                const subscriber = await helper.checkSubscribe(channels, ctx.from.id);

                if (subscriber.isMember) {
                    clearTimeout(ctx.session.remindTimerId);

                    deleteRemind = true;

                    if (user.assignedBots.length === 0 &&
                        (user.registrationStatus === '3days' || user.registrationStatus === '3orders')) {
                            const type = user.registrationStatus;
                            const check = (type === '3days') ?
                                await botDBService.get({
                                    name: type,
                                    fiat: user.currency
                                }) : null;

                            await ctx.deleteMessage();
                
                            if (check) {
                                await botDBService.update({ id: check.id }, {
                                    working: true,
                                    $addToSet: {
                                        assignedToUser: user.tg_id
                                    }
                                });
                                await userDBService.update({ tg_id: user.tg_id }, {
                                    $addToSet: {
                                        assignedBots: check.id
                                    }
                                });

                                response_message = messages.botMenu(user.lang, user, check, message_id);
                            } else {
                                const _bot = {
                                    type,
                                    name: type,
                                    fiat: user.currency
                                };

                                let isSuccess = false,
                                    error = '';

                                const create = await BotService.createBot(user, _bot);

                                if (create.isSuccess) {
                                    const start = await BotService.startBot(create.bot.id);

                                    if (start.isSuccess) {
                                        isSuccess = true;
                                    } else {
                                        error = start.response;
                                    }
                                } else {
                                    error = create.response;
                                }

                                response_message = (isSuccess) ?
                                    messages.botMenu(user.lang, user, create.bot, message_id) :
                                    messages.botError(user.lang, create.bot, error);
                        }
                    }
                } else {
                    response_message = messages.answerCbQuery(user.lang, 'youNotSubscribeToChannel_message', true);
                }
            }
        } else if (match[0] === 'change') {
            if (match[1] === 'trial' && user.registrationStatus === '3days') {
                response_message = messages.changeTrial(user.lang);
            } else if (match[1] === '3orders' && user.registrationStatus === '3days') {
                const sub_end_date = new Date();
                sub_end_date.setDate(sub_end_date.getDate() + 30);

                await userDBService.update({ tg_id: ctx.from.id }, {
                    registrationStatus: '3orders',
                    sub_end_date
                });

                return await ctx.scene.enter('trial_3orders', {
                    message_id,
                    step: 0,
                    data: {}
                });
            }
        } else if (match[0] === 'expand' || match[0] === 'collapse') {
            const data = await messageDBService.get({
                chat_id: ctx.from.id,
                type: match[0],
                message_id
            });

            if (data) {
                response_message = data.message;
            }
        } else if (match[0] === 'startBot' || match[0] === 'stopBot') {
            const channels = await helper.getChannels();
            const subscriber = await helper.checkSubscribe(channels, ctx.from.id);

            if (subscriber.isMember) {
                let key = 'youHaveStoppedBot_message', response = null;

                if (match[0] === 'stopBot') {
                    response = await BotService.stopBot(match[1]);
                } else {
                    key = 'youHaveStartedBot_message';
                    response = await BotService.startBot(match[1]);
                }

                if (response.isSuccess) {
                    await ctx.answerCbQuery(ctx.i18n.t(key), true);

                    response_message = messages.botMenu(user.lang, user, response.bot, message_id);
                } else {
                    response_message = messages.botError(user.lang, response.bot, response.error);
                }
            } else {
                response_message = messages.subscribeChannels(user.lang, channels, callback_query.data, message_id);
            }
        } else if (match[0] === 'settings') {
            const bot = await botDBService.get({ id: match[1] });

            if (bot) {
                if (bot.working) {
                    response_message = messages.answerCbQuery(user.lang, 'stopBotToChange_message', true);
                } else {
                    return await ctx.scene.enter('settings', {
                        message_id,
                        bot_id: match[1]
                    });
                }
            }
        } else if (match[0] === 'buy') {
            if (match[1] === 'subscription') {
                return await ctx.scene.enter(match[1], {
                    message_id
                });
            }
        }

        if (response_message) {
            if (deleteMessage) {
                await ctx.deleteMessage();
            }

            if (deleteRemind) {
                sender.deleteMessage(ctx.from.id, user.last_message_id);
            }

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