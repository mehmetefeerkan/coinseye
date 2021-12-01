const axios = require('axios')
let final = []

let preferredFiatFake = "USDT"
let coinCount = 10
async function fetchCoins() {
    return axios.get("https://api.binance.com/api/v3/ticker/24hr")
        .then(resx => {
            let cob = resx.data
            let inde = 0
            cob.sort((a, b) => (parseFloat(a.priceChangePercent) > parseFloat(b.priceChangePercent)) ? -1 : 1)
            cob.forEach(element => {
                if (inde <= coinCount) {
                    if ((element.symbol).includes(preferredFiatFake)) {
                        final.push(element.symbol)
                        inde ++
                    }
                }
            });
            return final
        })
        .catch(err => {
            console.error(err);
        })
}

module.exports = {
    fetchCoins: fetchCoins,
    settings: {
        entryBudget: 2000,
        maxLossPercentage: 0.5,
        targetProfitPercentage: 0.5,
        partitionize: true
    }
}