const mongoose = require('mongoose');

const { Message, Promo, User } = require('../models/User');
const { Proxy, Key, Order, Bot } = require('../models/Bot');

const DB_CONN = process.env.DB_CONN;

mongoose.set('strictQuery', false);
mongoose.connect(DB_CONN, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
});

class DBMethods {
    constructor (model) {
        this.Model = model;
    }

    async create (data) {
        return await this.Model.create(data);
    }

    async get (req) {
        return await this.Model.findOne(req);
    }

    async getAll (req, score = {}, sort = {}, limit = false) {
        return (limit) ?
            await this.Model.find(req, score).sort(sort).limit(limit) :
            await this.Model.find(req);
    }

    async update (req, update, returnDocument = 'before', upsert) {
        return await this.Model.findOneAndUpdate(req, update, {
            upsert,
            returnDocument
        });
    }

    async updateAll (req, update) {
        return await this.Model.updateMany(req, update);
    }

    async delete (req) {
        return await this.Model.findOneAndDelete(req);
    }

    async deleteAll (req) {
        return await this.Model.deleteMany(req);
    }

    async getCount (req) {
        return await this.Model.find(req).count();
    }

    async dropCollection () {
        return await this.Model.collection.drop();
    }
}

const messageDBService = new DBMethods(Message);
const promoDBService = new DBMethods(Promo);
const userDBService = new DBMethods(User);
const proxyDBService = new DBMethods(Proxy);
const keyDBService = new DBMethods(Key);
const orderDBService = new DBMethods(Order);
const botDBService = new DBMethods(Bot);

module.exports = {
    messageDBService,
    promoDBService,
    userDBService,
    proxyDBService,
    keyDBService,
    orderDBService,
    botDBService
}