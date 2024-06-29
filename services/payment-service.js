const NowPaymentsApi = require('@nowpaymentsio/nowpayments-api-js');

const { Queue } = require('../modules/queue');

class PaymentService extends Queue {
    constructor() {
        super();

        this.api = new NowPaymentsApi({ apiKey: process.env.PAYMENT_API_KEY });
    }

    async createInvoice(id, data) {
        const temp = {
            price_amount: data.amount,
            price_currency: data.currency,
            order_id: data.type + '-' + data.period + '-' + id,
            order_description: data.type + ': ' + data.title,
            success_url: process.env.WEBHOOK_URL + '/payment/success',
            cancel_url: process.env.WEBHOOK_URL + '/payment/cancel'
        };

        return await this.api.createInvoice(temp);
    }
}

module.exports = new PaymentService();