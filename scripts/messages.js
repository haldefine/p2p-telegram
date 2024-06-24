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

const paginations = (lang, data, page, length, key, size = 5) => {
    let inline_keyboard = [];

    if (data.length > 0) {
        if (page > 0 && page * size < length) {
            inline_keyboard = [
                { text: i18n.t(lang, 'back_button'), callback_data: `next-${key}-${page - 1}` },
                { text: i18n.t(lang, 'next_button'), callback_data: `next-${key}-${page + 1}` }
            ];
        } else if (page === 0 && page * size < length) {
            inline_keyboard = [
                { text: i18n.t(lang, 'next_button'), callback_data: `next-${key}-${page + 1}` }
            ];
        } else if (page > 0) {
            inline_keyboard = [
                { text: i18n.t(lang, 'back_button'), callback_data: `next-${key}-${page - 1}` }
            ];
        }
    }

    return inline_keyboard;
};

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

const startTrial3days = (lang, message_id = null) => {
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

const trial3days = (lang, step, data, message_id = null) => {
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
            currency: data.currency || data.fiat
        });
    }

    return message;
};

const startTrial3orders = (lang, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'trial3orders_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'addAPIKey_button'), callback_data: '3orders' }]
                ]
            }
        }
    };

    return message;
};

const trial3orders = (lang, step, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: '',
        extra: {}
    };
    let inline_keyboard = [];

    if (step === 0) {
        message.text = i18n.t(lang, 'missingBinanceAPIKeys_message');

        inline_keyboard = [
            [{ text: i18n.t(lang, 'addAPIKeys_button'), callback_data: 'api_keys' }]
        ];
    } else if (step === 1) {
        message.text = i18n.t(lang, 'addBinanceAPIKeys_message', {
            instruction: i18n.t(lang, 'instruction_url')
        });

        inline_keyboard = [
            [{ text: i18n.t(lang, 'addKey_button'), callback_data: 'add-api_keys' }]
        ];
    }

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

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
                    acc[acc.length] = [{ text: el, callback_data: `set-fiat-${el}` }];

                    return acc;
                }, [])
            }
        }
    };

    return message;
};

const incorrectCoin = (lang, coins, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'incorrectCoin_message', {
            coins: coins.join(',')
        }),
        extra: {
            reply_markup: {
                inline_keyboard: coins.reduce((acc, el) => {
                    acc[acc.length] = [{ text: el, callback_data: `set-coin-${el}` }];

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
            ...data,
            status: i18n.t(lang, `${data.result}_status`)
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
            ...data,
            status: i18n.t(lang, `${data.result}_status`),
            user: i18n.t(lang, 'user_url', {
                id: data.user.tg_id,
                username: data.user.tg_username
            })
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

const botSettings = (lang, user, data, message_id = null) => {
    const isLock = (user.registrationStatus === 'subscription') ? '' : '🔒';
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'botSettings_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: i18n.t(lang, 'botName_button', {
                            data: data['name']
                        }),
                        callback_data: 'choose-name'
                    }],
                    [{
                        text: i18n.t(lang, 'fiat_button', {
                            data: data['fiat']
                        }),
                        callback_data: 'choose-fiat'
                    }],
                    [{
                        text: i18n.t(lang, 'payMethods_button', {
                            isLock,
                            data: (data['payMethods'].length > 3) ? '✅' : '❌'
                        }),
                        callback_data: 'choose-payMethods'
                    }],
                    [{
                        text: i18n.t(lang, 'coin_button', {
                            isLock,
                            data: data['coin']
                        }),
                        callback_data: 'choose-coin'
                    }],
                    [{
                        text: i18n.t(lang, 'maxOrder_button', {
                            isLock,
                            data: data['maxOrder']
                        }),
                        callback_data: 'choose-maxOrder'
                    }],
                    [{
                        text: i18n.t(lang, 'minOrder_button', {
                            isLock,
                            data: data['minOrder']
                        }),
                        callback_data: 'choose-minOrder'
                    }],
                    [{
                        text: i18n.t(lang, 'priceType_button', {
                            isLock,
                            data: data['priceType']
                        }),
                        callback_data: 'change-priceType'
                    }],
                    [{
                        text: i18n.t(lang, 'targetPrice_button', {
                            isLock,
                            data: data['targetPrice']
                        }),
                        callback_data: 'choose-targetPrice'
                    }],
                    [{
                        text: i18n.t(lang, 'colCreateOrders_button', {
                            isLock,
                            data: data['colCreateOrders']
                        }),
                        callback_data: 'choose-colCreateOrders'
                    }],
                    [{
                        text: i18n.t(lang, 'takeMaxOrder_button', {
                            isLock,
                            data: (data['take_max_order']) ? '✅' : '❌'
                        }),
                        callback_data: 'change-take_max_order'
                    }],
                    [{
                        text: i18n.t(lang, 'APIKeys_button'),
                        callback_data: 'menu-api_keys'
                    }]
                ]
            }
        }
    };

    return message;
};

