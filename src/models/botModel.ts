import mongoose from 'mongoose';
import {nanoid} from "nanoid";

const defaultSearchType: SearchType = "fixed";
export type SearchType = "fixed" | "static"

export interface ApiKey {
    api_key: string,
    secret_key: string
}
export interface Proxy {
    "host": string,
    "username": string,
    "password": string
}
export interface Cookie {
    "csrftoken": string,
    "p20t": string,
}

export interface OrderKey {
    "name": string,
    "first_key": string,
    "second_key": string,
    "isCookie": boolean
}


export interface IBot extends mongoose.Document {
    "name": string,
    "id": string,
    "working": boolean,
    "auth_search": boolean,
    "search_keys"?: ApiKey[],
    "order_keys": OrderKey[],
    "use_order_key": string,
    "proxies": Proxy[],
    "type_of_search": SearchType,
    "numOrdersInSearch": number,
    "payMethods": string,
    "fiat": string,
    "coin": string,
    "maxOrder": number,
    "minOrder": number,
    "targetPrice": number,
    "colCreateOrders": number,
    "colRequestForOrder": number,
    "take_max_order": boolean,
    assignedToUser: number[]
}

const BotSchema = new mongoose.Schema<IBot>({
    name: {type: String, required: true,},
    id: {type: String, required: true, default: () => nanoid()},
    working: {type: Boolean, required: true, default: false},
    auth_search: {type: Boolean, required: true, default: false},
    search_keys: {type: Array,},
    order_keys: {type: [Object], required: true, default: []},
    use_order_key: {type: String, required: true, default: '_'},
    proxies: {type: [Object], required: true, default: []},
    type_of_search: {type: String, required: true, default: defaultSearchType},
    numOrdersInSearch: {type: Number, required: true, default: 2},
    payMethods: {type: String, required: true, default: '[]'},
    fiat: {type: String, required: true, default: '_'},
    coin: {type: String, required: true, default: '_'},
    maxOrder: {type: Number, required: true, default: 0},
    minOrder: {type: Number, required: true, default: 0},
    targetPrice: {type: Number, required: true, default: 0},
    colCreateOrders: {type: Number, required: true, default: 1},
    colRequestForOrder: {type: Number, required: true, default: 1},
    take_max_order: {type: Boolean, required: true, default: () => false},
    assignedToUser: {type: [Number], required: true}
})


export default mongoose.model<IBot>('Bot', BotSchema);
