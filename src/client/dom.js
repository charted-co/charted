/* @flow */

// Simple wrappers around DOM API that keep Flow and us happy.

class Classlist {
  add(el: ?Element, name: string) {
    if (el) el.classList.add(name)
  }

  remove(el: ?Element, name: string) {
    if (el) el.classList.remove(name)
  }

  enable(el: ?Element, name: string, cond: bool) {
    cond ? this.add(el, name) : this.remove(el, name)
  }

  toggle(el: ?Element, name: string) {
    if (el) {
      el.classList.contains(name) ? this.remove(el, name) : this.add(el, name)
    }
  }
}

function assert(el: ?Element): Element {
  if (!el) throw 'Assertion error'
  return el
}

function remove(el: ?Element) {
  if (!el || !el.parentNode) return
  el.parentNode.removeChild(el)
}

function renderFragment(html: string): DocumentFragment {
  let fragment = document.createDocumentFragment()
  let temp = document.createElement('div')
  temp.innerHTML = html

  while (temp.firstChild) {
    fragment.appendChild(temp.removeChild(temp.firstChild))
  }

  return fragment
}

// Like querySelector and querySelectorAll but only for
// js classes. Eventually we shouldn't use any other way
// of getting elements.

function get(selector: string, root: ?Element): ?Element {
  root = root || document.body

  if (root && /^js\-/.test(selector)) {
    return root.querySelector('.' + selector)
  }

  return null
}

function getAll(selector: string, root: ?Element): Element[] {
  root = root || document.body

  if (root && /^js\-/.test(selector)) {
    return Array.prototype.slice.call(root.querySelectorAll('.' + selector))
  }

  return []
}

function queryAll(selector: string, root: ?Element): Element[] {
  root = root || document.body

  if (root) {
    return Array.prototype.slice.call(root.querySelectorAll(selector))
  }

  return []
}

function rect(el: Element): ClientRect {
  return el.getBoundingClientRect()
}

export default {
  assert: assert,
  get: get,
  getAll: getAll,
  queryAll: queryAll,
  rect: rect,
  renderFragment: renderFragment,
  remove: remove,
  classlist: new Classlist()
}
