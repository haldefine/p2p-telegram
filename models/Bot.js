const { nanoid } = require('nanoid');

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const defaultSearchType = 'fixed';

/*interface ApiKey {
    api_key: string,
    secret_key: string
}
interface Proxy {
    "host": string,
    "username": string,
    "password": string
}
interface Cookie {
    "csrftoken": string,
    "p20t": string,
}

interface OrderKey {
    "name": string,
    "first_key": string,
    "second_key": string, // secret
    "isCookie": boolean // false
}*/

const ProxySchema = new Schema({
    isUse: Boolean,
    host: String,
    username: String,
    password: String
}, { versionKey: false });

const BotSchema = new Schema({
    type: {
        type: String
    }, // 3days || 3orders || personal
    name: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true,
        default: () => nanoid()
    },
    working: {
        type: Boolean,
        required: true,
        default: false
    },
    auth_search: {
        type: Boolean,
        required: true,
        default: true
    }, // всегда true
    search_keys: {
        type: Array
    }, // ApiKey
    order_keys: {
        type: [Object],
        required: true,
        default: []
    }, // список API ключей юзера (для 3orders и personal) OrderKey
    use_order_key: {
        type: String,
        required: true,
        default: '_'
    }, // актуальное name API ключа
    type_of_search: {
        type: String,
        required: true,
        default: defaultSearchType
    },
    numOrdersInSearch: {
        type: Number,
        required: true,
        default: 5
    },
    payMethods: {
        type: String,
        required: true,
        default: '[]'
    }, // задает юзер
    fiat: {
        type: String,
        required: true,
        default: '_'
    }, // валюта
    coin: {
        type: String,
        required: true,
        default: 'USDT'
    }, // задает юзер
    maxOrder: {
        type: Number,
        required: true,
        default: 999999999
    }, // задает юзер max_amount, 3orders использовать функцию
    minOrder: {
        type: Number,
        required: true,
        default: 0
    }, // задает юзер min_amount
    priceType: {
        type: String,
        required: true,
        default: 'diff' // diff or price
    },
    targetPrice: {
        type: Number,
        required: true,
        default: 1
    }, // юзер выбирает diff или price и задает значение, для 3days и 3orders diff от 1 процента
    colCreateOrders: {
        type: Number,
        required: true,
        default: 1
    }, // задает юзер Max num orders
    colRequestForOrder: {
        type: Number,
        required: true,
        default: 1
    }, // менять через админку
    take_max_order: {
        type: Boolean,
        required: true,
        default: () => false
    }, // задает юзер Take Full bank orders
    assignedToUser: {
        type: [Number],
        required: true
    }
}, { versionKey: false });

const Proxy = mongoose.model('Proxy', ProxySchema);
const Bot = mongoose.model('Bot', BotSchema);

module.exports = {
    Proxy,
    Bot
}