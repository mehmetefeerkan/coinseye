const axios = require('axios')
async function fetchCoins(init) {
    return axios.get("https://api.binance.com/api/v3/ticker/price")
        .then(res => {
            let datarray = res.data
            return datarray
        })
        .catch(err => {
            console.error(err.code);
        })
}

module.exports = {
    fetchCoins: fetchCoins,
    refresh: 500
}