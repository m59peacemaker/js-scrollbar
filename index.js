const noop = require('nop')
const easeInOutQuad = require('eases/quad-in-out')
const on = require('./lib/on')
const once = require('./lib/once')
const boundary = require('./lib/boundary')
const easeByDiff = require('./lib/ease-by-diff')
const getHeightPx = require('./lib/get-height-px')
const raf = window.requestAnimationFrame

// smooth .5ms per px, 100ms min, 400ms max
const calcSmoothMs = (totalPx, diffRatio) => boundary(100, 400, (totalPx * diffRatio) * 0.5)

const Drag = (element, { start = noop, end = noop, drag = noop }) => {
  return on(element, 'mousedown', e => {
    const dragOff = on(window, 'mousemove', drag)
    once(window, 'mouseup', e => {
      dragOff()
      return end(e)
    })
    return start(e)
  })
}

const Click = (element, { down = noop, up = noop }) => {
  return on(element, 'mousedown', e => {
    once(element, 'mouseup', up)
    return down(e)
  })
}

const makeBarDraggable = ({ node, onDrag }) => {
  let dragAnchor
  return Drag(node, {
    start: e => {
      dragAnchor = e.pageY - node.getBoundingClientRect().top
    },
    drag: e => {
      const distanceFromAnchorPx = e.pageY - node.getBoundingClientRect().top - dragAnchor
      onDrag(distanceFromAnchorPx)
      e.preventDefault()
    }
  })
}

const makeTrackClickable = ({ node, onClick, holding }) => {
  let mouseDown = false
  let event
  let timer
  return Drag(node, {
    start: (e) => {
      if (e.target !== node) { return }

      mouseDown = true
      event = e
      onClick(event.clientY - node.getBoundingClientRect().top)
      const render = () => raf(() => {
        if (mouseDown) {
          holding(event.clientY - node.getBoundingClientRect().top)
          render()
        }
      })
      timer = setTimeout(render, 300)
      e.preventDefault()
    },
    drag: e => event = e,
    end: () => {
      clearTimeout(timer)
      mouseDown = false
      event = undefined
      timer = undefined
    }
  })
}

const BarNode = () => {
  const node = document.createElement('div')
  node.style.position = 'relative'
  node.style.top = '0%'
  node.style.width = '100%'
  node.style.backgroundColor = '#BBBBBB'
  return node
}

const Bar = () => {
  const node = BarNode()

  const render = ({ y, height }) => {
    node.style.height = `${height * 100}%`
    node.style.top = `${y * 100}%`
  }

  return {
    node,
    render
  }
}

const TrackNode = () => {
  const node = document.createElement('div')
  node.tabIndex = 0
  node.style.outline = 'none'
  node.style.height = '100%'
  node.style.width = '15px'
  node.style.backgroundColor = '#EEEEED'
  node.style.display = 'inline-block'
  return node
}

const Track = () => ({ node: TrackNode() })

/* TODO: maybe it would be cool to entirely virtualize the scrollbar so that it has no DOM nodes
  just state and functions that control the state
  then the DOM node scrollbar can be derived from the virtual scroll bar
*/
const Scrollbar = ({ Emitter, initialState }) => {
  const scrollbar = Object.assign(Emitter(), {
    bar: Bar(),
    track: Track(),
    state: {
      scrolled: 0,
      visible: 0.2,
      barHeight: 0.2,
      minBarHeightPx: 17
    }
  })

  const refresh = state => {
    Object.assign(scrollbar.state, state)
    const { scrolled, visible, minBarHeightPx } = scrollbar.state

    const trackHeightPx = getHeightPx(scrollbar.track.node)
    const minBarHeight = minBarHeightPx / trackHeightPx
    const barHeight = visible < minBarHeight ? minBarHeight : visible
    const barHeightPx = trackHeightPx * barHeight
    const scrollablePx = trackHeightPx - barHeightPx
    const maxBarY = 1 - barHeight
    const barY = maxBarY * scrolled

    Object.assign(scrollbar.state, {
      barHeight,
      scrollablePx
    })
    scrollbar.bar.render({ height: barHeight, y: barY })
  }

  const harshlyScrollBy = (delta, { emit = false } = {}) => {
    const { scrolled } = scrollbar.state
    const newScrolled = boundary(0, 1, scrolled + delta)
    const ratioDiff = Math.abs(newScrolled - scrolled)
    if (ratioDiff !== 0) {
      refresh({ scrolled: newScrolled })
      scrollbar.emit('scroll', scrollbar)
    }
  }

  const scrollBy = (delta, { smooth = true, emit } = {}) => {
    if (smooth) {
      const ms = typeof smooth === 'number'
        ? smooth
        : calcSmoothMs(scrollbar.state.scrollablePx, delta)
      easeByDiff(easeInOutQuad, ms, diff => harshlyScrollBy(delta * diff), { emit })
    } else {
      harshlyScrollBy(delta, { emit })
    }
  }

  const scrollByPages = (pageCount, { leeway = true, emit } = {}) => {
    const pageSize = leeway
      ? (typeof leeway === 'number' ? 1 - leeway : 0.90)
      : 1
    scrollBy((scrollbar.state.visible * pageCount) * pageSize, { emit })
  }

  const scrollTo = (ratio, { smooth, emit } = {}) => {
    return scrollBy(ratio - scrollbar.state.scrolled, { smooth, emit })
  }

  const syncElement = element => {
    const maxScrollTop = element.scrollHeight - element.clientHeight
    element.scrollTop = maxScrollTop * scrollbar.state.scrolled
  }

  const syncToElement = element => {
    const maxScrollTop = element.scrollHeight - element.clientHeight
    scrollbar.refresh({
      scrolled: element.scrollTop / maxScrollTop,
      visible: element.clientHeight / element.scrollHeight
    })
  }

  scrollbar.track.node.appendChild(scrollbar.bar.node)
  refresh(initialState)

  makeBarDraggable({
    node: scrollbar.bar.node,
    onDrag: deltaPx => scrollBy(
      deltaPx / scrollbar.state.scrollablePx,
      { smooth: false, emit: true }
    )
  })

  // TODO: this is ugly and doesn't work quite right
  let direction
  makeTrackClickable({
    node: scrollbar.track.node,
    onClick: coordPx => {
      const coord = coordPx / scrollbar.state.scrollablePx
      const diff = coord - scrollbar.state.scrolled
      direction = diff < 0 ? -1 : 1
      scrollByPages(direction, { smooth: true, emit: false })
    },
    holding: coordPx => {
      const coord = coordPx / scrollbar.state.scrollablePx
      const diff = coord - scrollbar.state.scrolled
      const newDirection = diff < 0 ? -1 : 1
      if (direction === newDirection) {
        scrollByPages(direction, { leeway: 0.7, smooth: true, emit: false })
      }
    }
  })

  const ARROW_DELTA = 0.0028
  const ARROW_KEYS = {
    '38': () => scrollBy(-ARROW_DELTA, { smooth: true, emit: false }),
    '40': () => scrollBy(ARROW_DELTA, { smooth: true, emit: false }),
    '32': () => scrollByPages(1)
  }
  const addKeyControl = node => {
    return on(node, 'keydown', e => {
      const scrollFn = ARROW_KEYS[e.keyCode]
      if (scrollFn) {
        scrollFn()
        e.preventDefault()
      }
    })
  }

  return Object.assign(scrollbar, {
    refresh,
    scrollBy,
    scrollByPages,
    scrollTo,
    syncElement,
    syncToElement,
    addKeyControl
  })
}

module.exports = Scrollbar
