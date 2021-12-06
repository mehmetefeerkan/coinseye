const axios = require('axios')
let preferredFiatFakes = ["USDT"]
let coinMap = require('./maps/cnc.json').data
marketModule = "binance.js"
marketName = "binance"
let datarray = []
let staticdata = null


async function fetchCoins(init) {
    return axios.get("https://api.binance.com/api/v3/ticker/price")
    .then(res => {
        datarray = []
        let rd = res.data
        rd.forEach(element => {
            if(isWorkableWithFiatFakeSelections(element.symbol)) {
                element.logo = getCoinLogo(sanitizeSymbolToTokenName(element.symbol))
                element.name_alt = getAltName(sanitizeSymbolToTokenName(element.symbol))
                element.market = {}
                element.market.module = marketModule
                element.market.slug = marketName
                element.worksWith = (element.symbol).replace(sanitizeSymbolToTokenName(element.symbol), "")
                datarray.push(element)
            }
        });
        return datarray
    })
    .catch(err => {
        console.error(err.code);
        return datarray
    })
}


function getCoinLogo(coin) {
    let result = "https://s2.coinmarketcap.com/static/img/coins/128x128/1.png"
    coinMap.forEach(element => {
        if(((element.symbol)) === coin) {
            result = `https://s2.coinmarketcap.com/static/img/coins/128x128/${element.id}.png`
        }
    });
    return result
}

function getAltName(coin) {
    let result = coin
    coinMap.forEach(element => {
        if(((element.symbol)) === coin) {
            result = `${element.name}`
        }
    });
    return result
}

function isWorkableWithFiatFakeSelections(symbol) {
    let result = false
    preferredFiatFakes.forEach(element => {
        if (symbol.includes(element)) {
            result =  true
        }
    });
    return result
}

function sanitizeSymbolToTokenName(symbol) {
    let symbol_ = symbol
    preferredFiatFakes.forEach(element => {
        symbol_ = symbol_.replace(element, "")
    });
    return symbol_
}

module.exports = {
    fetchCoins: fetchCoins,
    refresh: 500,
    sanitizeSymbolToTokenName: sanitizeSymbolToTokenName
}