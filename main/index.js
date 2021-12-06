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
const chalk = require('chalk')
const prompt = require('prompt-promise')
const notifier = require('node-notifier');
var settings = {}
let schUpdatesCache = 0
let schUpdatesIops = 0
let settingsRaster = require('./config/raster.json')
let settingsRasterKeys = Object.keys(settingsRaster)
let schUpdates = 0
setInterval(() => {
    schUpdatesIops = (schUpdates - schUpdatesCache)
    schUpdatesCache = schUpdates
}, 1000);
let myPromise = new Promise(function (myResolve, myReject) {
    // "Producing Code" (May take some time)
    setTimeout(() => {
        myResolve(); // when successful
    }, 1000);
});


async function preinit() {
    prompt(`${chalk.bgRed("Use presets?")}`)
        .then(function (val) {
            let availablePresets_ = fs.readdirSync("./presets")
            let availablePresets = ""

            for (let ind = 0; ind < availablePresets_.length; ind++) {
                availablePresets = availablePresets + `${chalk.red(ind)} - ${availablePresets_[ind]}\n`
            }
            if ((val === "true" || val === "false" || val === "y" || val === "n")) {
                if (val === "true" || val === "y") {
                    prompt(availablePresets + `${chalk.blue("^ - Choose a preset : ")}`)
                        .then(function (valx) {
                            if (availablePresets_[parseInt(valx)]) {
                                settings = require(`./presets/${availablePresets_[parseInt(valx)]}`)
                                init()
                            } else {
                                throw new Error("Preset not found! Index out of array bounds? :3")
                            }
                        })
                        .then(function () {
                            prompt.finish();
                        })
                        .catch(function rejected(err) {
                            console.error(chalk.redBright(err));
                            preinit()
                        });
                    //use presets
                } else {
                    prompt_(settingsRasterKeys[0], 0);
                }
            }
        })
        .catch(function rejected(err) {
            console.error(chalk.redBright(err));
            preinit()
        });
}
preinit()

async function prompt_(settingArea, settingIndex) {
    let cSetting = settingsRaster[settingArea]
    prompt(`${chalk.redBright(cSetting.question)}`)
        .then(async function (val) {
            if (cSetting.type === "int" && !isNaN(parseInt(val))) {
                settings[settingArea] = parseInt(val)
                console.log(settings);
            } else if (cSetting.type === "bool" && (val === "true" || val === "false" || val === "y" || val === "n")) {
                (val === "true" || val === "y") ? settings[settingArea] = true : settings[settingArea] = false
                console.log(settings);
            } else {
                throw new Error("Unknown input.")
            }
        })
        .then(function pasword(val) {
            prompt.finish();
            if (settingIndex < settingsRasterKeys.length - 1) {
                prompt_(settingsRasterKeys[settingIndex + 1], settingIndex + 1)
            } else {
                init()
            }
        })
        .catch(function rejected(err) {
            console.error(chalk.redBright(err));
            prompt_(settingsRasterKeys[settingIndex], settingIndex)
        });
}

let upScoreBreakThrough = []
let upScoreBreakThroughDetailed = []

app.use(require('cors')())
// String

