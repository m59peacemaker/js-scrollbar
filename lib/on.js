const on = (emitter, name, listener, options) => {
  const { on, off } = typeof emitter.addEventListener === 'function'
    ? { on: 'addEventListener', off: 'removeEventListener' }
    : { on: 'on', off: 'removeListener' }
  emitter[on](name, listener, options)
  return () => emitter[off](name, listener)
}

module.exports = on
