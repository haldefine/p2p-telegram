const Scene = require('telegraf/scenes/base');

const middlewares = require('../scripts/middlewares');
const messages = require('../scripts/messages');
const helper = require('../scripts/helper');
const timer = require('../scripts/timer');

const { sender } = require('../services/sender');
const {
    userDBService
} = require('../services/db');
const BinanceService = require('../services/binance-service');

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

        const message = messages.trial3daysSettings(user.lang, step, data, message_id);

        ctx.session.remindTimerId = timer.remind(user, 'currency');

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    trial_3days.action(/set-([A-Z]+)/, async (ctx) => {
        const { user } = ctx.state;
        const data = ctx.match[1];

        ctx.scene.state.step++;
        ctx.scene.state.data.currency = data;

        clearTimeout(ctx.session.remindTimerId);

        await ctx.deleteMessage();

        sender.enqueue({
            chat_id: ctx.from.id,
            message: messages.trial3daysSettings(user.lang, ctx.scene.state.step, ctx.scene.state.data)
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
                const similar = currencies.reduce((acc, el) => {
                    if (el[0] === currency[0] && el[1] === currency[1]) {
                        acc[acc.length] = el;
                    }

                    return acc;
                }, []);

                message = messages.incorrectCurrency(user.lang, similar);
            }
        }

        if (isCorrect) {
            message = messages.trial3daysSettings(user.lang, ctx.scene.state.step, ctx.scene.state.data);
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

module.exports = {
    start3daysTrial
}