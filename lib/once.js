const on = require('./on')

const once = (emitter, name, listener, options) => {
  const off = on(emitter, name, (...args) => {
    off()
    return listener(...args)
  }, options)
  return off
}

module.exports = once
