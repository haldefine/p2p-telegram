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
    let inline_keyboard = [];

    if (user.registrationStatus === '3days') {
        message.text = i18n.t(lang, 'menu3days_message', {
            subEndDate: user.sub_end_date.toLocaleDateString('ru-RU'),
        });
    }

    inline_keyboard = [
        [{ text: i18n.t(lang, 'buySub_button'), callback_data: 'buy-sub' }],
        [{ text: i18n.t(lang, 'changeTrialPeriod_button'), callback_data: 'change-trial' }],
        [{ text: i18n.t(lang, 'information_button'), url: CONFIG['INFORMATION_URL'] }]
    ];

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

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
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'proceed_button'), callback_data: 'proceed' }]
                ]
            }
        },
        deleteAfterAction: true
        //delete: DELETE_DELAY
    };

    return message;
};

const subIsEnd1DayRemind = (lang) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'subIsEnd1DayRemind_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'changeTrialPeriod_button'), callback_data: 'change-trial' }],
                    [{ text: i18n.t(lang, 'buySub_button'), callback_data: 'buy-sub' }]
                ]
            }
        }
    };

    return message;
};

const incorrectCurrency = (lang, currencies, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'incorrectCurrency_message', {
            currencies: currencies.join(',')
        }),
        extra: {
            reply_markup: {
                inline_keyboard: currencies.reduce((acc, el) => {
                    acc[acc.length] = [{ text: el, callback_data: `set-${el}` }];

                    return acc;
                }, [])
            }
        }
    };

    return message;
};

const marketIsTooSmall = (lang, currency) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'marketIsTooSmall_message', {
            currency
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
        text: i18n.t(lang, 'orderCollapse_message', {
            status: i18n.t(lang, `${data.result}_status`),
            ...data
        }),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'expand_button'), callback_data: 'expand' }]
                ]
            }
        }
    };

    return message;
};

const orderExpand = (lang, data) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'orderExpand_message', {
            status: i18n.t(lang, `${data.result}_status`),
            user: i18n.t(lang, 'user_url', {
                id: data.user.tg_id,
                username: data.user.tg_username
            }),
            ...data
        }),
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

const userStatus = (lang, user) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'userStatus_message', {
            user: i18n.t(lang, 'user_url', {
                id: user.tg_id,
                username: user.tg_username
            }),
            lang: user.lang,
            role: user.role,
            sub_end_date: user.sub_end_date.toLocaleDateString('ru-RU'),
            registrationStatus: user.registrationStatus,
            assignedBots: user.assignedBots.join(','),
            binanceUserIds: user.binanceUserIds.join(',')
        }),
        extra: {}
    };

    return message;
};

const adminMenu = (lang) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'adminMenu_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'addProxies_button'), callback_data: 'Proxies' }],
                    [{ text: i18n.t(lang, 'addKeys_button'), callback_data: 'Keys' }],
                    [{ text: i18n.t(lang, 'startBots_button'), callback_data: 'startBots' }],
                    [{ text: i18n.t(lang, 'cancel_button'), callback_data: 'cancel' }]
                ]
            }
        }
    };

    return message;
};

const addProxies = (lang, key) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, `enter${key}_message`),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'back_button'), callback_data: 'back' }]
                ]
            }
        }
    };

    return message;
};

const proxiesIsAdded = (lang, key) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, `${key}IsAdded_message`),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'back_button'), callback_data: 'back' }]
                ]
            }
        }
    };

    return message;
};

const botError = (lang, data, error) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'bot_error', {
            id: (data) ? data.id : 'NONE',
            error
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
    subIsEnd1DayRemind,
    incorrectCurrency,
    marketIsTooSmall,
    orderTextForUser,
    orderTextForAdmin,
    order,
    orderCollapse,
    orderExpand,
    userStatus,
    adminMenu,
    addProxies,
    proxiesIsAdded,
    botError
}