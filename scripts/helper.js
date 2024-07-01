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

const getPayMethods = (data, added = []) => {
    const temp = [];

    for (let i = 0; i < data.length; i++) {
        const el = data[i];
        temp[temp.length] = {
            title: el,
            isAdded: (added.length === 0 || added.includes(el)) ? true : false
        };
    }

    return temp;
};

const setPayMethods = (data) => data.reduce((acc, el, index) => {
    if (index === 0) {
        acc = '[';
    }

    if (el.isAdded) {
        acc += `"${el.title}"`;

        if (index < data.length - 1) {
            acc += ',';
        }
    }

    if (index === data.length - 1) {
        acc += ']';
    }

    return acc;
}, '[]');

const orderKey = (el) => ({
    name: el.name,
    first_key: el.api,
    second_key: el.secret,
    isCookie: false
});

const searchKey = (el) => ({
    api_key: el.api,
    secret_key: el.secret
});

module.exports = {
    getConfig,
    getChannels,
    checkSubscribe,
    checkFiat,
    getPayMethods,
    setPayMethods,
    orderKey,
    searchKey
}