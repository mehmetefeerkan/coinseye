const axios = require('axios')
const pref = require('./pref.json')
console.log("TARGETED LIQUIDATION CURRENCY = ", pref.preferedNearFiat);

let coins = {}
let coinsCache = {}
let increases = {}


async function fetchCoins(init) {
  axios.get("https://api.binance.com/api/v3/ticker/price")
  .then(res => {
    let datarray = res.data
    let instcoins = 0
    datarray.forEach(element => {
      let ename = element.symbol
      if ((pref.preferedNearFiat === "*") || ((ename).includes(pref.preferedNearFiat))) {
        coins[(ename)] = parseFloat(element.price)
        instcoins++
      }
    });
    //console.log(coins);
    //console.log(coins["SANDUSDT"], coinsCache["SANDUSDT"]);
    console.log("fetched coins : " ,instcoins);
    lookIntoCoins()
    return
  })
  .catch(err => {
    console.error(err); 
  })
}

fetchCoins()
setInterval(() => {
  fetchCoins()
  //console.log(increases);
  Object.keys(coins).forEach(element => {
    if(increases[element].iterations > 1) {
      console.log(increases[element]);
    }
  })
}, pref.coinsRefreshIntervalSeconds * 1000);




async function lookIntoCoins() {
  //console.log("sandust came in with", coins["SANDUSDT"]);
  //console.log("sandust was", coinsCache["SANDUSDT"]);
  Object.keys(coins).forEach(element => {
    if (!increases[element]) {
      increases[element] = {}
      increases[element].iterations = 0
      increases[element].val = 0
      increases[element].startedSurging = 0
      increases[element].surgingFor = 0
    }
    let currentCoinPrice = coins[element]
    let oldCoinPrice = coinsCache[element]
    //console.log(currentCoinPrice, oldCoinPrice);
    if (currentCoinPrice > oldCoinPrice) {
      //console.log(`${element} HAS INCREASED FROM ${oldCoinPrice} to ${currentCoinPrice}`);
      increases[element].iterations = increases[element].iterations + 1
      increases[element].val = currentCoinPrice - oldCoinPrice
      increases[element].startedSurging = Date.now()
      increases[element].surgingFor = (Date.now() - (increases[element].startedSurging))
    } else {
      increases[element].iterations = 0
      increases[element].val = 0
    }
    coinsCache[element] = currentCoinPrice
  });

}