const Scene = require('telegraf/scenes/base');

const middlewares = require('../scripts/middlewares');
const messages = require('../scripts/messages');
const helper = require('../scripts/helper');
const timer = require('../scripts/timer');

const BinanceService = require('../services/binance-service');
const BotService = require('../services/bot-service');
const PaymentService = require('../services/payment-service');
const { sender } = require('../services/sender');
const {
    userDBService,
    keyDBService,
    botDBService,
    promoDBService
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
const FREE_SETTINGS = [
    'name',
    'fiat',
    'APIKeys'
];

const CHOOSE_REG = /choose-(name|fiat|coin|maxOrder|minOrder|targetPrice|colCreateOrders|api|secret)/g;
const SET_REG = /set-(fiat|payMethods|coin|priceType|use_order_key)-([A-Za-z0-9]+)/g;
const PAYMETHOD_REG = /payMethod-([0-9a-z]+)-([0-9a-z]+)/g;
const NEXT_REG = /next-(payMethods|APIKeys)-([0-9]+)/g;

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

const checkFiat = async (user, text) => {
    const currencies = await BinanceService.getFiatsList();
    const currency = text.toUpperCase();

    let isSuccess = false, message = null;

    if (currencies.includes(currency)) {
        const check = await BinanceService.getPrice(currency);

        if (check) {
            isSuccess = true;
        } else {
            message = messages.marketIsTooSmall(user.lang);
        }
    } else {
        const similar = helper.checkFiat(currencies, currency);

        message = messages.incorrectCurrency(user.lang, similar);
    }

    return {
        isSuccess,
        currency,
        message
    };
};

const checkCoin = async (user, fiat, text) => {
    const coins = await BinanceService.getCoinsList(fiat);
    const coin = text.toUpperCase();

    let isSuccess = false, message = null;

    if (coins.includes(coin)) {
        isSuccess = true;
    } else {
        const similar = helper.checkFiat(coins, coin);

        message = messages.incorrectCoin(user.lang, similar);
    }

    return {
        isSuccess,
        coin,
        message
    };
};

const getPayMethods = async (ctx) => {
    const { user } = ctx.state;
    const { message_id } = (ctx.update.callback_query) ?
        ctx.update.callback_query.message : { message_id: null };
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

const addPayMethod = async (ctx) => {
    const { user } = ctx.state;
    const { message_id } = ctx.update.callback_query.message;
    const { payMethods } = ctx.scene.state;

    let page = Number(ctx.match[1]);
    let index = Number(ctx.match[2]) ?
        Number(ctx.match[2]) : ctx.match[2];

    if (index === 'all') {
        ctx.scene.state.payMethods = payMethods.reduce((acc, el) => {
            acc[acc.length] = {
                title: el.title,
                isAdded: true
            };
            return acc;
        }, []);
    } else {
        ctx.scene.state.payMethods[index].isAdded = !payMethods[index].isAdded;
    }

    const message = messages.payMethods(user.lang, ctx.scene.state.payMethods, page, ctx.scene.state.payMethods.length, message_id);

    sender.enqueue({
        chat_id: ctx.from.id,
        message
    });
};

const nextMessage = async (ctx) => {
    const { user } = ctx.state;
    const { message_id } = ctx.update.callback_query.message;
    const {
        data,
        payMethods,
        APIKeys
    } = ctx.scene.state;

    const key = ctx.match[1];
    const page = Number(ctx.match[2]);

    let message = null;

    if (key === 'payMethods') {
        message = messages.payMethods(user.lang, payMethods, page, payMethods.length, message_id);
    } else if (key === 'APIKeys') {
        message = messages.selectAPIKey(user.lang, data, APIKeys, page, APIKeys.length, message_id);
    }

    if (message) {
        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
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

        clearTimeout(ctx.session.remindTimerId);

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

function addAPIKeys() {
    const api_keys = new Scene('api_keys');

    api_keys.use(middlewares.start);

    api_keys.enter(async (ctx) => {
        const { user } = ctx.state;
        const {
            bot_id,
            message_id
        } = ctx.scene.state;

        ctx.scene.state.step = null;
        ctx.scene.state.data = {
            tg_id: ctx.from.id,
            bot_id: (bot_id) ? [bot_id] : [],
            name: Date.parse(new Date()),
            isUse: (bot_id) ? true : false,
            api: '',
            secret: ''
        };

        const message = messages.addAPIKeys(user.lang, ctx.scene.state.step, ctx.scene.state.data, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    api_keys.action(CHOOSE_REG, async (ctx) => {
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

            if (!check) {
                const order_keys = helper.orderKey(data);
                const search_keys = helper.searchKey(data);

                update = {
                    use_order_key: data.name,
                    $addToSet: {
                        search_keys,
                        order_keys
                    }
                };

                await keyDBService.create(data);
                await userDBService.update({ tg_id: ctx.from.id }, { $addToSet: { binanceuserIds: binanceUserId }});

                if (bot_id) {
                    await botDBService.update({ id: bot_id }, update);
                }

                isLeave = true;
                message = messages.APIKeysAdded(user.lang, message_id);
            } else {
                message = messages.answerCbQuery(user.lang, 'userIdIsAlredyUse_message', true);
            }
        } else {
            message = messages.answerCbQuery(user.lang, 'APIKeysIsNotCorrect_message', true);
        }

        if (isLeave) {
            await ctx.replyWithHTML(message.text, message.extra);

            if (user.registrationStatus === 'personal') {
                if (bot_id) {
                    await ctx.scene.enter('settings', {
                        bot_id
                    });
                } else {
                    update.type = 'personal';

                    await ctx.scene.enter('create_bot', {
                        step: 0,
                        data: update
                    });
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
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const {
            step,
            bot_id
        } = ctx.scene.state;

        if (step) {
            ctx.scene.state.step = null;

            const message = messages.addAPIKeys(user.lang, ctx.scene.state.step, {}, message_id);

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        } else if (bot_id) {
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
        const {
            message_id,
            step,
            data
        } = ctx.scene.state;

        const message = messages.botSettingsType(user.lang, SETTINGS_STEPS[step], data, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    create_bot.action(PAYMETHOD_REG, async (ctx) => {
        await addPayMethod(ctx);
    });

    create_bot.action(SET_REG, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;

        const key = ctx.match[1];
        const value = ctx.match[2];

        ctx.scene.state.step++;

        if (key === 'fiat') {
            ctx.scene.state.data[key] = value;
            ctx.scene.state.data['payMethods'] = '[]';

            const fiat_message = messages.trial3days(user.lang, 1, ctx.scene.state.data);

            await ctx.deleteMessage();
            await ctx.replyWithHTML(fiat_message.text, fiat_message.extra);
        } else if (key === 'payMethods') {
            const { payMethods } = ctx.scene.state;

            ctx.scene.state.data[key] = helper.setPayMethods(payMethods);
        } else {
            ctx.scene.state.data[key] = value;
        }


        if (ctx.scene.state.step === 2) {
            await getPayMethods(ctx);
        } else {
            sender.enqueue({
                chat_id: ctx.from.id,
                message: messages.botSettingsType(user.lang, SETTINGS_STEPS[ctx.scene.state.step], ctx.scene.state.data, message_id)
            });
        }
    });

    create_bot.action(NEXT_REG, async (ctx) => {
        await nextMessage(ctx);
    });

    create_bot.action('accept', async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { data } = ctx.scene.state;

        const channels = await helper.getChannels();
        const subscriber = await helper.checkSubscribe(channels, ctx.from.id);

        let isLeave = false,
            isSuccess = false,
            error = null,
            message = null;

        if (subscriber.isMember) {
            const create = await BotService.createBot(user, data);

            if (create.isSuccess) {
                console.log(create)

                const start = await BotService.startBot(create.bot.id);

                if (start.isSuccess) {
                    isSuccess = true;
                } else {
                    error = start.response;
                }
            } else {
                error = create.response;
            }

            isLeave = true;

            message = (isSuccess) ?
                messages.botMenu(user.lang, user, start.bot, message_id) :
                messages.botError(user.lang, create.bot, error);
        } else {
            message = messages.subscribeChannels(user.lang, channels, 'accept', message_id);
        }

        await ctx.deleteMessage();

        if (message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }

        if (isLeave) {
            await ctx.scene.leave();
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

            let isSuccess = false,
                message = messages.notCorrectData(user.lang, type);

            if (step < 4) {
                if (step === 1) {
                    const check = await checkFiat(user, text);

                    isSuccess = check.isSuccess;
                    message = check.message;

                    if (isSuccess) {
                        ctx.scene.state.data['fiat'] = check.currency;
                        ctx.scene.state.data['payMethods'] = '[]';
                    }
                } else if (step === 3) {
                    const check = await checkCoin(user, data['fiat'], text);

                    isSuccess = check.isSuccess;
                    message = check.message;

                    if (isSuccess) {
                        ctx.scene.state.data['coin'] = check.coin;
                    }
                } else {
                    isSuccess = true;
                    ctx.scene.state.data[type] = (step === 2) ? '[' + text + ']' : text;
                }
            } else if (step > 3 && typeof text_num === 'number') {
                if (step === 7) {
                    if (data['priceType'] === 'diff' && text_num > 0 && text_num <= 100) {
                        isSuccess = true;
                        ctx.scene.state.data[type] = text_num / 100;
                    } else if (data['priceType'] === 'price') {
                        isSuccess = true;
                        ctx.scene.state.data[type] = text_num;
                    } else {
                        message = messages.notCorrectData(user.lang, data['priceType']);
                    }
                } else {
                    if (step === 5) {
                        if (text_num >= 0 && text_num < data['maxOrder']) {
                            isSuccess = true;
                        } else {
                            message = messages.notCorrectData(user.lang, 'minOrder');
                        }
                    } else if (step === 4) {
                        if (text_num > 0) {
                            isSuccess = true;
                        } else {
                            message = messages.notCorrectData(user.lang, 'maxOrder');
                        }
                    } else if (step > 5) {
                        isSuccess = true;
                    }

                    if (isSuccess) {
                        ctx.scene.state.data[type] = text_num;
                    }
                }
            } else {
                message = messages.notCorrectData(user.lang, 'default');
            }

            if (isSuccess) {
                ctx.scene.state.step++;

                if (ctx.scene.state.step === 2) {
                    return await getPayMethods(ctx);
                } else {
                    message = messages.botSettingsType(user.lang, SETTINGS_STEPS[ctx.scene.state.step], ctx.scene.state.data);
                }
            }

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    });

    return create_bot;
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

    settings.action(CHOOSE_REG, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { data } = ctx.scene.state;

        ctx.scene.state.step = ctx.match[1];

        if (user.registrationStatus === 'subscription' || FREE_SETTINGS.includes(ctx.scene.state.step)) {
            const message = messages.botSettingsType(user.lang, ctx.scene.state.step, data, message_id);

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        } else {
            await ctx.answerCbQuery(ctx.i18n.t('onlyWithSubscription_message'), true);
        }
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
                update['targetPrice'] = (update[match] === 'diff') ? 0.1 : 100;
            }

            ctx.scene.state.data = await botDBService.update({ id: data.id }, update, 'after');

            const message = messages.botSettings(user.lang, user, ctx.scene.state.data, message_id);
    
            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        } else {
            await ctx.answerCbQuery(ctx.i18n.t('onlyWithSubscription_message'), true);
        }
    });

    settings.action(SET_REG, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { data } = ctx.scene.state;

        const key = ctx.match[1];
        const value = ctx.match[2];

        let update = null;

        if (key === 'fiat') {
            update = {
                [key]: value,
                'payMethods': '[]'
            };

            const fiat_message = messages.trial3days(user.lang, 1, update);

            await ctx.replyWithHTML(fiat_message.text, fiat_message.extra);
        } else if (key === 'payMethods') {
            const { payMethods } = ctx.scene.state;

            update = {
                [key]: helper.setPayMethods(payMethods)
            };
        } else if (key === 'use_order_key') {
            const APIKey = await keyDBService.update({ _id: value }, { $addToSet: { bot_id: data.id }}, 'after');

            if (APIKey) {
                update = {
                    [key]: APIKey.name,
                    $addToSet: {
                        order_keys: helper.orderKey(APIKey),
                        search_keys: helper.searchKey(APIKey)
                    }
                };

                await ctx.answerCbQuery(ctx.i18n.t('selectedAPIKey_message', { name: value }), true);
            }
        } else {
            update = {
                [key]: value
            };
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

    settings.action(PAYMETHOD_REG, async (ctx) => {
        await addPayMethod(ctx);
    });

    settings.action(/(menu|add|select)-(APIKeys)/, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { data } = ctx.scene.state;

        const key = ctx.match[1];
        const value = ctx.match[2];

        let message = null;

        if (key === 'menu') {
            if (value === 'APIKeys') {
                message = messages.menuAPIKeys(user.lang, message_id);
            }
        } else if (key === 'add') {
            if (value === 'APIKeys') {
                return await ctx.scene.enter('api_keys', {
                    message_id,
                    bot_id: data.id
                });
            }
        } else if (key === 'select') {
            if (value === 'APIKeys') {
                const APIKeys = await keyDBService.getAll({
                    tg_id: creator.tg_id,
                    $expr: { $lt: [{ $size: '$bot_id' }, 2] }
                });

                ctx.scene.state.APIKeys = APIKeys;

                message = messages.selectAPIKey(user.lang, data, APIKeys, 0, APIKeys.length, message_id);
            }
        }

        if (message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    });

    settings.action(NEXT_REG, async (ctx) => {
        await nextMessage(ctx);
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

        let message = null,
            update = {}, isUpdate = false;

        if (step === 'name') {
            isUpdate = true;
            update[step] = text;
        } else if (step === 'fiat') {
            const check = await checkFiat(user, text);

            if (check.isSuccess) {
                isUpdate = true;
                update[step] = check.currency;
                update['payMethods'] = '[]';
            }

            message = check.message;
        } else if (user.registrationStatus === 'subscription') {
            if (step === 'coin') {
                const check = await checkCoin(user, text, data['fiat']);

                if (check.isSuccess) {
                    isUpdate = true;
                    update[step] = check.coin;
                }
            } else if (typeof text_num === 'number') {
                if (step === 'maxOrder') {
                    if (text_num > data['minOrder'] && text_num > 0) {
                        isUpdate = true;
                    } else {
                        message = messages.notCorrectData(user.lang, 'maxOrder');
                    }
                } else if (step === 'minOrder') {
                    if (text_num < data['maxOrder'] && text_num >= 0) {
                        isUpdate = true;
                    } else {
                        message = messages.notCorrectData(user.lang, 'minOrder');
                    }
                } else if (step === 'targetPrice') {
                    if (data['priceType'] === 'diff') {
                        if (text_num > 0 && text_num <= 100) {
                            isUpdate = true;
                        } else {
                            message = messages.notCorrectData(user.lang, 'diff');
                        }
                    } else if (data['priceType'] === 'price') {
                        isUpdate = true;
                    } else {
                        message = messages.notCorrectData(user.lang, 'price');
                    }
                } else {
                    isUpdate = true;
                }

                if (isUpdate) {
                    update[step] = (data['priceType'] === 'diff') ?
                        text_num / 100 : text_num;
                }
            } else {
                message = messages.notCorrectData(user.lang, 'default');
            }
        }
        
        if (step.includes('APIKeys')) {
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

            message = messages.botSettings(user.lang, user, ctx.scene.state.data, null);
        }

        if (message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    });

    return settings;
}

function buySubscription() {
    const subscription = new Scene('subscription');

    subscription.use(middlewares.start);

    subscription.enter(async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.scene.state;

        ctx.scene.state.config = helper.getConfig();
        ctx.scene.state.plan = null;

        const message = messages.choosePlan(user.lang, ctx.scene.state.config['SUBSCRIPTIONS'], message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    subscription.action(/choose-([0-9]+)/, async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { config } = ctx.scene.state;

        const index = Number(ctx.match[1]);

        ctx.scene.state.plan = config['SUBSCRIPTIONS'][index];

        const message = messages.enterPromoCode(user.lang, message_id);

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    subscription.action('skip', async (ctx) => {
        const { user } = ctx.state;
        const { message_id } = ctx.update.callback_query.message;
        const { plan } = ctx.scene.state;

        if (plan) {
            const invoice = await PaymentService.createInvoice(ctx.from.id, plan);
            const message = messages.invoice(user.lang, invoice, message_id);

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });
        }
    });

    subscription.action('reenter', async (ctx) => {
        await ctx.scene.reenter();
    });

    subscription.on('text', async (ctx) => {
        const { user } = ctx.state;
        const { plan } = ctx.scene.state;

        const { text } = ctx.message;

        if (plan) {
            const check = await promoDBService.get({ id: text });

            let isLeave = false, message = null;

            if (check) {
                plan.amount = (check.type === 'discount') ?
                    plan.amount - (plan.amount * check.percent / 100) : plan.amount;

                const invoice = await PaymentService.createInvoice(ctx.from.id, plan);

                await userDBService.update({ tg_id: ctx.from.id }, { promo_code: text });
                await ctx.replyWithHTML(ctx.i18n.t('successfullyPromoCode_message'));

                isLeave = true;
                message = messages.invoice(user.lang, invoice);
            } else {
                message = messages.incorrectPromoCode(user.lang);
            }

            sender.enqueue({
                chat_id: ctx.from.id,
                message
            });

            if (isLeave) {
                await ctx.scene.leave();
            }
        }
    });

    return subscription;
}

module.exports = {
    start3daysTrial,
    start3ordersTrial,
    addAPIKeys,
    createBot,
    botSettings,
    buySubscription
}