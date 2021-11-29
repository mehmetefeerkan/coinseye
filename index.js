const axios = require('axios')
const decreaseTolerance = 0.0002
const PouchDB = require('pouchdb');
const express = require('express')
const app = express()
const port = 1357
var bodyParser = require('body-parser')
app.use(bodyParser.json())
const fs = require('fs');

app.use(require('cors')())
const notifier = require('node-notifier');
// String


app.get('/coins', (req, res) => {
    res.send(coins)
})

app.get('/coins/list/increase/instances', (req, res) => {
    let tarr = []
    Object.keys(coins).forEach(element => {
        tarr.push(coins[element])
    });
    tarr.sort((a, b) => (a.states.secondly.increase.instances > b.states.secondly.increase.instances) ? -1 : 1)
    res.send(tarr)
})

let breakThrough = []
app.get('/coins/list/breakthru', (req, res) => {
    res.send(breakThrough)
})

app.get('/coins/list/upscore', (req, res) => {
    res.send(getRankedData("upScoreGlobal", false))
})
app.get('/coins/listtop/upscore/:top', (req, res) => {
    res.send(getRankedData("upScoreGlobal", false).slice(0, parseInt(req.params.top)))
})
app.get('/coins/list/upscore/reset', (req, res) => {
    res.send(setCoinData("upScoreGlobal", 0))
})
app.get('/coins/list/upscore/absolute', (req, res) => {
    res.send(getRankedData("upScoreGlobal", true))
})
app.get('/coins/listtop/upscore/absolute/:top', (req, res) => {
    res.send(getRankedData("upScoreGlobal", true).slice(0, parseInt(req.params.top)))
})
app.get('/coins/list/price/', (req, res) => {
    res.send(getRankedData("price", false))
})
app.get('/coins/list/price/absolute', (req, res) => {
    res.send(getRankedData("price", true))
})
app.get('/coins/list/increaseAverage/', (req, res) => {
    res.send(getRankedData("increaseAverage", false))
})
app.get('/coins/list/increaseAverage/absolute', (req, res) => {
    res.send(getRankedData("increaseAverage", true))
})

function getRankedData(place, absolute) {
    let tarr = []
    Object.keys(coins).forEach(element => {
        tarr.push(coins[element])
    });
    tarr.sort((a, b) => (a[place] > b[place]) ? -1 : 1)
    if (absolute) {
        let rarr = []
        tarr.forEach(element => {
            rarr.push({
                name: element.name,
                val: element[place]
            })
        });
        return rarr
    } else {
        return tarr
    }
}
function setCoinData(place, data) {
    Object.keys(coins).forEach(element => {
        (coins[element])[place] = data
    });
}

app.get('/coins/get/:cname', (req, res) => {
    res.send(coins[req.params.cname])
})

app.use(function (req, res, next) {
    if (!init) {
        res.send(502, { error: "SERVICE_IS_BOOTING" })
    } else {
        next()
    }
})

app.post('/coins/', async (req, res) => {
    let incomingCoin = req.body
    if (incomingCoin) {
        if (coins[incomingCoin.symbol]) {
            coinsData[incomingCoin.symbol] = req.body
            res.send(200, { coin: coins[incomingCoin.symbol] })
        } else if (incomingCoin.symbol && incomingCoin.price) {
            new coin(incomingCoin.symbol)
            coinsData[incomingCoin.symbol] = req.body
            res.send(200, { coin: coins[incomingCoin.symbol] })
        }
    }
})

app.listen(port)

let coinsData = {}
let coins = {}
let topUpScore = []
async function init() {
    let data_ = fs.readFileSync('./database.json', 'utf8');

    // parse JSON string to JSON object
    data_ = JSON.parse(data_);
    Object.keys(data_).forEach(element => {
        console.log("creating", data_[element].name);
        new coin(data_[element].name, data_[element].states)
    })
    fs.readdirSync("./markets").forEach(file => {
        if (file.endsWith("js")) {
            let currentMarket = require(`./markets/${file}`)
            setInterval(async () => {
                let coins_ = await currentMarket.fetchCoins()
                coins_.forEach(element => {
                    coinsData[element.symbol] = element
                    if (!coins[element.symbol]) {
                        console.log("xcreating", element.symbol);
                        new coin(element.symbol)
                    }
                });
            }, currentMarket.refresh);
            console.log(currentMarket);
        }
    });
    init = true
    setInterval(() => {
        fs.writeFile('./database.json', JSON.stringify(coins), 'utf8', (err) => {

            if (err) {
                console.log(`Error writing file: ${err}`);
            } else {
                console.log(`File is written successfully!`);
            }

        });
    }, 4000);

    setInterval(() => {

        let toNames = []
        getRankedData("upScoreGlobal", true).slice(0, 10).forEach(element => {
            toNames.push(element.name)
        });
        let diff = toNames.filter(x => topUpScore.indexOf(x) === -1)
        let diff2 = topUpScore.filter(x => toNames.indexOf(x) === -1)
        breakThrough = []
        diff.forEach(element => {
            topUpScore.length < 8 ? doNothing() : notifier.notify(element + " is now in the top 10")
            breakThrough.push(element)
        });
        topUpScore = []
        getRankedData("upScoreGlobal", true).slice(0, 10).forEach(element => {
            topUpScore.push(element.name)
        });
    }, 30000);

}