app.use(function (req, res, next) {
    if (!init) {
        res.send(502, { error: "SERVICE_IS_BOOTING" })
    } else {
        next()
    }
})
app.get('/coins', (req, res) => {
    res.send(coins)
})
app.get('/stats', (req, res) => {
    res.send({
        updatesPerSecond: schUpdates / process.uptime(),
        updatesInOneSecond: schUpdatesIops,
        allUpdates: schUpdates,
    })
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

app.get('/coins/breakthru/', (req, res) => {
    res.send(upScoreBreakThrough)
})
app.get('/coins/breakthru/detailed', (req, res) => {
    res.send(upScoreBreakThroughDetailed)
})
app.get('/coins/increaseNet/breakthru/', (req, res) => {
    res.send(increaseNetBreakThrough)
})
app.get('/coins/increaseNet/breakthru/detailed', (req, res) => {
    res.send(increaseNetBreakThroughDetailed)
})
app.get('/coins/list/upscore', (req, res) => {
    res.send(getRankedData("upScoreGlobal", false))
})
app.get('/coins/listtop/upscore/:top', (req, res) => {
    res.send(getRankedData("upScoreGlobal", false).slice(0, parseInt(req.params.top)))
})
app.get('/coins/listtop/increaseNet/:top', (req, res) => {
    res.send(getRankedData("increaseNet", false).slice(0, parseInt(req.params.top)))
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
app.get('/coins/listtop/increaseNet/absolute/:top', (req, res) => {
    res.send(getRankedData("increaseNet", true).slice(0, parseInt(req.params.top)))
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
app.get('/coins/list/increaseNet/', (req, res) => {
    res.send(getRankedData("increaseNet", false))
})
app.get('/coins/list/increaseNet/absolute', (req, res) => {
    res.send(getRankedData("increaseNet", true))
})
app.get('/coins/get/:cname', (req, res) => {
    res.send(coins[req.params.cname])
})
app.get('/settings/set/mobilepush/:state', (req, res) => {
    req.params.state === "true" ? settings.mobilePush = true : settings.mobilePush = false
    res.send(settings)
})
app.get('/settings/set/systempush/:state', (req, res) => {
    req.params.state === "true" ? settings.systemPush = true : settings.systemPush = false
    res.send(settings)
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
    }, settings.wsInterval);
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
    }, settings.wsInterval);
});
app.ws('/coins/list/breakthru/', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(upScoreBreakThrough))
    }, settings.wsInterval);
})
app.ws('/coins/list/breakthru/detailed', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(upScoreBreakThroughDetailed))
    }, settings.wsInterval);
})
app.ws('/coins/list/upscore', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("upScoreGlobal", false)))
    }, settings.wsInterval);
})
app.ws('/coins/list/upscore/reset', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(setCoinData("upScoreGlobal", 0)))
    }, settings.wsInterval);
})
app.ws('/coins/list/upscore/absolute', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("upScoreGlobal", true)))
    }, settings.wsInterval);
})
app.ws('/coins/list/price/', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("price", false)))
    }, settings.wsInterval);
})
app.ws('/coins/list/price/absolute', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("price", true)))
    }, settings.wsInterval);
})
app.ws('/coins/list/increaseAverage/', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("increaseAverage", false)))
    }, settings.wsInterval);
})
app.ws('/coins/list/increaseAverage/absolute', function (ws, req) {
    setInterval(() => {
        ws.send(JSON.stringify(getRankedData("increaseAverage", true)))
    }, settings.wsInterval);
})



let coinsData = {}
let coins = {}
let topIncrNet = []
let topUpScore = []

async function init() {
    app.listen(settings.port)
    console.log(chalk.greenBright(`Server started listening on ${settings.port}`));
    let data_ = fs.readFileSync('./databases/database.json', 'utf8');
    console.log(chalk.greenBright("Loaded database."));

    // parse JSON string to JSON object
    data_ = JSON.parse(data_ || JSON.stringify({}));
    Object.keys(data_).forEach(element => {
        new coin(data_[element])
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
                            new coin(element)
                        }
                    });
                }
            }, currentMarket.refresh);
        }
    });
    console.log(chalk.greenBright("Loaded markets."));
    setInterval(() => {
        fs.writeFile('./databases/database.json', JSON.stringify(coins), 'utf8', (err) => {

            if (err) {
                console.error(`Error writing file: ${err}`);
            } else {
                console. log(`File is written successfully!`);
            }

        });
    }, settings.dbSaveInterval);

    setInterval(() => {
        function usbt() {
            let toNames = []
            getRankedData("upScoreGlobal", true).slice(0, 10).forEach(element => {
                toNames.push(element.name)
            });
            let diff = toNames.filter(x => topUpScore.indexOf(x) === -1)
            let diff2 = topUpScore.filter(x => toNames.indexOf(x) === -1)
            upScoreBreakThrough = []
            diff.forEach(element => {
                topUpScore.length < 8 ? doNothing() : notifyBreakthrough(element)
                upScoreBreakThrough.push(element)
            });
            topUpScore = []
            getRankedData("upScoreGlobal", true).slice(0, 10).forEach(element => {
                topUpScore.push(element.name)
            });
        }
        function incrnetbt() {
            let toNames = []
            getRankedData("increaseNet", true).slice(0, 10).forEach(element => {
                toNames.push(element.name)
            });
            let diff = toNames.filter(x => topIncrNet.indexOf(x) === -1)
            let diff2 = topIncrNet.filter(x => toNames.indexOf(x) === -1)
            increaseNetBreakThrough = []
            diff.forEach(element => {
                topIncrNet.length < 8 ? doNothing() : notifyBreakthrough(element)
                increaseNetBreakThrough.push(element)
            });
            topIncrNet = []
            getRankedData("increaseNet", true).slice(0, 10).forEach(element => {
                topIncrNet.push(element.name)
            });
        }
        usbt()
        incrnetbt()
    }, /*settings.breakthroughInterval*/ 15000);
    init = true
    console.log(chalk.greenBright("Fully initiated."));
}


