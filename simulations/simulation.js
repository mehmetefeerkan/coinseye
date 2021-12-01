async function simulation(simplate_, port_) {
    console.log(simplate_);
    console.log(port_);
    const axios = require('axios')
    const signale = require('signale')
    const express = require('express')
    const app = express()
    let port = port_
    var bodyParser = require('body-parser')
    app.use(bodyParser.json())
    var prompt = require('prompt-promise');
    const fs = require('fs')
    const chalk = require('chalk')
    let simplate = require(`./simplates/${simplate_}`)
    let sims = {}
    let simsDone = {}
    let actions = []
    let immediateSummary = {
        netBalance: 0,
        netGain: 0,
        gain: 0,
        reachedHereIn: process.uptime()
    }
    let summary = {
        loss: 0,
        netGain: 0,
        netBalance: 0,
        gain: 0,
        coinsLeft: 0,
        actions: actions,
        immediate: immediateSummary,
        reachedHereIn: process.uptime()
    }
    
    app.get('/sims', (req, res) => {
        res.send(sims)
    })
    app.get('/summary', (req, res) => {
        summary.reachedHereIn = process.uptime()
        summary.immediate = immediateSummary
        res.send(summary)
    })

    app.get('/', (req, res) => {
        res.send(200)
    })

    app.get('/actions', (req, res) => {

        res.send(actions)

    })

    app.get('/simsx', (req, res) => {
        let tsd = ""
        getRankedData("netProfit").forEach(element => {
            let cSim = element
            tsd = tsd + `${cSim.coin} - Entry : ${cSim.stake} | Current value : ${cSim.nowIsWorth} | Net Profit : ${cSim.netProfit} | Diff : ${cSim.currentDiff}<br>\n`
        });
        res.send(tsd)
    })
    app.get('/simsxx', (req, res) => {
        res.send(getRankedData("netProfit"))
    })

    axios.get("http://localhost:" + port)
        .then(res => {
            app.listen(port + 1)
        })
        .catch(err => {
            app.listen(port)
        })

    function getRankedData(place) {
        let tarr = []
        Object.keys(sims).forEach(element => {
            tarr.push(sims[element])
        });
        tarr.sort((a, b) => (a[place] > b[place]) ? -1 : 1)
        return tarr
    }

    function percDiff(partialValue, totalValue) {
        return Number((((100 * partialValue) / totalValue) - 100).toFixed(6));
    }
    // setInterval(() => {
    //     axios.get("http://localhost:1357/coins/list/breakthru")
    //     .then(res => {
    //         res.data.forEach(element => {
    //             new simulation(element, 100, -2.857142857142861, 20)
    //         }); 
    //     })
    //     .catch(err => {
    //         console.error(err); 
    //     })
    // }, 1000);

    let cobx = null
    let dataSource = require('./datasources/coinseyeProxy.js')
    setInterval(() => {
        cobx = dataSource.data()
        if (cobx !== null) {
            init()
        }
    }, 500);
    let once = false

    async function init() {
        if (simplate) {
            if (once) return;
            let aa = simplate
            let bb = await aa.fetchCoins()
            summary.netBalance = aa.settings.entryBudget
            immediateSummary.netBalance = aa.settings.entryBudget
            function getEntryBudget() {
                if (aa.settings.partitionize) {
                    return aa.settings.entryBudget / bb.length
                } else {
                    return aa.settings.entryBudget
                }
            }
            bb.forEach(element => {
                summary.coinsLeft++
                new simulation(element, getEntryBudget(), aa.settings.maxLossPercentage, aa.settings.targetProfitPercentage)
            });
            setInterval(() => {
                immediateSummary.netBalance = 0
                immediateSummary.netGain = 0
                immediateSummary.netLoss = 0
                Object.keys(sims).forEach(element => {
                    let ccoin = sims[element]
                    immediateSummary.netBalance = immediateSummary.netBalance + ccoin.nowIsWorth
                    immediateSummary.gain = immediateSummary.gain + ccoin.netProfit
                });
            }, 1000);
            once = true
        }
    }




    function simulation(coin, stake, maxLoss, minGain) {
        if (sims[coin] || simsDone[coin]) {
            return
        }
        signale.debug(`${coin} - Went in with ${stake} with max. loss percentage of ${maxLoss}`)
        signale.success(`We should be coming up with at least ${stake + ((stake / 100) * minGain)} or going home with ${stake - ((stake / 100) * maxLoss)}`)
        console.log();
        this.coin = coin
        this.stake = stake
        this.maxLoss = maxLoss
        this.boughtAmount = null
        this.boughtPrice = null
        this.currentDiff = 0
        this.nowIsWorth = 0
        this.netProfit = 0
        this.latestCoinPrice = 0
        this.minGain = minGain
        let coindata = null
        let mainth = setInterval(() => {
            //axios.get("http://localhost:1357/coins/get/" + this.coin)
            //.then(res => {
            coindata = cobx[this.coin]
            if(!coindata) return
            this.latestCoinPrice = coindata.price
            this.boughtAmount ? null : this.boughtAmount = Number(((this.stake / coindata.price)))
            this.boughtPrice ? null : this.boughtPrice = this.latestCoinPrice
            let currentDiff = (percDiff((this.boughtAmount * coindata.price), this.stake));
            this.currentDiff = currentDiff
            this.nowIsWorth = this.boughtAmount * coindata.price
            this.netProfit = this.nowIsWorth - this.stake
            summary.netGain = summary.gain - summary.loss
            if (currentDiff < -this.maxLoss) {
                // console.log(this.coin, "done goofed", this.boughtAmount * coindata.price);
                // console.log(this.coin, currentDiff, this.boughtAmount, coindata.price);
                summary.loss = summary.loss - this.netProfit
                actions.push(`Sold ${this.boughtAmount} of ${this.coin}, lost ${this.netProfit} since it was bought when it was ${this.boughtPrice}`)
                this.end()
            } else if (currentDiff >= this.minGain) {
                summary.gain = summary.gain + this.netProfit
                actions.push(`Sold ${this.boughtAmount} of ${this.coin}, profited ${this.netProfit} since it was bought when it was ${this.boughtPrice}`)
                this.end()
            }
            // })
            // .catch(err => {
            //     console.error(err); 
            // })
        }, 500);
        sims[this.coin] = this
        this.end = function () {
            summary.coinsLeft--
            delete sims[this.coin]
            simsDone[this.coin] = this
            clearInterval(mainth)
        }
    }

    function relDiff(a, b) {
        return 100 * Math.abs((a - b) / ((a + b) / 2));
    }
}

module.exports = {
    start: simulation
}