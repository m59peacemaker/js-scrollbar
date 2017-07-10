const progressToDiff = require('./progress-to-diff')
const ease = require('./ease')

const easeByDiff = (easingFn, ms, fn) => ease(easingFn, ms, progressToDiff(fn))

module.exports = easeByDiff
