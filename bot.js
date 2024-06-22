require('dotenv').config();

const { Telegraf } = require('telegraf');
const {
    Extra,
    Markup,
    Stage,
    session,
} = Telegraf;
const TelegrafI18n = require('telegraf-i18n/lib/i18n');
const rateLimit = require('telegraf-ratelimit');

const middlewares = require('./scripts/middlewares');
const messages = require('./scripts/messages');
const timer = require('./scripts/timer');

const {
    userDBService,
    botDBService,
    keyDBService,
    proxyDBService
} = require('./services/db');
const {
    sender,
    signals
} = require('./services/sender');

const WebService = require('./services/web-service');
const EventsService = require('./services/events-service');
const BinanceService = require('./services/binance-service');
const BotService = require('./services/bot-service');

const profile = require('./scenes/profile');
const admin = require('./scenes/admin');

const stage = new Stage([
    profile.start3daysTrial(),
    profile.start3ordersTrial(),
    profile.botSettings(),
    profile.addAPIKeys(),
    admin.adminMenu()
]);

const bot = new Telegraf(process.env.BOT_TOKEN, { handlerTimeout: 100 });

const { telegram: tg } = bot;

tg.callApi('getUpdates', { offset: -1 })
    .then(updates => updates.length && updates[0].update_id + 1)
    .then(offset => { if (offset) return tg.callApi('getUpdates', { offset }) })
    .then(() => bot.launch())
    .then(() => console.info('The bot is launched'))
    .catch(err => console.error(err))

const limitConfig = {
    window: 1000,
    limit: 1,
    onLimitExceeded: (ctx, next) => ctx.telegram.sendChatAction(ctx.from.id, 'typing')
};

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

const stnk = process.env.STNK_ID;

bot.use(session());
bot.use(i18n.middleware());
bot.use(stage.middleware());
bot.use(rateLimit(limitConfig));

bot.use(middlewares.start);
bot.use(middlewares.commands);
bot.use(middlewares.cb);

bot.catch(err => console.error(err));

bot.hears(/clear (users|bots|keys|proxies)/, async (ctx) => {
    if (ctx.from.id == stnk) {
        const key = ctx.match[1];

        console.log(key)

        if (key === 'users') {
            await userDBService.deleteAll({});
        } else if (key === 'bots') {
            const bots = await botDBService.getAll({});

            for (let i = 0; i < bots.length; i++) {
                const el = bots[i];

                BotService.stopBot(el.id);

                await botDBService.delete({ id: el.id });
            }

            await keyDBService.updateAll({}, {
                bot_id: [],
                isUse: false
            });

            await proxyDBService.updateAll({}, {
                bot_id: '',
                isUse: false
            });

            await userDBService.updateAll({}, {
                assignedBots: []
            });
        } else if (key === 'keys') {
            await keyDBService.deleteAll({});
        } else if (key === 'proxies') {
            await proxyDBService.deleteAll({});
        }

        await ctx.replyWithHTML('Done!');
    }
});

bot.command('test', async (ctx) => {
    const fullData = {
        //result: t.order[result],
        result: 'new',
        price: 100,
        amounts: 100,
        coin: 'USD',
        fiat: 'USD',
        totalAmount: (100.112312).toFixed(2),
        minVolume: 'order.min_volume',
        maxVolume: 'order.max_volume',
        methods: 'methods',
        user: ctx.state.user,
        binanceUsername: 'nickname',
        dateTime: new Date(),
        botName: 'name',
        advNo: 1000,
        orderNo: '',
        delay: 1000,
        responses: '',
        marketPrice: 1000,
        diffPrice: ((1000 / 100 - 1) * 100).toFixed(1)
    };
    const message = messages.orderExpand('uk', fullData)

    sender.enqueue({
        chat_id: ctx.from.id,
        message
    });
});

bot.telegram.getMe().then((botInfo) => {
    const botUsername = botInfo.username;
    console.log(`Username: @${botUsername}`);
});

sender.create(bot);
signals.create(bot);

timer.checkSub();

WebService.setEventHandler(EventsService.handleEvent.bind(EventsService));

(() => {
    const fs = require('fs');

    if (!fs.existsSync('./config.json')) {
        fs.writeFileSync('./config.json', fs.readFileSync('./config_example.json'));
    }
})()

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));