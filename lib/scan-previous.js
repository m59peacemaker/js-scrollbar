const scanPrevious = (fn, prev) => {
  return (arg) => {
    fn(prev, arg)
    prev = arg
  }
}

module.exports = scanPrevious
