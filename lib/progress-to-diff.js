const scanPrevious = require('./scan-previous')

const progressToDiff = fn => scanPrevious((prev, curr) => fn(curr - prev), 0)

module.exports = progressToDiff
