const raf = window.requestAnimationFrame

// TODO: this may fail to account for easings that go beyond 1 and/or regress back below 1
const ease = (easingFn, ms, fn) => {
  const startTime = new Date().getTime()
  let progressRatio = 0
  const render = () => raf(() => {
    const currentTime = Math.min(ms, new Date().getTime() - startTime)
    progressRatio = easingFn(currentTime / ms)
    fn(progressRatio)
    if (progressRatio < 1) {
      render()
    }
  })
  render()
}

module.exports = ease
