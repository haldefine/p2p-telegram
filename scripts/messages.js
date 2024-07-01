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
        } else if (page === 0 && length > size) {
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

const menu = (lang) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'menu_message'),
        extra: {
            reply_markup: {
                resize_keyboard: true,
                keyboard: [
                    [
                        { text: i18n.t(lang, 'botMenu_button') },
                        { text: i18n.t(lang, 'faq_button') }
                    ],
                    [
                        { text: i18n.t(lang, 'channels_button') },
                        { text: i18n.t(lang, 'information_button') }
                    ],
                    [{ text: i18n.t(lang, 'support_button') }]
                ]
            }
        }
    };

    return message;
};

const startTrial = (lang) => {
    const CONFIG = JSON.parse(fs.readFileSync('./config.json'));

    const message = {
        type: 'text',
        text: i18n.t(lang, 'startTrial_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: i18n.t(lang, 'startTrial_button'), callback_data: 'trial' },
                        { text: i18n.t(lang, 'buySub_button'), callback_data: 'buy-subscription' },
                    ],
                    [{ text: i18n.t(lang, 'information_button'), url: CONFIG['INFORMATION_URL'] }]
                ]
            }
        }
    };

    return message;
};

const botMenu = (lang, user, bot, message_id = null, orders = []) => {
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

        inline_keyboard = [
            [{ text: i18n.t(lang, 'buySub_button'), callback_data: 'buy-sub' }],
            [{ text: i18n.t(lang, 'changeTrialPeriod_button'), callback_data: 'change-trial' }],
            [{ text: i18n.t(lang, 'information_button'), url: CONFIG['INFORMATION_URL'] }]
        ];
    } else if (user.registrationStatus === '3orders' || user.registrationStatus === 'subscription') {
        const startBot_text = (bot.working) ?
            i18n.t(lang, 'stopBot_button') : i18n.t(lang, 'startBot_button');
        const startBot_cd = (bot.working) ?
            `stopBot-${bot.id}` : `startBot-${bot.id}`;
        const statisticsButton = (user.registrationStatus === '3orders') ?
            [{ text: i18n.t(lang, 'buySub_button'), callback_data: 'buy-subscription' }] :
            [{ text: i18n.t(lang, 'statistics_button'), callback_data: `statistics-${bot.id}` }];

        message.text = (user.registrationStatus === '3orders') ?
            i18n.t(lang, 'botMenu3orders_message', {
                orders: 3 - orders.length
            }) :
            i18n.t(lang, 'botMenu_message', {
                name: bot.name,
                status: bot.working ? 'working' : 'not working',
                subEnd: user.sub_end_date.toLocaleDateString('ru-RU')
            });

        inline_keyboard = [
            [{ text: startBot_text, callback_data: startBot_cd }],
            [{ text: i18n.t(lang, 'settings_button'), callback_data: `settings-${bot.id}` }],
            statisticsButton
        ];
    }

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

const subscribeChannels = (lang, channels, callback_data = 'check-subscribe', message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'subscribeChannels_message'),
        extra: {}
    };
    const inline_keyboard = channels.reduce((acc, el) => {
        acc[acc.length] = [{ text: el.title, url: el.invite_link }]
        return acc;
    }, []);

    inline_keyboard[inline_keyboard.length] = [{
        text: i18n.t(lang, 'checkSubscribe_button'),
        callback_data
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

const changeTrial = (lang, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'changeTrial_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'changeTo3orders_button'), callback_data: 'change-3orders' }]
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
                        callback_data: 'payMethods'
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
                        callback_data: 'menu-APIKeys'
                    }],
                    [{
                        text: i18n.t(lang, 'back_button'),
                        callback_data: 'cancel'
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
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'choosePayMethods_message'),
        extra: {}
    };

    const temp = [];
    const size = 5;
    const startIndex = page * size;
    const endIndex = (startIndex + size < length) ?
        startIndex + size : length;

    for (let i = startIndex; i < endIndex; i++) {
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
                    [{ text: i18n.t(lang, 'addKey_button'), callback_data: 'add-APIKeys' }],
                    [{ text: i18n.t(lang, 'selectKey_button'), callback_data: 'select-APIKeys' }],
                    [{ text: i18n.t(lang, 'back_button'), callback_data: 'back' }]
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

    inline_keyboard[inline_keyboard.length] = [
        { text: i18n.t(lang, 'back_button'), callback_data: 'back' }
    ];

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

const selectAPIKey = (lang, bot, data, page, length, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'selectAPIKey_message', {
            botName: bot.name,
            APIName: bot.use_order_key
        }),
        extra: {}
    };

    const temp = [];
    const size = 5;
    const startIndex = page * size;
    const endIndex = (startIndex + size < length) ?
        startIndex + size : length;

    for (let i = startIndex; i < endIndex; i++) {
        temp[temp.length] = [{
            text: data[i].name,
            callback_data: `set-use_order_key-${data[i]._id}`
        }];
    }

    message.extra = {
        reply_markup: {
            inline_keyboard: [
                ...temp,
                [...paginations(lang, data, page, length, 'APIKeys')],
                [{ text: i18n.t(lang, 'cancel_button'), callback_data: 'back' }]
            ]
        }
    };

    return message;
};

