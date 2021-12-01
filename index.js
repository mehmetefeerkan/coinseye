const axios = require('axios')
const decreaseTolerance = 0.0002
const PouchDB = require('pouchdb');
const express = require('express')
const app = express()
var expressWs = require('express-ws')(app);
const port = 1357
var bodyParser = require('body-parser')
app.use(bodyParser.json())
const fs = require('fs');
const open = require('open')
let wsInterval = 1000


let mobilePush = false

app.use(require('cors')())
const notifier = require('node-notifier');
// String


app.get('/coins', (req, res) => {
    res.send(coins)
})
app.get('/coinsData', (req, res) => {
    res.send(coinsData)
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
let breakThroughDetailed = []

app.get('/coins/list/breakthru/', (req, res) => {
    res.send(breakThrough)
})
app.get('/coins/list/breakthru/detailed', (req, res) => {
    res.send(breakThroughDetailed)
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
app.get('/coins/listtop/increaseAverage/absolute/:top', (req, res) => {
    res.send(getRankedData("increaseAverage", true).slice(0, parseInt(req.params.top)))
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

app.ws('/coins', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(coins))
    }, wsInterval);
});
app.ws('/stats', function (ws, req) {
    setInterval(() => {
        let clients = 0
        expressWs.getWss().clients.forEach(client => {
            // Check if connection is still open
            if (client.readyState !== client.OPEN) return;
            clients++
          });
        ws.send(clients)
    }, wsInterval);
});
app.ws('/coins/list/breakthru/', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(breakThrough))
    }, wsInterval);
})
app.ws('/coins/list/breakthru/detailed', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(breakThroughDetailed))
    }, wsInterval);
})
app.ws('/coins/list/upscore', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("upScoreGlobal", false)))
    }, wsInterval);
})
app.ws('/coins/list/upscore/reset', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(setCoinData("upScoreGlobal", 0)))
    }, wsInterval);
})
app.ws('/coins/list/upscore/absolute', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("upScoreGlobal", true)))
    }, wsInterval);
})
app.ws('/coins/list/price/', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("price", false)))
    }, wsInterval);
})
app.ws('/coins/list/price/absolute', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("price", true)))
    }, wsInterval);
})
app.ws('/coins/list/increaseAverage/', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("increaseAverage", false)))
    }, wsInterval);
})
app.ws('/coins/list/increaseAverage/absolute', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("increaseAverage", true)))
    }, wsInterval);
})

app.listen(port)

let coinsData = {}
let coins = {}
let topUpScore = []
async function init() {
    let data_ = fs.readFileSync('./database.json', 'utf8');

    // parse JSON string to JSON object
    data_ = JSON.parse(data_ || JSON.stringify({}));
    Object.keys(data_).forEach(element => {
        new coin(data_[element].name, data_[element].states)
    })
    fs.readdirSync("./markets").forEach(file => {
        if (file.endsWith("js")) {
            let currentMarket = require(`./markets/${file}`)
            setInterval(async () => {
                let coins_ = await currentMarket.fetchCoins()
                if (coins_) {
                    coins_.forEach(element => {
                        coinsData[element.symbol] = element
                        if (!coins[element.symbol]) {
                            new coin(element.symbol)
                        }
                    });
                }
            }, currentMarket.refresh);
        }
    });
    init = true
    setInterval(() => {
        fs.writeFile('./database.json', JSON.stringify(coins), 'utf8', (err) => {

            if (err) {
                console.error(`Error writing file: ${err}`);
            } else {
                //console. log(`File is written successfully!`);
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
            topUpScore.length < 8 ? doNothing() : notifyBreakthrough(element)
            breakThrough.push(element)
        });
        topUpScore = []
        getRankedData("upScoreGlobal", true).slice(0, 10).forEach(element => {
            topUpScore.push(element.name)
        });
    }, 5000);

}

setInterval(() => {
    breakThroughDetailed = breakThroughDetailed.slice(0, 10)
}, 12000);

function notifyBreakthrough(coinName) {
    let coinWorksWith = (coinsData[coinName].worksWith);
    let coinSymbol = (require(`./markets/${coinsData[coinName].market.module}`).sanitizeSymbolToTokenName(coinName));
    breakThroughDetailed.push(`${coinSymbol}-${coinWorksWith}`)
    notifier.notify(
        {
            title: 'A coin just reached upScore top 10',
            message: `${coinName} is now in the top 10`,
            sound: true, // Only Notification Center or Windows Toasters
            icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png'
        },
        function (err, response, metadata) {
            // Response is response from notification
            // Metadata contains activationType, activationAt, deliveredAt
        }
    );
    if (mobilePush) {
        var options = {
            method: 'POST',
            url: 'https://notify.run/uNrbu4wt7YmXoajFopwL',
            data: `${coinName} is now in the upScore top 10 ranking.`,
        };

        axios.request(options).then(function (response) {
            console.log(response.data);
        }).catch(function (error) {
            console.error(error);
        });
    }
}

notifier.on('click', function (notifierObject, options, event) {
    let coin = (options.m).split(" ")[0]
    console.log("our coin is: ", coin);
    let coinWorksWith = (coinsData[coin].worksWith);
    let coinSymbol = (require(`./markets/${coinsData[coin].market.module}`).sanitizeSymbolToTokenName(coin));
    breakThroughDetailed.push(`${coinSymbol}-${coinWorksWith}`)
    console.log("launching", `https://cryptowat.ch/tr-tr/charts/${coinsData[coin].market.slug}:${coinSymbol}-${coinWorksWith}`);
    open(`https://cryptowat.ch/tr-tr/charts/${coinsData[coin].market.slug}:${coinSymbol}-${coinWorksWith}`)
});


init()

function coin(name, states) {
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
        }, time / 2)
    }
    // new scheduleCheck("secondly", 5000, this.name, this.price)
    // new scheduleCheck("biminutely", 1000 * 30, this.name)
    // new scheduleCheck("minutely", 1000 * 60, this.name)
    // new scheduleCheck("tenminutes", (1000 * 60) * 10, this.name)
    // new scheduleCheck("bihourly", (1000 * 60) * 30, this.name)
    // new scheduleCheck("hourly", (1000 * 60) * 60, this.name)
    //new scheduleCheck("secondly", 5000, this.name, this.price)
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


