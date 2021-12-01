const axios = require('axios')
let hi = null
setInterval(() => {
    axios.get("http://localhost:1357/coins/")
    .then(res => {
        hi = res.data
    })
    .catch(err => {
        console.error(err);
    })
}, 500);

module.exports = {
    data: function () {return hi}
}
