const axios = require('axios')
let final = []
async function fetchCoins() {
    return axios.get("http://localhost:1357/coins/listtop/increaseAverage/absolute/10")
        .then(resx => {
            let cob = resx.data
            cob.forEach(element => {
                final.push(element.name)
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
            entryBudget: 150,
            maxLossPercentage: 0.5,
            targetProfitPercentage: 1,
            partitionize: true

        }
    }