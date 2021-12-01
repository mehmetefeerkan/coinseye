const axios = require('axios')
let final = []

let filters = [
    "MANAUSDT",
    "GALAUSDT",
    "SANDUSDT",
    "AXSUSDT",
    "ENJUSDT",
    "UFOUSDT"
]

async function fetchCoins() {
    return axios.get("http://localhost:1357/coins")
        .then(resx => {
            let cob = resx.data
            Object.keys(cob).forEach(element => {
                if (filters.includes(element)) {
                    console.log(element);
                    final.push(cob[element].name)
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
            entryBudget: 75,
            maxLossPercentage: 0.5,
            targetProfitPercentage: 1,
            partitionize: true
        }
    }