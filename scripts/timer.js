const messages = require('./messages');

const { sender } = require('../services/sender');

const REMIND_DELAY = 7200000;

const remind = (user, key, delay = REMIND_DELAY) => setTimeout((user) => {
    sender.enqueue({
        chat_id: user.tg_id,
        message: messages.remind(user.lang, key)
    });
}, delay, user, key);

module.exports = {
    remind
}