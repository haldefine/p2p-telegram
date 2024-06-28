const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const defaultRole = 'user';
const defaultRegistrationStatus = '3orders';

const MessageSchema = new Schema({
    chat_id: {
        type: String
    },
    type: {
        type: String
    },
    message_id: {
        type: String
    },
    message: {
        type: Object
    }
}, { versionKey: false });

const PromoSchema = new Schema({
    id: {
        type: String,
        required: true,
    },
    from: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        default: 'discount' // discount
    },
    discount: {
        type: Number
    },
    expire_date: {
        type: Date
    },
    count: {
        type: Number
    }
}, { versionKey: false });

const UserSchema = new Schema({
    tg_id: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    tg_username: {
        type: String,
        required: false,
        default: '',
    },
    lang: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        default: defaultRole,
    },
    promo_code: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isPromoCodeActivated: {
        type: Boolean,
        required: true,
        default: false
    },
    start_date: {
        type: Date,
        default: Date.now
    },
    sub_end_date: {
        type: Date,
    },
    registrationStatus: {
        type: String,
        required: true,
        default: defaultRegistrationStatus,
    }, // 3days || 3orders || subscription || free
    assignedBots: {
        type: [String],
        required: true,
        default: []
    },
    binanceUserIds: {
        type: [String]
    },
    currency: {
        type: String
    },
    last_message_id: {
        type: String
    }
}, { versionKey: false });

const Message = mongoose.model('Message', MessageSchema);
const Promo = mongoose.model('Promo', PromoSchema);
const User = mongoose.model('User', UserSchema);

module.exports = {
    Message,
    Promo,
    User
}