init()

function coin(name, states) {
    console.log(name);
    function state() {
        this.increase = {
            true: false,
            instances: 0,
            by: {
                amount: 0,
                relDiff: 0
            }
        },
            this.decrease = {
                true: false,
                tolerated: true,
                tolerations: 0,
                instances: 0,
                by: {
                    amount: 0,
                    relDiff: 0
                }
            }
        this.reference = 0
    }
    this.states = states || {}
    this.name = name
    this.price = null
    this.surging = false
    this.surgingSince = false
    this.upScoreGlobal = 0
    this.relDiff = null
    this.increaseAverage = 0
    this.updatePrice = function (newPrice, schedulation) {

        if (newPrice === 0) return

        if (!this.states[schedulation]) { this.states[schedulation] = new state() }
        this.states[schedulation].reference = parseFloat(this.states[schedulation].reference)
        newPrice = parseFloat(newPrice)
        this.states[schedulation].was = this.states[schedulation].reference
        if (this.states[schedulation].reference < newPrice) { // if coin price is smaller than new price
            this.states[schedulation].increase.true ? doNothing() : this.states[schedulation].increase.since = Date.now()
            this.states[schedulation].increase.true = true
            this.states[schedulation].increase.instances++
            this.states[schedulation].increase.by.amount = newPrice - this.states[schedulation].reference
            this.states[schedulation].increase.by.relDiff = relDiff(newPrice, this.states[schedulation].reference)
            schedulation !== "secondly" ? this.upScoreGlobal = this.upScoreGlobal + 1 : this.upScoreGlobal = this.upScoreGlobal + 0.01

            this.states[schedulation].decrease.true ? this.states[schedulation].decrease.since = 0 : doNothing()
            this.states[schedulation].decrease.true = false
            this.states[schedulation].decrease.tolerated = false
            this.states[schedulation].decrease.by.amount = 0
            this.states[schedulation].decrease.by.relDiff = 0

        } else {
            this.states[schedulation].decrease.true ? doNothing() : this.states[schedulation].decrease.since = Date.now()
            this.states[schedulation].decrease.true = true
            this.states[schedulation].decrease.instances++
            this.states[schedulation].decrease.by.amount = this.states[schedulation].reference - newPrice
            this.states[schedulation].decrease.by.relDiff = relDiff(newPrice, this.states[schedulation].reference)
            schedulation !== "secondly" ? this.upScoreGlobal = this.upScoreGlobal - 1 : this.upScoreGlobal = this.upScoreGlobal - 0.01
            if (this.states[schedulation].decrease.by.relDiff < decreaseTolerance) {
                this.states[schedulation].decrease.tolerations++
                this.states[schedulation].decrease.tolerated = true
                schedulation !== "secondly" ? this.upScoreGlobal = this.upScoreGlobal + 1 : this.upScoreGlobal = this.upScoreGlobal + 0.01
            } else {
                this.states[schedulation].increase.true ? this.states[schedulation].increase.since = 0 : doNothing()
            }

            this.states[schedulation].increase.true = false
            this.states[schedulation].increase.by.amount = 0
            this.states[schedulation].increase.by.relDiff = 0

        }
        this.states[schedulation].reference = newPrice
        let intx = 0
        let inty = 0
        Object.keys(this.states).forEach(element => {
            if (element) {
                this.states[element].increase.net = this.states[element].increase.instances - this.states[element].decrease.instances
                intx = intx + this.states[element].increase.instances
                inty = inty + this.states[element].decrease.instances
            }
        });
        intx = intx / Object.keys(this.states).length
        inty = inty / Object.keys(this.states).length
        this.increaseAverage = intx - inty
        this.price = parseFloat(coinsData[this.name].price)
    }
    coins[this.name] = /*coins[this.name] || */this
    function scheduleCheck(type, time, coinName) {
        setInterval(() => {
            coins[coinName].updatePrice(getCoinPrice(coinName), type)
        }, time)
    }
    //new scheduleCheck("secondly", 1000, this.name, this.price)
    new scheduleCheck("biminutely", 1000 * 30, this.name)
    new scheduleCheck("minutely", 1000 * 60, this.name)
    new scheduleCheck("tenminutes", (1000 * 60) * 10, this.name)
    new scheduleCheck("bihourly", (1000 * 60) * 30, this.name)
    new scheduleCheck("hourly", (1000 * 60) * 60, this.name)
}

function relDiff(a, b) {
    return 100 * Math.abs((a - b) / ((a + b) / 2));
}
function getCoinPrice(cn) {
    if (!coinsData[cn]) return 0
    return coinsData[cn].price
}

function doNothing() {
    return
}

/* const bc = require('./binance.js')
async function fd() {
    console.log(await bc.fetchCoins());
}
fd() */
