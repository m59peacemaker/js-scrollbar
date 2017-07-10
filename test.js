const Emitter = require('nanobus')
const _Scrollbar = require('./')
const Scrollbar = (initialState) => _Scrollbar({ initialState, Emitter })
const ensureArray = v => Array.isArray(v) ? v : [ v ]
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

document.body.style.padding = 0
document.body.style.margin = 0

const test = (title, fn) => {
  fn(children => {
    const div = document.createElement('div')
    div.style.display = 'inline-block'
    div.style.verticalAlign = 'top'
    div.style.margin = '10px'
    div.style.padding = '10px'
    div.style.border = '2px solid #777'
    const p = document.createElement('p')
    p.style.margin = 0
    p.textContent = title
    div.appendChild(p)
    ensureArray(children).forEach(child => div.appendChild(child))
    document.body.appendChild(div)
    return div
  })
}

test('has a track and a bar that is smaller than track', t => {
  const scrollbar = Scrollbar()
  scrollbar.track.node.style.height = '150px'
  t(scrollbar.track.node)
  scrollbar.refresh({ visible: 500 / 2500 })
})

const calcRatioScrolled = ({ clientHeight, scrollHeight, scrollTop }) => {
  const maxScrollTop = scrollHeight - clientHeight
  return scrollTop / scrollHeight
}

test('bar accords with ratioSrolled: 1 (all the way)', t => {
  const scrollbar = Scrollbar()
  scrollbar.track.node.style.height = '150px'
  t(scrollbar.track.node)
  scrollbar.refresh({ visible: 500 / 2500, scrolled: 1 })
})

test('bar accords with ratioSrolled: 0.5 (halfway)', t => {
  const scrollbar = Scrollbar()
  scrollbar.track.node.style.height = '150px'
  t(scrollbar.track.node)
  scrollbar.refresh({ visible: 500 / 2500, scrolled: 0.5 })
})

test('bar accounts for its minHeight, scrolled: 1', t => {
  const scrollbar = Scrollbar()
  scrollbar.track.node.style.height = '50px'
  scrollbar.bar.node.style.minHeight = '15px'
  t(scrollbar.track.node)
  scrollbar.refresh({ visible: 10 / 25000, scrolled: 1 })
})

test('track is too small, needs 120px (1px per move, 20px minHeight) but has 10px', t => {
  const scrollbar = Scrollbar()
  scrollbar.track.node.style.height = '10px'
  scrollbar.bar.node.style.minHeight = '20px'
  t(scrollbar.track.node)
  scrollbar.refresh({ visible: 100 / 10000, scrolled: 0.5 })
})

test('emits "scroll" event with { delta, state }', t => {
  const scrollbar = Scrollbar()
  scrollbar.track.node.style.height = '150px'
  const log = document.createElement('p')
  log.textContent = ''
  t([
    scrollbar.track.node,
    log
  ])
  scrollbar.refresh({ visible: 500 / 2500, scrolled: 0 })
  scrollbar.on('scroll', ({ delta, state }) => {
    log.textContent = [
      `delta: ${delta}`,
      `state: ${JSON.stringify(state)}`
    ].join('\n')
  })
})

test('dragging scrolls up and down and feels nice and like a scrollbar', t => {
  const scrollbar = Scrollbar()
  scrollbar.track.node.style.height = '150px'
  t(scrollbar.track.node)
  scrollbar.refresh({ visible: 500 / 2500, scrolled: 0.5 })
})

test('is pretty much like the native scrollbar in Chrome', t => {
  const scrollbar = Scrollbar()
  const content = document.createElement('pre')
  content.textContent = new Array(1000).fill(1).reduce((acc, _, idx) => `${acc}${idx}\n`, '')
  scrollbar.track.node.style.height = '366px'
  scrollbar.track.node.style.marginTop = '17px'
  scrollbar.track.node.style.display = 'inline-block'
  scrollbar.track.node.style.verticalAlign = 'top'
  content.style.display = 'inline-block'
  content.style.margin = '0'
  content.style.height = '400px'
  content.style.overflowY = 'scroll'
  t([
    content,
    scrollbar.track.node
  ])

  const Foo = initialValue => {
    let lastValue = initialValue
    return function (fn) {
      lastValue = fn(lastValue)
      return lastValue
    }
  }

  const foo = Foo(content.scrollTop)

  let lastScrollTop = content.scrollTop
  let timer
  content.addEventListener('scroll', e => {
    if (content.scrollTop === lastScrollTop) { return }
    scrollbar.syncToElement(content)
    lastScrollTop = content.scrollTop
  })
  scrollbar.on('scroll', () => {
    scrollbar.syncElement(content)
    lastScrollTop = content.scrollTop
  })
  scrollbar.syncToElement(content)
})
