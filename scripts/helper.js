const fs = require('fs');

const { sender } = require('../services/sender');

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

module.exports = {
    getChannels,
    checkSubscribe
}