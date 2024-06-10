const fs = require('fs');

const TelegrafI18n = require('telegraf-i18n/lib/i18n');

const i18n = new TelegrafI18n({
    directory: './locales',
    defaultLanguage: 'en',
    sessionName: 'session',
    useSession: true,
    templateData: {
        pluralize: TelegrafI18n.pluralize,
        uppercase: (value) => value.toUpperCase()
    }
});

const DELETE_DELAY = 10000;

const start = (lang) => {
    const CONFIG = JSON.parse(fs.readFileSync('./config.json'));

    const message = {
        type: 'text',
        text: i18n.t(lang, 'start_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: i18n.t(lang, 'startTrial_button'), callback_data: 'trial' },
                        { text: i18n.t(lang, 'buySub_button'), callback_data: 'buy-sub' },
                    ],
                    [{ text: i18n.t(lang, 'information_button'), url: CONFIG['INFORMATION_URL'] }]
                ]
            }
        }
    };

    return message;
};

const menu = (lang, user, message_id = null) => {
    const CONFIG = JSON.parse(fs.readFileSync('./config.json'));

    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: '...',
        extra: {}
    };

    if (user.registrationStatus === '3days') {
        message.text = i18n.t(lang, 'menu3days_message', {
            end_date: user.subscription_end_date
        });

        inline_keyboard = [
            [{ text: i18n.t(lang, 'buySub_button'), callback_data: 'buy-subscription' }],
            [{ text: i18n.t(lang, 'changeTrialPeriod_button'), callback_data: 'change-trial' }],
            [{ text: i18n.t(lang, 'information_button'), url: CONFIG['INFORMATION_URL'] }]
        ];
    }

    return message;
};

const trial3days = (lang, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'trial3days_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'start_button'), callback_data: '3days' }]
                ]
            }
        }
    };

    return message;
};

const trial3daysSettings = (lang, step, data, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: '',
        extra: {}
    };

    if (step === 0) {
        message.text = i18n.t(lang, 'enterCurrency_message');
    } else if (step === 1) {
        message.text = i18n.t(lang, 'currencyIsCorrect_message', {
            currency: data.currency
        });
    }

    return message;
};

const subscribeChannels = (lang, channels) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'subscribeChannels_message'),
        extra: {}
    };
    const inline_keyboard = channels.reduce((acc, el) => {
        acc[acc.length] = [{ text: el.title, url: el.invite_link }]
        return acc;
    }, []);

    inline_keyboard[inline_keyboard.length] = [{
        text: i18n.t(lang, 'checkSubscribe_button'),
        callback_data: 'check-subscribe'
    }];

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

    return message;
};

const remind = (lang, key) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, `${key}Remind_message`),
        extra: {},
        delete: DELETE_DELAY
    };

    return message;
};

const incorrectCurrency = (lang, currencies, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'incorrectCurrency_message', {
            currencies
        }),
        extra: {}
    };

    return message;
};

const orderTextForUser = (lang, orderNo, response) => i18n.t(lang, 'orderTextForUser_text', {
    orderNo,
    response
});

const orderTextForAdmin = (lang, orderNo, host, username, delay, response) => i18n.t(lang, 'orderTextForUser_text', {
    orderNo,
    host,
    username,
    delay,
    response
});

const order = (lang, status, botName, orderNo) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'order_message', {
            status,
            botName,
            orderNo
        }),
        extra: {}
    };

    return message;
};

const orderCollapse = (lang, data) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'orderCollapse_message', data),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'expande_button'), callback_data: 'expande' }]
                ]
            }
        }
    };

    return message;
};

const orderExpande = (lang, data) => {
    data.user = i18n.t(lang, 'user_url', {
        id: data.user.tg_id,
        username: data.user.tg_username
    });

    const message = {
        type: 'text',
        text: i18n.t(lang, 'orderExpande_message', data),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'collapse_button'), callback_data: 'collapse' }]
                ]
            }
        }
    };

    return message;
};

module.exports = {
    start,
    menu,
    trial3days,
    trial3daysSettings,
    subscribeChannels,
    remind,
    incorrectCurrency,
    orderTextForUser,
    orderTextForAdmin,
    order,
    orderCollapse,
    orderExpande
}