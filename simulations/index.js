var prompt = require('prompt-promise');
const fs = require('fs')
let simulation = require('./simulation.js')
const chalk = require('chalk')
// x.simulation('top10upscore.js', 5151)
// x.simulation('top10incrAvg.js', 5152)

const express = require('express')
const app = express()
let port = 51
var bodyParser = require('body-parser')
app.use(bodyParser.json())

app.get('/sims', (req, res) => {
    res.send(simulations)
})
app.get('/simsdata', async (req, res) => {
    let all = ""
    for (let index = 0; index < Object.keys(simulations).length; index++) {
        const element = Object.keys(simulations)[index];
        let csim = simulations[element]
        all = all + `-----------------${element}-----------------`
        await axios.get("http://localhost:" + csim.port + "/simsx")
            .then(res => {
                all = all + `<br>${res.data}<br>`
                console.log(all);
                return
            })
            .catch(err => {
                console.error(err);
            })
    }
    res.send(all)
})

app.listen(port)
let simulations = {}

function simStart(ds, port) {
    simulations[ds] = {
        started: Date.now(),
        port: port,
        simplate: ds,
        summary: null
    }
    simulation.start(ds, port)
}

let availableSimplates = ""
let availableSimplates_ = fs.readdirSync("./simplates")

for (let ind = 0; ind < availableSimplates_.length; ind++) {
    availableSimplates = availableSimplates + `${chalk.red(ind)} - ${availableSimplates_[ind]}\n`
}
const getPort = require('get-port');
const { default: axios } = require('axios');
prompt_()
function prompt_() {
    prompt(availableSimplates + `${chalk.blue("^ - Choose a simplate : ")}`)
        .then(async function username(val) {
            if (val.includes(",")) {
                val.split(",").forEach(async (element) => {
                    simStart(availableSimplates_[parseInt(element)], await getPort());
                });
            } else {
                if (!isNaN(val)) {
                    let selectedSimplate = availableSimplates_[parseInt(val)]
                    if (selectedSimplate) {
                        simStart(selectedSimplate, await getPort())
                    } else {
                        throw new Error("Simplate not found! Index out of array bounds? :3")
                    }
                } else {
                    throw new Error("Invalid Input!")
                }
            }

        })
        .then(function pasword(val) {
            prompt.finish();
        })
        .catch(function rejected(err) {
            console.error(chalk.redBright(err));
            prompt_()
        });
}

setInterval(() => {
    Object.keys(simulations).forEach(element => {
        let csimport = simulations[element].port
        axios.get("http://localhost:" + csimport + "/summary")
            .then(res => {
                simulations[element].summary = res.data
            })
            .catch(err => {
                console.error(err);
            })
    });
}, 550);