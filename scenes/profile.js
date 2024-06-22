const Scene = require('telegraf/scenes/base');

const middlewares = require('../scripts/middlewares');
const messages = require('../scripts/messages');
const helper = require('../scripts/helper');
const timer = require('../scripts/timer');

const BinanceService = require('../services/binance-service');
const BotService = require('../services/bot-service');
const { sender } = require('../services/sender');
const {
    userDBService,
    keyDBService,
    botDBService
} = require('../services/db');

const SETTINGS_STEPS = [
    'name',
    'fiat',
    'payMethods',
    'coin',
    'maxOrder',
    'minOrder',
    'priceType',
    'targetPrice',
    'colCreateOrders',
    'createBot'
];

const trialLeave = async (ctx) => {
    const { user } = ctx.state;

    const channels = await helper.getChannels();

    await userDBService.update({ tg_id: user.tg_id }, ctx.scene.state.data);

    sender.enqueue({
        chat_id: user.tg_id,
        message: messages.subscribeChannels(user.lang, channels)
    });

    ctx.session.remindTimerId = timer.remind(user, 'subscribe');

    return await ctx.scene.leave();
};

const getPayMethods = async (ctx) => {
    const { user } = ctx.state;
    const { message_id } = ctx.update.callback_query.message;
    const { data } = ctx.scene.state;

    if (data['fiat']) {
        let payMethods = await BinanceService.getPayMethods(data['fiat']);

        if (payMethods.length > 0) {
            payMethods = payMethods.reduce((acc, el) => {
                acc[acc.length] = {
                    title: el,
                    isAdded: false
                };

                return acc;
            }, []);

            ctx.scene.state.payMethods = payMethods;

            const message = messages.payMethods(user.lang, payMethods, 0, payMethods.length, message_id);

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    } else {
        await ctx.answerCbQuery(ctx.i18n.t('firstAddFiat_message'), true);
    }
};

function start3daysTrial() {
    const trial_3days = new Scene('trial_3days');

    trial_3days.use(middlewares.start);

    trial_3days.enter(async (ctx) => {
        const { user } = ctx.state;
        const {
            message_id,
            step,
            data
        } = ctx.scene.state;

        const message = messages.trial3days(user.lang, step, data, message_id);

        ctx.session.remindTimerId = timer.remind(user, 'currency');

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    trial_3days.action(/set-(fiat)-([A-Z]+)/, async (ctx) => {
        const { user } = ctx.state;

        const data = ctx.match[2];

        ctx.scene.state.step++;
        ctx.scene.state.data.currency = data;

        clearTimeout(ctx.session.remindTimerId);

        await ctx.deleteMessage();

        sender.enqueue({
            chat_id: ctx.from.id,
            message: messages.trial3days(user.lang, ctx.scene.state.step, ctx.scene.state.data)
        });

        trialLeave(ctx);
    });

    trial_3days.on('text', async (ctx) => {
        const { user } = ctx.state;
        const { step } = ctx.scene.state;
        const { text } = ctx.message;

        let isCorrect = false,
            isLeave = false,
            message = null;

        if (step === 0) {
            const currencies = await BinanceService.getFiatsList();
            const currency = text.toUpperCase();

            if (currencies.includes(currency)) {
                const check = await BinanceService.getPrice(currency);

                if (check) {
                    isCorrect = true;
                    isLeave = true;

                    ctx.scene.state.step++;
                    ctx.scene.state.data.currency = currency;

                    clearTimeout(ctx.session.remindTimerId);
                } else {
                    message = messages.marketIsTooSmall(user.lang);
                }
            } else {
                const similar = helper.checkFiat(currencies, currency);

                message = messages.incorrectCurrency(user.lang, similar);
            }
        }

        if (isCorrect) {
            message = messages.trial3days(user.lang, ctx.scene.state.step, ctx.scene.state.data);
        }

        if (message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }

        if (isLeave) {
            trialLeave(ctx);
        }
    });

    return trial_3days;
}

function start3ordersTrial() {
    const trial_3orders = new Scene('trial_3orders');

    trial_3orders.use(middlewares.start);

    trial_3orders.enter(async (ctx) => {
        const { user } = ctx.state;
        const {
            message_id,
            step
        } = ctx.scene.state;

        const message = messages.trial3orders(user.lang, step, message_id);

        ctx.session.remindTimerId = timer.remind(user, 'APIKeys');

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    trial_3orders.action('api_keys', async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;

        ctx.scene.state.step++;

        const message = messages.trial3orders(user.lang, ctx.scene.state.step, message_id);

        await ctx.deleteMessage();

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });

        await ctx.scene.leave();
    })

    return trial_3orders;
}

function botSettings() {
    const settings = new Scene('settings');

    settings.use(middlewares.start);

    settings.enter(async (ctx) => {
        const { user } = ctx.state;
        const {
            bot_id,
            message_id
        } = ctx.scene.state;

        const data = await botDBService.get({ id: bot_id });

        const message = messages.botSettings(user.lang, user, data, message_id);

        ctx.scene.state.data = data;

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    settings.action(/choose-([name|fiat|coin|maxOrder|minOrder|targetPrice|colCreateOrders])/, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { data } = ctx.scene.state;

        ctx.scene.state.step = ctx.match[1];

        const message = messages.botSettingsType(user.lang, ctx.scene.state.step, data, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    settings.action(/change-(take_max_order|priceType)/, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const {data } = ctx.scene.state;

        const match = ctx.match[1];

        let update = {};

        if (data && user.registrationStatus === 'subscription') {
            if (match === 'take_max_order') {
                update[match] = !data[match];
            } else if (match === 'priceType') {
                update[match] = (data[match] === 'diff') ?
                    'price' : 'diff';
            }
        }

        ctx.scene.state.data = await botDBService.update({ id: data.id }, update, 'after');

        const message = messages.botSettings(user.lang, user, ctx.scene.state.data, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    settings.action(/set-(fiat|payMethods)-([A-Z]+)/, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { payMethods } = ctx.scene.state;

        const key = ctx.match[1];
        const value = ctx.match[2];

        let update = null;

        if (key === 'fiat') {
            update[key] = value;
            update['payMethods'] = '[]';

            const fiat_message = messages.trial3days(user.lang, 1, update);

            await ctx.replyWithHTML(fiat_message.text, fiat_message.extra);
        } else if (key === 'payMethods') {
            update[key] = payMethods.reduce((acc, el, index) => {
                if (index === 0) {
                    acc += '[';
                }

                acc += el.title;

                if (index < payMethods.length - 1) {
                    acc += ',';
                } else {
                    acc += ']';
                }

                return acc;
            }, '');
        }

        if (update) {
            ctx.scene.state.data = await botDBService.update({ id: data.id }, update, 'after');
        }

        sender.enqueue({
            chat_id: ctx.from.id,
            message: messages.botSettings(user.lang, user, ctx.scene.state.data, message_id)
        });
    });

    settings.action('payMethods', async (ctx) => {
        await getPayMethods(ctx);
    });

    settings.action(/payMethod-([0-9]+)-([0-9]+)/, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { payMethods } = ctx.scene.state;

        const page = Number(ctx.match[1]);
        const index = Number(ctx.match[2]);

        ctx.scene.state.payMethods[index].isAdded = !payMethods[index].isAdded;

        const message = messages.payMethods(user.lang, payMethods, page, payMethods.length, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    settings.action(/(add|menu)-(api_keys)/, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { data } = ctx.scene.state;

        const key = ctx.match[1];

        if (key === 'menu') {
            const message = messages.menuAPIKeys(user.lang, message_id);

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        } else if (key === 'add') {
            await ctx.scene.enter('api_keys', {
                message_id,
                bot_id: data.id
            });
        }
    });

    settings.action('back', async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { data } = ctx.scene.state;

        const message = messages.botSettings(user.lang, user, data, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    settings.on('text', async (ctx) => {
        const { user } = ctx.state;
        const {
            step,
            data
        } = ctx.scene.state;

        const { text } = ctx.message;
        const text_num = Number(text);

        let response_message = null,
            update = {}, isUpdate = false;

        if (step === 'name') {
            isUpdate = true;
            update[step] = text;
        } else if (step === 'fiat') {
            const currencies = await BinanceService.getFiatsList();
            const currency = text.toUpperCase();

            if (currencies.includes(currency)) {
                const check = await BinanceService.getPrice(currency);

                if (check) {
                    isUpdate = true;
                    update[step] = currency;
                    update['payMethods'] = '[]';
                } else {
                    response_message = messages.marketIsTooSmall(user.lang);
                }
            } else {
                const similar = helper.checkFiat(currencies, currency);

                response_message = messages.incorrectCurrency(user.lang, similar);
            }
        } else if (user.registrationStatus === 'subscription') {
            if (step === 'coin') {
                isUpdate = true;
                update[step] = text;
            } else if (text_num &&
                (step === 'maxOrder' ||
                step === 'minOrder' ||
                step === 'colCreateOrders')) {
                    isUpdate = true;
                    update[step] = text_num;
            } else if (step === 'targetPrice') {
                if (data['priceType'] === 'diff' && text_num > 0 && text_num <= 100) {
                    update[step] = text_num / 100;
                } else if (data['priceType'] === 'price') {
                    update[step] = text_num;
                }
            }
        }
        
        if (step.includes('api_keys')) {
            const match = step.split('-');

            if (match[1] === 'name') {
                ctx.scene.state.data.api_keys[match[1]] = text;
            } else if (match[1] === 'api') {
                ctx.scene.state.data.api_keys[match[1]] = text;
            } else if (match[1] === 'secret') {
                ctx.scene.state.data.api_keys[match[1]] = text;
            }
        } else if (step && isUpdate) {
            ctx.scene.state.data = await botDBService.update({ id: data.id }, update, 'after');

            response_message = messages.botSettings(user.lang, user, ctx.scene.state.data, null);
        }

        if (response_message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message: response_message
            });
        }
    });

    return settings;
}

function addAPIKeys() {
    const api_keys = new Scene('api_keys');

    api_keys.use(middlewares.start);

    api_keys.enter(async (ctx) => {
        const { user } = ctx.state;
        const {
            bot_id,
            message_id
        } = ctx.scene.state;

        ctx.scene.state.data = {
            tg_id: ctx.from.id,
            bot_id: (bot_id) ? [bot_id] : [],
            name: Date.parse(new Date()),
            isUse: (bot_id) ? true : false,
            api: null,
            secret: null
        };

        const message = messages.addAPIKeys(user.lang, null, ctx.scene.state.data, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    api_keys.action(/choose-(name|api|secret)/, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;

        ctx.scene.state.step = ctx.match[1];

        const message = messages.addAPIKeys(user.lang, ctx.scene.state.step, {}, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    api_keys.action('accept', async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const {
            bot_id,
            data
        } = ctx.scene.state;

        let isLeave = false,
            message = null,
            update = null,
            binanceUserId = await BinanceService.getUserIdentifier(data.api, data.secret);

        if (binanceUserId) {
            const check = await userDBService.get({ binanceUserIds: binanceUserId });

            if (check) {
                if (bot_id) {
                    const search_keys = {
                        api_key: data.api,
                        secret_key: data.secret
                    };
                    const order_keys = {
                        name: data.name,
                        first_key: data.api,
                        second_key: data.secret,
                        isCookie: false
                    };

                    update = {
                        use_order_key: data.name,
                        $addToSet: {
                            search_keys,
                            order_keys
                        }
                    };
                }

                await keyDBService.create(data);

                if (update) {
                    await botDBService.update({ id: bot_id }, update);
                }

                isLeave = true;
                message = messages.APIKeysAdded(user.lang, message_id);
            } else {
                message = messages.userIdIsAlreadyUse(user.lang);
            }
        } else {
            message = messages.APIKeysIsNotCorrect(user.lang);
        }

        if (isLeave) {
            await ctx.replyWithHTML(message.text, message.extra);

            if (user.registrationStatus === 'personal') {
                if (bot_id) {
                    await ctx.scene.enter('settings', {
                        bot_id
                    });
                } else {
                    await ctx.scene.enter('create_bot');
                }
            } else {
                await ctx.scene.enter('trial_3days', {
                    step: 0,
                    data: {
                        currency: null
                    }
                });
            }
        } else {
            await ctx.answerCbQuery(message.text, message.extra.show_alert);
        }
    });

    api_keys.action('back', async (ctx) => {
        const { message_id } = ctx.update.callback_query.message;
        const { bot_id } = ctx.scene.state;

        if (bot_id) {
            await ctx.scene.enter('settings', {
                bot_id,
                message_id
            });
        }
    });

    api_keys.on('text', async (ctx) => {
        const { user } = ctx.state;
        const { step } = ctx.scene.state;

        const { text } = ctx.message;

        if (step === 'name') {
            ctx.scene.state.data[step] = text;
        } else if (step === 'api') {
            ctx.scene.state.data[step] = text;
        } else if (step === 'secret') {
            ctx.scene.state.data[step] = text;
        }

        const message = messages.addAPIKeys(user.lang, null, ctx.scene.state.data);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    return api_keys;
}

function createBot() {
    const create_bot = new Scene('create_bot');

    create_bot.use(middlewares.start);

    create_bot.enter(async (ctx) => {
        const { user } = ctx.state;

        ctx.scene.state.step = 0;
        ctx.scene.state.data = {};

        const message = messages.botSettingsType(user.lang, SETTINGS_STEPS[ctx.scene.state.step]);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    create_bot.action('accept', async (ctx) => {
        const { user } = ctx.state;

        const create = await BotService.createBot(user, type);

        let message = null;

        if (create.isSuccess) {
            
        } else {
            message = messages.botError(user.lang, create.bot, create.response);
        }

        await ctx.deleteMessage();

        if (message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    });

    create_bot.action('back', async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { data } = ctx.scene.state;

        if (ctx.scene.state.step > 0) {
            ctx.scene.state.step--;
        }

        if (ctx.scene.state.step === 2) {
            await getPayMethods(ctx);
        } else {
            const message = messages.botSettingsType(user.lang, SETTINGS_STEPS[ctx.scene.state.step], data, message_id);

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    });

    create_bot.on('text', async (ctx) => {
        const { user } = ctx.state;
        const {
            step,
            data
        } = ctx.scene.state;

        const { text } = ctx.message;
        const text_num = Number(text);

        if (step !== 2 && step !== 6) {
            const type = SETTINGS_STEPS[step];

            let message = messages.notCorrectData(user.lang, type);

            if (step < 4) {
                ctx.scene.state.data[type] = text;
            } else if (step > 3 && text_num) {
                if (step === 7) {
                    if (data['priceType'] === 'diff' && text_num > 0 && text_num <= 100) {
                        ctx.scene.state.data[type] = text_num / 100;
                    } else if (data['priceType'] === 'price') {
                        ctx.scene.state.data[type] = text_num;
                    }
                } else {
                    ctx.scene.state.data[type] = text_num;
                }
            }

            if (isSuccess) {
                ctx.scene.state.step++;

                message = messages.botSettingsType(user.lang, SETTINGS_STEPS[step], ctx.scene.state.data);
            }

            sender.enqueue({
                chat_it: ctx.from.id,
                message
            });
        }
    });

    return create_bot;
}

module.exports = {
    start3daysTrial,
    start3ordersTrial,
    botSettings,
    addAPIKeys,
    createBot
}