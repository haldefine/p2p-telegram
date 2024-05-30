const Scene = require('telegraf/scenes/base');

const middlewares = require('../scripts/middlewares');
const messages = require('../scripts/messages');
const helper = require('../scripts/helper');
const timer = require('../scripts/timer');

const { sender } = require('../services/sender');

const CURRENCIES_REG = /(UAH|RUB|USD)/g;

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

        const message = messages.trial3daysSettings(user.locale, step, data, message_id);

        ctx.session.remindTimerId = timer.remind(user, 'currency');

        sender.enqueue({
            chat_id: ctx.from.id,
            message
        });
    });

    trial_3days.on('text', async (ctx) => {
        const { user } = ctx.state;
        const { step } = ctx.scene.state;
        const { text } = ctx.message;

        let isCorrect = false,
            isLeave = false,
            message = null;

        if (step === 0) {
            const currency = text.toUpperCase();

            if (CURRENCIES_REG.test(currency)) {
                isCorrect = true;
                isLeave = true;

                ctx.scene.state.step++;
                ctx.scene.state.data.currency = currency;

                clearTimeout(ctx.session.remindTimerId);
            } else {
                message = messages.incorrectCurrency(user.locale, CURRENCIES_REG);
            }
        }

        if (isCorrect) {
            message = messages.trial3daysSettings(user.locale, ctx.scene.state.step, ctx.scene.state.data);
        }

        if (message) {
            await ctx.replyWithHTML(message.text, message.extra);
        }

        if (isLeave) {
            const channels = await helper.getChannels();

            sender.enqueue({
                chat_id: ctx.from.id,
                message: messages.subscribeChannels(user.locale, channels)
            });

            ctx.session.remindTimerId = timer.remind(user, 'subscribe');

            await ctx.scene.leave();
        }
    });

    return trial_3days;
}

module.exports = {
    start3daysTrial
}