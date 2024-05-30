const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    tg_id: String,
    tg_username: String,
    locale: String,
    status: String,
    isAdmin: Boolean,
    isActive: Boolean,
    start_date: {
        type: Date,
        default: Date.now
    },
    end_date: Date
}, { versionKey: false });

const User = mongoose.model('User', UserSchema);

module.exports = {
    User
}