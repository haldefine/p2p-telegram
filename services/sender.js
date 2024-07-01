const { Queue } = require('../modules/queue');

const {
    userDBService,
    messageDBService
} = require('./db');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class Sender extends Queue {
    constructor() {
        super();

        this.bot = {};
        this.delay = 100;
        this.counter = 0;

        this.TEXT_MAX_LENGTH = 4000;
        this.CAPTION_MAX_LENGTH = 1000;
    }

    async create(bot) {
        return this.bot = bot;
    }

    async start() {
        if (this.storage[this.count - 1]) {
            const {
                chat_id,
                message,
                expand,
                collapse
            } = this.storage[this.count - 1];

            this.dequeue();

            const res = await this.sendMessage(chat_id, message);

            if (res) {
                if (message.delete) {
                    setTimeout(() => this.deleteMessage(chat_id, res.message_id), message.delete);
                }

                if (message.deleteAfterAction) {
                    await userDBService.update({ tg_id: chat_id }, {
                        last_message_id: res.message_id
                    });
                }

                if (expand) {
                    expand.type = 'edit_text';
                    expand.message_id = res.message_id;

                    await messageDBService.create({
                        chat_id: chat_id,
                        type: 'expand',
                        message_id: res.message_id,
                        message: expand
                    });
                }

                if (collapse) {
                    collapse.type = 'edit_text';
                    collapse.message_id = res.message_id;

                    await messageDBService.create({
                        chat_id: chat_id,
                        type: 'collapse',
                        message_id: res.message_id,
                        message: collapse
                    });
                }
            }

            if (this.counter % 29 === 0) {
                await sleep(1500);
            }

            this.counter++;
        }

        setTimeout(() => this.start(), 100);
    }

    async unbanUser(chatId, user) {
        try {
            return await this.bot.telegram.unbanChatMember(chatId, user.tg_id, {
                only_if_banned: true
            });
        } catch (error) {
            console.log('[unbanUser]', error.response);

            return null;
        }
    }

    async banUser(chatId, user) {
        try {
            return await this.bot.telegram.banChatMember(chatId, user.tg_id);
        } catch (error) {
            console.log('[banUser]', error.response);

            return null;
        }
    }

    async deleteMessage(id, message_id) {
        try {
            return await this.bot.telegram.deleteMessage(id, message_id);
        } catch (error) {
            console.log('[deleteMessage]', id);

            return null;
        }
    }

    async deleteMessages(chat_id, message_ids) {
        try {
            return await this.bot.telegram.callApi('deleteMessages', {
                chat_id,
                message_ids
            });
        } catch (error) {
            console.log('[deleteMessages]', error.response);

            return null;
        }
    }

    async getChat(chat_id) {
        try {
            return await this.bot.telegram.callApi('getChat', {
                chat_id,
            });
        } catch (error) {
            console.log('[getChat]', error.response);

            return null;
        }
    }

    async getChatMember(chat_id, user_id) {
        try {
            return await this.bot.telegram.callApi('getChatMember', {
                chat_id,
                user_id
            });
        } catch (error) {
            console.log('[getChatMember]', error.response);

            return null;
        }
    }

    async sendMessage(chatId, message) {
        const MAX_LENGTH = (message.type === 'text') ?
            this.TEXT_MAX_LENGTH : this.CAPTION_MAX_LENGTH;

        let next = null,
            text = message.text,
            extra = {};

        if (text && text.length > MAX_LENGTH) {
            const temp = (message.text.split('\n'))
                .reduce((acc, el) => {
                    if ((acc['current'].length + el.length) < MAX_LENGTH) {
                        acc['current'] += el + '\n';
                    } else {
                        acc['next'] += el + '\n';
                    }

                    return acc;
                }, {
                    current: '',
                    next: ''
                });
            next = temp.next;
            text = temp.current;
            extra = {
                caption: text,
                parse_mode: 'HTML'
            };
        } else {
            extra = {
                caption: text,
                parse_mode: 'HTML',
                ...message.extra
            };
        }

        await sleep(this.delay);

        try {
            let res = null;

            switch (message.type) {
                case 'action':
                    res = await this.bot.telegram.sendChatAction(chatId, message.text);
                    break;
                case 'cb':
                    res = await this.bot.telegram.answerCbQuery(message.id, message.text, message.alert, extra);
                    break;
                case 'edit_keyboard':
                    res = await this.bot.telegram.editMessageReplyMarkup(chatId, message.message_id, null, extra.reply_markup);
                    break;
                case 'edit_text':
                    res = await this.bot.telegram.editMessageText(chatId, message.message_id, null, message.text, extra);
                    break;
                case 'edit_media':
                    res = await this.bot.telegram.editMessageMedia(chatId, message.message_id, null, message.file, extra);
                    break;
                case 'photo':
                    res = await this.bot.telegram.sendPhoto(chatId, message.file, extra);
                    break;
                case 'document':
                    res = await this.bot.telegram.sendDocument(chatId, message.file, extra);
                    break;
                case 'video':
                    res = await this.bot.telegram.sendVideo(chatId, message.file, extra);
                    break;
                case 'media_group':
                    await this.bot.telegram.sendMediaGroup(chatId, message.file, extra);
                    res = await this.bot.telegram.sendMessage(chatId, text, extra);
                    break;
                case 'invoice':
                    res = await this.bot.telegram.sendInvoice(chatId, message);
                    break;
                default:
                    res = (message.text.length > MAX_LENGTH) ?
                        await this.bot.telegram.sendMessage(chatId, text, {}) :
                        await this.bot.telegram.sendMessage(chatId, text, extra);
                    break;
            }

            if (this.delay >= 1000) {
                this.delay = 100;
            } else {
                this.delay += 100;
            }

            if (message.text && message.text.length > MAX_LENGTH) {
                const temp = {
                    type: 'text',
                    text: next,
                    extra: {
                        caption: next,
                        parse_mode: 'HTML',
                        ...message.extra
                    }
                };

                return this.sendMessage(chatId, temp);
            } else {
                return res;
            }
        } catch (error) {
            const response = (error.response) ? error.response : error;

            const modified_errors = [
                'Bad Request: message is not modified:',
                'Bad Request: message to edit not found'
            ];
            const parse_errors = [
                "Bad Request: can't parse entities:"
            ];
            const block_errors = [
                'Forbidden: bot was blocked by the user',
                "Forbidden: bot can't initiate conversation with a user",
                'Forbidden: user is deactivated'
            ];

            console.log(message);

            console.log('[sendMessage]', response);

            if (response.description && modified_errors.includes(response.description)) {
                const temp = {
                    type: 'text',
                    text: message.text,
                    extra: message.extra
                };

                return this.sendMessage(chatId, temp);
            } else if (response.description && parse_errors.includes(response.description)) {
                const temp = {
                    type: message.type,
                    text: message.text.replace(/([<>\/])/g, ''),
                    extra: {}
                };

                return this.sendMessage(chatId, temp);
            } else if (response.description && block_errors.includes(response.description)) {
                return await userDBService.update({ tg_id: chatId }, {
                    isActive: false
                });
            } else {
                return null;
            }
        }
    }
}

const sender = new Sender();
sender.start();

const signals = new Sender();
signals.start();

module.exports = {
    sender,
    signals
}