const choosePlan = (lang, data, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'choosePlan_message'),
        extra: {}
    };
    const inline_keyboard = data.reduce((acc, el, index) => {
        acc[acc.length] = [{
            text: el.title + ' - ' + el.amount + '$',
            callback_data: `choose-${index}`
        }];

        return acc;
    }, []);

    inline_keyboard[inline_keyboard.length] = [{
        text: i18n.t(lang, 'back_button'),
        callback_data: 'cancel'
    }];

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

    return message;
};

const enterPromoCode = (lang, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'enterPromoCode_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'skip_button'), callback_data: 'skip' }],
                    [{ text: i18n.t(lang, 'back_button'), callback_data: 'reenter' }]
                ]
            }
        }
    };

    return message;
};

const incorrectPromoCode = (lang) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'incorrectPromoCode_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'skip_button'), callback_data: 'skip' }]
                ]
            }
        }
    };

    return message;
};

const invoice = (lang, invoice, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'invoice_message'),
        extra: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: i18n.t(lang, 'pay_button'), url: invoice.invoice_url }],
                    [{ text: i18n.t(lang, 'back_button'), callback_data: 'buy-subscription' }]
                ]
            }
        }
    };

    return message;
};

const subscriptionPaidSuccessfully = (lang, key) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'subscriptionPaidSuccessfully_message', {
            key: `${key}YourBot_message`
        }),
        extra: {}
    };

    if (key === 'start') {
        inline_keyboard = [
            [{ text: i18n.t(lang, 'startBot_button'), callback_data: 'settings' }]
        ];
    } else {
        inline_keyboard = [
            [{ text: i18n.t(lang, 'createBot_button'), callback_data: 'add-create_bot' }]
        ];
    }

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

    return message;
};

const subscriptionPaidSuccessfullyLogs = (lang, user, body, days) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'subscriptionPaidSuccessfullyLogs_message', {
            user: i18n.t(lang, 'user_url', {
                id: user.tg_id,
                username: user.tg_username
            }),
            days,
            promoCode: (user.isPromoCodeActivated) ? user.promo_code : '❌'
        }),
        extra: {}
    };

    return message;
};

const paidFailedLogs = (lang, data) => {
    const message = {
        type: 'text',
        text: i18n.t(lang, 'paidFailedLogs_message'),
        extra: {}
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

const answerCbQuery = (lang, key, show_alert) => {
    const message = {
        type: 'cb',
        text: i18n.t(lang, key),
        extra: {
            show_alert
        }
    };

    return message;
};

module.exports = {
    menu,
    startTrial,
    botMenu,
    startTrial3days,
    trial3days,
    startTrial3orders,
    trial3orders,
    subscribeChannels,
    remind,
    subIsEnd1DayRemind,
    changeTrial,
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
    selectAPIKey,
    choosePlan,
    enterPromoCode,
    incorrectPromoCode,
    invoice,
    subscriptionPaidSuccessfully,
    subscriptionPaidSuccessfullyLogs,
    paidFailedLogs,
    userStatus,
    adminMenu,
    addProxies,
    proxiesIsAdded,
    botError,
    notCorrectData,
    answerCbQuery
}