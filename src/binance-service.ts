import axios from 'axios';
import CryptoJS from 'crypto-js'

class BinanceService {
    isApiKeysValid(apiKey: string): boolean {
        throw new Error('Not implemented');
    }

    waitWhenFulfill(orderNo: string, api_key: string, secret_key: string, callback: (status: string) => void) {
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
                })

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
                            clearInterval(interval)
                            callback('Canceled');
                            break;
                        case 4:
                            clearInterval(interval)
                            callback('Completed');
                            break;
                        default:
                            callback(status.toString())
                            break
                    }
                }
            } catch (e: any) {
                clearInterval(interval)
                console.log(e)
            }
        }, 60*1000)
    }

    signUrl(url: string, secret_key: string) {
        const timestamp  = Date.now();
        let paramsObject: any = {};
        Object.assign(paramsObject, {timestamp});
        const queryString = Object.keys(paramsObject).map((key) => {
            return `${key}=${paramsObject[key]}`;
        }).join('&');
        const signature = CryptoJS.HmacSHA256(queryString, secret_key).toString();
        return `${url}?timestamp=${timestamp}&signature=${signature}`
    }
}

export default new BinanceService();