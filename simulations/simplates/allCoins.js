const axios = require('axios')
let final = []
async function fetchCoins() {
    return axios.get("http://localhost:1357/coins")
        .then(resx => {
            let cob = resx.data
            Object.keys(cob).forEach(element => {
                final.push(cob[element].name)
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
            entryBudget: 4000,
            maxLossPercentage: 0.5,
            targetProfitPercentage: 0.05,
            partitionize: true
        }
    }