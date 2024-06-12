const messages = require('./messages');

const { sender } = require('../services/sender');
const {
    userDBService,
    botDBService
} = require('../services/db');

const BotService = require('../services/bot-service');

const REMIND_DELAY = 7200000;

const remind = (user, key, delay = REMIND_DELAY) => setTimeout((user) => {
    sender.enqueue({
        chat_id: user.tg_id,
        message: messages.remind(user.lang, key)
    });
}, delay, user, key);

const startBots = async () => {
    const bots = await botDBService.getAll({
        working: true,
        assignedToUsers: {
            $ne: []
        }
    });

    for (let i = 0; i < bots.length; i++) {
        const el = bots[i];
        const proxy = {
            req: {
                bot_id: el.id
            },
            limit: 1
        };

        await BotService.startBot(el.id, proxy);
    }

    return bots;
};

const checkSub = async () => {
    const now = new Date();
    const tommorow = new Date();
    tommorow.setDate(tommorow.getDate() + 1);
    tommorow.setHours(12);
    tommorow.setMinutes(0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0);
    yesterday.setMinutes(0);

    const _1day = new Date();
    _1day.setDate(_1day.getDate() + 1);
    _1day.setHours(0);
    _1day.setMinutes(0);

    const users = await userDBService.getAll({
        isActive: true,
        registrationStatus: {
            $ne: 'free'
        },
        assignedBots: {
            $ne: []
        }
    });

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const diff = (user.sub_end_date - _1day) / 1000 / 3600;

        if (diff <= 0) {
            for (let i = 0; i < user.assignedBots.length; i++) {
                const el = user.assignedBots[i];
                await BotService.updateBot(el, { key: 'remove user', user });
            }

            await userDBService.update({ tg_id: user.tg_id }, {
                registrationStatus: 'free',
                assignedBots: []
            });
        } else if (diff <= 24) {
            sender.enqueue({
                chat_id: user.tg_id,
                message: messages.subIsEnd1DayRemind(user.lang)
            });
        }
    }

    const delay = tommorow - now;

    return setTimeout(checkSub, delay);
};

module.exports = {
    remind,
    startBots,
    checkSub
}