const botSettingsType = (lang, step, data, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: '...',
        extra: {}
    };
    let inline_keyboard = [];

    if (step === 'name') {
        message.text = i18n.t(lang, 'enterBotName_message');
    } else if (step === 'fiat') {
        message.text = i18n.t(lang, 'enterCurrency_message');
    } else if (step === 'coin') {
        message.text = i18n.t(lang, 'enterCoin_message');
    } else if (step === 'maxOrder') {
        message.text = i18n.t(lang, 'enterMaxOrder_message');
    } else if (step === 'minOrder') {
        message.text = i18n.t(lang, 'enterMinOrder_message');
    } else if (step === 'priceType') {
        message.text = i18n.t(lang, 'choosePriceType_message');
        inline_keyboard = [
            [{ text: i18n.t(lang, 'price_button'), callback_data: 'set-priceType-price' }],
            [{ text: i18n.t(lang, 'diff_button'), callback_data: 'set-priceType-diff' }]
        ];
    } else if (step === 'targetPrice') {
        const target = (data['priceType']) ? data['priceType'] : 'diff';
        message.text = i18n.t(lang, `enterTarget${target}_message`);
    } else if (step === 'colCreateOrders') {
        message.text = i18n.t(lang, 'enterColCreateOrders_message');
    } else if (step === 'createBot') {
        message.text = i18n.t(lang, 'confirmCreationBot_message', data);
        inline_keyboard = [
            [{ text: i18n.t(lang, 'accept_button'), callback_data: 'accept' }]
        ];
    }

    if (step !== 'name') {
        inline_keyboard[inline_keyboard.length] = [
            { text: i18n.t(lang, 'back_button'), callback_data: 'back' }
        ];
    }

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

    return message;
};

const payMethods = (lang, data, page, length, message_id = null) => {
    const size = 5;
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'choosePayMethods_message'),
        extra: {}
    };

    const temp = [];

    const startIndex = page * size;

    for (let i = startIndex; i < startIndex + size; i++) {
        temp[temp.length] = [{
            text: (data[i].isAdded ? '✅ ' : '') + data[i].title,
            callback_data: `payMethod-${page}-${i}`
        }];
    }

    message.extra = {
        reply_markup: {
            inline_keyboard: [
                [{ text: i18n.t(lang, 'chooseAllPayMethods_button'), callback_data: `payMethod-${page}-all` }],
                ...temp,
                [{ text: i18n.t(lang, 'accept_button'), callback_data: 'set-payMethods-accept' }],
                [...paginations(lang, data, page, length, 'payMethods', size)],
                [{ text: i18n.t(lang, 'cancel_button'), callback_data: 'back' }]
            ]
        }
    };

    return message;
};

const menuAPIKeys = (lang, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'menuAPIKeys_message', {
            instruction: i18n.t(lang, 'instruction_url')
        }),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'addKey_button'), callback_data: 'add-api_keys' }],
                    [{ text: i18n.t(lang, 'selectKey_button'), callback_data: 'select-api_keys' }],
                    [{ text: i18n.t(lang, 'back'), callback_data: 'back' }]
                ]
            }
        }
    };

    return message;
};

const addAPIKeys = (lang, step, data, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'addAPIKeys_message'),
        extra: {}
    };
    let inline_keyboard = [];

    if (step === 'name') {
        message.text = i18n.t(lang, 'enterAPIKeyName_message');
    } else if (step === 'api') {
        message.text = i18n.t(lang, 'enterAPIKey_message');
    } else if (step === 'secret') {
        message.text = i18n.t(lang, 'enterAPISecret_message');
    } else {
        inline_keyboard = [
            [{
                text: i18n.t(lang, 'accept_button'),
                callback_data: 'accept'
            }],
            [{
                text: i18n.t(lang, 'enterAPIKeyName_button'),
                callback_data: 'choose-name'
            }],
            [{
                text: i18n.t(lang, 'enterAPIKey_button', { isAdded: (data['api']) ? '✅' : '❌' }),
                callback_data: 'choose-api'
            }],
            [{
                text: i18n.t(lang, 'enterAPISecret_button', { isAdded: (data['secret']) ? '✅' : '❌' }),
                callback_data: 'choose-secret'
            }]
        ];
    }

    inline_keyboard[inline_keyboard.length] = [{ text: i18n.t(lang, 'back_button'), callback_data: 'back' }];

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

    return message;
};

const APIKeysAdded = (lang) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'APIKeysAdded_message'),
        extra: {}
    };

    return message;
};

const userIdIsAlreadyUse = (lang) => {
    const message = {
        type: 'cb',
        text: i18n.t(lang, 'userIdIsAlredyUse_message'),
        extra: {
            show_alert: true
        }
    };

    return message;
};

const APIKeysIsNotCorrect = (lang) => {
    const message = {
        type: 'cb',
        text: i18n.t(lang, 'APIKeysIsNotCorrect_message'),
        extra: {
            show_alert: true
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

const notCorrectData = (lang, key = 'default') => {
    const message = {
        type: 'text',
        text: i18n.t(lang, `${key}NotCorrectData_message`),
        extra: {}
    };

    return message;
};

module.exports = {
    start,
    menu,
    startTrial3days,
    trial3days,
    startTrial3orders,
    trial3orders,
    subscribeChannels,
    remind,
    subIsEnd1DayRemind,
    incorrectCurrency,
    incorrectCoin,
    marketIsTooSmall,
    orderTextForUser,
    orderTextForAdmin,
    order,
    orderCollapse,
    orderExpand,
    botSettings,
    botSettingsType,
    payMethods,
    menuAPIKeys,
    addAPIKeys,
    APIKeysAdded,
    userIdIsAlreadyUse,
    APIKeysIsNotCorrect,
    userStatus,
    adminMenu,
    addProxies,
    proxiesIsAdded,
    botError,
    notCorrectData
}