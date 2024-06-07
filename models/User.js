const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const defaultRole = 'REGISTRATION';
const defaultRegistrationStatus = '3orders';

const MessageSchema = new Schema({
    chat_id: {
        type: String
    },
    message_id: {
        type: String
    },
    message: {
        type: Object
    }
}, { versionKey: false });

const UserSchema = new Schema({
    tg_id: {
        type: Number,
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
    isActive: {
        type: Boolean
    },
    start_date: {
        type: Date,
        default: Date.now
    },
    subscription_end_date: {
        type: Date,
    },
    registrationStatus: {
        type: String,
        required: true,
        default: defaultRegistrationStatus,
    }, // 3days || 3orders || subscription
    assignedBots: {
        type: [String],
        required: true,
        default: []
    },
    currency: {
        type: String
    },
    binanceUserIds: {
        type: [String]
    }
}, { versionKey: false });

const Message = mongoose.model('Message', MessageSchema);
const User = mongoose.model('User', UserSchema);

module.exports = {
    Message,
    User
}