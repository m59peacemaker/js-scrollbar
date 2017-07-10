const getHeightPx = node => {
  return node.scrollHeight || Number(window.getComputedStyle(node).height.replace(/px$/, ''))
}

module.exports = getHeightPx
