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

const start = (locale) => {
    const CONFIG = JSON.parse(fs.readFileSync('./config.json'));

    const message = {
        type: 'text',
        text: i18n.t(locale, 'start_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: i18n.t(locale, 'startTrial_button'), callback_data: 'trial' },
                        { text: i18n.t(locale, 'buySub_button'), callback_data: 'buy-sub' },
                    ],
                    [{ text: i18n.t(locale, 'information_button'), url: CONFIG['INFORMATION_URL'] }]
                ]
            }
        }
    };

    return message;
};

const menu = (locale, user, message_id = null) => {
    const CONFIG = JSON.parse(fs.readFileSync('./config.json'));

    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: '...',
        extra: {}
    };

    if (user.status === '3days') {
        message.text = i18n.t(locale, 'menu3days_message', {
            end_date: user.end_date
        });

        inline_keyboard = [
            [{ text: i18n.t(locale, 'buySub_button'), callback_data: 'buy-subscription' }],
            [{ text: i18n.t(locale, 'changeTrialPeriod_button'), callback_data: 'change-trial' }],
            [{ text: i18n.t(locale, 'information_button'), url: CONFIG['INFORMATION_URL'] }]
        ];
    }

    return message;
};

const trial3days = (locale, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(locale, 'trial3days_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(locale, 'start_button'), callback_data: '3days' }]
                ]
            }
        }
    };

    return message;
};

const trial3daysSettings = (locale, step, data, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: '',
        extra: {}
    };

    if (step === 0) {
        message.text = i18n.t(locale, 'enterCurrency_message');
    } else if (step === 1) {
        message.text = i18n.t(locale, 'currencyIsCorrect_message', {
            currency: data.currency
        });
    }

    return message;
};

const subscribeChannels = (locale, channels) => {
    const message = {
        type: 'text',
        text: i18n.t(locale, 'subscribeChannels_message'),
        extra: {}
    };
    const inline_keyboard = channels.reduce((acc, el) => {
        acc[acc.length] = [{ text: el.title, url: el.invite_link }]
        return acc;
    }, []);

    inline_keyboard[inline_keyboard.length] = [{
        text: i18n.t(locale, 'checkSubscribe_button'),
        callback_data: 'check-subscribe'
    }];

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

    return message;
};

const remind = (locale, key) => {
    const message = {
        type: 'text',
        text: i18n.t(locale, `${key}Remind_message`),
        extra: {},
        delete: DELETE_DELAY
    };

    return message;
};

const incorrectCurrency = (locale, currencies, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(locale, 'incorrectCurrency_message', {
            currencies
        }),
        extra: {}
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
    incorrectCurrency
}