function notifyBreakthrough(coinName) {
    if (coinsData[coinName]) {
        let coinWorksWith = (coinsData[coinName].worksWith);
        let coinSymbol = (require(`./markets/${coinsData[coinName].market.module}`).sanitizeSymbolToTokenName(coinName));
        upScoreBreakThroughDetailed.push(`${coinSymbol}-${coinWorksWith}`)
        if (settings.systemPush) {
            notifier.notify(
                {
                    title: 'A coin just reached upScore top 10',
                    message: `${coinName} is now in the top 10`,
                    sound: false, // Only Notification Center or Windows Toasters
                    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1.png'
                },
                function (err, response, metadata) {
                    // Response is response from notification
                    // Metadata contains activationType, activationAt, deliveredAt
                }
            );
        }
        if (settings.mobilePush) {
            var options = {
                method: 'POST',
                url: 'https://notify.run/uNrbu4wt7YmXoajFopwL',
                data: `${coinName} is now in the upScore top 10 ranking.`,
            };

            axios.request(options).then(function (response) {
                //console.log(response.data);
            }).catch(function (error) {
                console.error(error);
            });
        }
    }
}

notifier.on('click', function (notifierObject, options, event) {
    let coin = (options.m).split(" ")[0]
    console.log("our coin is: ", coin);
    let coinWorksWith = (coinsData[coin].worksWith);
    let coinSymbol = (require(`./markets/${coinsData[coin].market.module}`).sanitizeSymbolToTokenName(coin));
    upScoreBreakThroughDetailed.push(`${coinSymbol}-${coinWorksWith}`)
    open(`https://cryptowat.ch/tr-tr/charts/${coinsData[coin].market.slug}:${coinSymbol}-${coinWorksWith}`)
});


// init()

