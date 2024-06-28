const fs = require('fs');

const { sender } = require('../services/sender');

const getConfig = () => JSON.parse(fs.readFileSync('./config.json'));

const getChannels = async () => {
    const CONFIG = JSON.parse(fs.readFileSync('./config.json'));

    const channels = [];

    for (let i = 0; i < CONFIG['CHANNELS'].length; i++) {
        const channel = await sender.getChat(CONFIG['CHANNELS'][i]);
        channels[channels.length] = channel;
    }

    return channels;
};

const checkSubscribe = async (channels, user_id) => {
    const _ = {
        isMember: true,
        title: null
    };

    for (let i = 0; i < channels.length; i++) {
        const res = await sender.getChatMember(channels[i].id, user_id);

        if (res.status !== 'member' &&
            res.status !== 'administrator' &&
            res.status !== 'creator') {
                _.isMember = false;
                _.title = channels[i].title;
        }
    }

    return _;
};

const checkFiat = (data, _) => data.reduce((acc, el) => {
    if ((el[0] === _[0] && el[1] === _[1]) ||
    (el[1] === _[1] && el[2] === _[2])) {
        acc[acc.length] = el;
    }

    return acc;
}, []);

const setPayMethods = (data) => data.reduce((acc, el, index) => {
    if (el.isAdded) {
        if (index === 0) {
            acc += '[';
        }

        acc += el.title;

        if (index < data.length - 1) {
            acc += ',';
        } else {
            acc += ']';
        }
    }

    return acc;
}, '');

module.exports = {
    getConfig,
    getChannels,
    checkSubscribe,
    checkFiat,
    setPayMethods
}