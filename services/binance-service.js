const axios = require('axios');
const CryptoJS = require('crypto-js');

class BinanceService {
    isApiKeysValid(apiKey){
        throw new Error('Not implemented');
    }

    /**
     * Gets the list of fiats.
     * @return {Promise<string[]>} An array of fiat currency codes
     */
    async getFiatsList() {
        let data = JSON.stringify({});

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://p2p.binance.com/bapi/c2c/v1/friendly/c2c/trade-rule/fiat-list',
            headers: {
                'content-type': 'application/json'
            },
            data : data
        };

        const res = await axios.request(config);
        const fiats = res.data.data.map(fiat => fiat.currencyCode);
        return fiats.filter(fiat => fiat !== 'UAH');
    }

    /**
     * Retrieves the coin information based on the provided fiat currency.
     *
     * @param {string} fiat - The fiat currency for which to retrieve the coin information.
     * @return {Promise<string[]>} An array of assets representing the coins related to the specified fiat currency.
     */
    async getCoinsList(fiat) {
        let data = JSON.stringify({
            "fiat": fiat
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/portal/config',
            headers: {
                'Content-Type': 'application/json'
            },
            data : data
        };

        const res = await axios.request(config)
        const p2pdata = res.data.data.areas.find(area => area.area === 'P2P');
        const buySide = p2pdata.tradeSides.find(side => side.side === 'BUY');
        // const payMethods = buySide.tradeMethods.map(method => method.identifier);
        return buySide.assets.map(asset => asset.asset);
    }

    /**
     * Retrieves the payment methods available for a given fiat currency.
     *
     * @param {string} fiat - The fiat currency for which to retrieve the payment methods.
     * @return {Promise<string[]>} An array of payment method identifiers.
     */
    async getPayMethods(fiat) {
        let data = JSON.stringify({
            "fiat": fiat
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://p2p.binance.com/bapi/c2c/v2/public/c2c/adv/filter-conditions',
            headers: {
                'Content-Type': 'application/json'
            },
            data : data
        };

        const res = await axios.request(config)
        return res.data.data.tradeMethods.map(m => m.identifier);
    }

    /**
     * Retrieves the price of a specific fiat currency from Binance's API.
     *
     * @param {string} fiat - The fiat currency to retrieve the price for.
     * @return {Promise<number>} The price of the specified fiat currency.
     */
    async getPrice(fiat) {
        const res = await axios.post('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            "fiat": fiat,
            "page": 1,
            "rows": 1,
            "tradeType": "BUY",
            "asset": "USDT"
        }, {
            maxBodyLength: Infinity,
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (res.data && res.data.data[0]) {
            return Number(res.data.data[0].adv.price);
        } else {
            return 0;
        }
    }

    /**
     * Retrieves the user identifier from the Binance API using the provided API key and secret key.
     *
     * @param {string} api_key - The API key for authentication.
     * @param {string} secret_key - The secret key for authentication.
     * @return {Promise<string>} A promise that resolves to the user's full name retrieved from the API response.
     */
    async getUserIdentifier(api_key, secret_key) {
        const res = await axios.request({
            method: 'post',
            maxBodyLength: Infinity,
            url: this.signUrl('https://api.binance.com/sapi/v1/c2c/user/baseDetail', secret_key),
            headers: {
                'X-MBX-APIKEY': api_key,
                'Content-Type': 'application/json'
            },
            data: {}
        });
        return res.data.data.kycFullName;
    }


    waitWhenFulfill(orderNo, api_key, secret_key, callback) {
        let lastStatus = 0;

        const interval = setInterval(async () => {
            try {
                const response = await axios.request({
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: this.signUrl('http://api.binance.com/sapi/v1/c2c/orderMatch/getUserOrderDetail', secret_key),
                    headers: {
                        'X-MBX-APIKEY': api_key,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        "adOrderNo": orderNo
                    })
                });

                const status = response?.data?.data?.orderStatus;

                if (status !== lastStatus) {
                    lastStatus = status;
                    switch (status) {
                        case 1:
                            break;
                        case 2:
                            callback('Buyer payed');
                            break;
                        case 5:
                            callback('Appeal');
                            break;
                        case 6:
                        case 7:
                            clearInterval(interval);
                            callback('Canceled');
                            break;
                        case 4:
                            clearInterval(interval);
                            callback('Completed');
                            break;
                        default:
                            callback(status.toString());
                            break;
                    }
                }
            } catch (e) {
                clearInterval(interval);
                console.log(e);
            }
        }, 60*1000);
    }

    signUrl(url, secret_key) {
        const timestamp  = Date.now();

        let paramsObject = {};

        Object.assign(paramsObject, {
            timestamp
        });

        const queryString = Object.keys(paramsObject).map((key) => {
            return `${key}=${paramsObject[key]}`;
        }).join('&');
        const signature = CryptoJS.HmacSHA256(queryString, secret_key).toString();

        return `${url}?timestamp=${timestamp}&signature=${signature}`;
    }
}

module.exports = new BinanceService();