function coin(incoin) {
    let name = incoin.symbol
    let states = incoin.states
    function state() {
        this.increase = {
            true: false,
            instances: 0,
            by: {
                amount: 0,
                relDiff: 0,
                percDiff: 0
            }
        },
            this.decrease = {
                true: false,
                tolerated: true,
                tolerations: 0,
                instances: 0,
                by: {
                    amount: 0,
                    relDiff: 0,
                    percDiff: 0
                }
            }
        this.reference = 0
    }
    this.states = states || {}
    this.name = name
    this.price = null
    this.upScoreGlobal = 0
    this.increaseAverage = 0
    this.increaseNet = 0
    this.decreaseAverage = 0
    this.updatePrice = function (newPrice, schedulation) {
        this.data = coinsData[this.name]
        if (newPrice === 0) return

        if (!this.states[schedulation]) { this.states[schedulation] = new state() }
        this.states[schedulation].reference = parseFloat(this.states[schedulation].reference)
        newPrice = parseFloat(newPrice)
        this.states[schedulation].was = this.states[schedulation].reference
        if (this.states[schedulation].reference < newPrice) { // if coin price is smaller than new price
            this.states[schedulation].increase.true ? doNothing() : this.states[schedulation].increase.since = Date.now() //if the price is not increasing, mark now as start of incr.
            this.states[schedulation].increase.true = true //increase is true
            this.states[schedulation].increase.instances++ //add onther point for increasement*
            this.states[schedulation].increase.by.amount = newPrice - this.states[schedulation].reference //increased by the new price minus this schedulation's reference price
            this.states[schedulation].increase.by.relDiff = relDiff(newPrice, this.states[schedulation].reference) //relative difference between old price and new price
            this.states[schedulation].increase.by.percDiff = percDiff(newPrice, this.states[schedulation].reference) //percDiff difference between old price and new price
            this.upScoreGlobal++
            this.states[schedulation].decrease.since = 0 //decrease timemark reset
            this.states[schedulation].decrease.true = false //not decreasing right now
            this.states[schedulation].decrease.tolerated = false //decrease not tolerated since its not decreasing
            this.states[schedulation].decrease.by.amount = 0 //decrease amount reset
            this.states[schedulation].decrease.by.relDiff = 0 //decrease relDiff reset
            this.states[schedulation].decrease.by.percDiff = 0 //decrease relDiff reset

        } else if (this.states[schedulation].reference > newPrice) {
            this.states[schedulation].decrease.true ? doNothing() : this.states[schedulation].decrease.since = Date.now() //if the price is not increasing, mark now as start of incr.
            this.states[schedulation].decrease.true = true //decrease is true
            this.states[schedulation].decrease.instances++ //add onther point for decreasement*
            this.states[schedulation].decrease.by.amount = newPrice - this.states[schedulation].reference //decreased by the new price minus this schedulation's reference price
            this.states[schedulation].decrease.by.relDiff = relDiff(newPrice, this.states[schedulation].reference) //relative difference between old price and new price
            this.states[schedulation].decrease.by.percDiff = percDiff(newPrice, this.states[schedulation].reference) //percDiff difference between old price and new price
            this.upScoreGlobal--
            this.states[schedulation].increase.since = 0 //increase timemark reset
            this.states[schedulation].increase.true = false //not decreasing right now
            this.states[schedulation].increase.tolerated = false //increase not tolerated since its not decreasing
            this.states[schedulation].increase.by.amount = 0 //increase amount reset
            this.states[schedulation].increase.by.relDiff = 0 //increase relDiff reset
            this.states[schedulation].increase.by.percDiff = 0 //increase relDiff reset

            /*
            this.states[schedulation].decrease.true ? doNothing() : this.states[schedulation].decrease.since = Date.now()
            this.states[schedulation].decrease.true = true
            this.states[schedulation].decrease.instances++
            this.states[schedulation].decrease.by.amount = this.states[schedulation].reference - newPrice
            this.states[schedulation].decrease.by.relDiff = relDiff(newPrice, this.states[schedulation].reference)

            if (this.states[schedulation].decrease.by.relDiff < decreaseTolerance) {
                this.states[schedulation].decrease.tolerations++
                this.states[schedulation].decrease.tolerated = true
            } else {
                this.states[schedulation].increase.true ? this.states[schedulation].increase.since = 0 : doNothing()
            }

            this.states[schedulation].increase.true = false
            this.states[schedulation].increase.by.amount = 0
            this.states[schedulation].increase.by.relDiff = 0*/

        }
        this.states[schedulation].reference = newPrice
        let allIncreases = 0
        let allDecreases = 0
        Object.keys(this.states).forEach(currentSchedulation => {
            if (currentSchedulation) {
                this.states[currentSchedulation].increase.net = this.states[currentSchedulation].increase.instances - this.states[currentSchedulation].decrease.instances
                allIncreases = allIncreases + this.states[currentSchedulation].increase.instances
                allDecreases = allDecreases + this.states[currentSchedulation].decrease.instances
            }
        });
        allIncreases = allIncreases / Object.keys(this.states).length
        allDecreases = allDecreases / Object.keys(this.states).length
        this.increaseAverage = allIncreases
        this.decreaseAverage = allDecreases
        this.increaseNet = allIncreases - allDecreases
        this.price = parseFloat(coinsData[this.name].price)
    }
    setInterval(() => {
        if (coinsData[this.name]) {
            this.price = coinsData[this.name].price
        }
    }, settings.reflectionInterval);
    coins[this.name] = this
    function scheduleCheck(type, time, coinName) {
        setInterval(() => {
            schUpdates++
            coins[coinName].updatePrice(getCoinPrice(coinName), type)
        }, time / 2)
    }

    new scheduleCheck("secondly", 1000, this.name)
    new scheduleCheck("fiveSecondly", 5000, this.name)
    new scheduleCheck("tenSecondly", 10000, this.name)
    new scheduleCheck("twentySecondly", 20000, this.name)
    new scheduleCheck("biminutely", 1000 * 30, this.name)
    new scheduleCheck("minutely", 1000 * 60, this.name)
    new scheduleCheck("fiveMinutely", 1000 * 60 * 5, this.name)
    new scheduleCheck("tenminutes", (1000 * 60) * 10, this.name)
    new scheduleCheck("bihourly", (1000 * 60) * 30, this.name)
    new scheduleCheck("hourly", (1000 * 60) * 60, this.name)
}


function percDiff(partialValue, totalValue) {
    return Number((((100 * partialValue) / totalValue) - 100).toFixed(6));
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


