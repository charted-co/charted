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
}

function remove(el: ?Element) {
  if (!el || !el.parentNode) return
  el.parentNode.removeChild(el)
}

// Like querySelector and querySelectorAll but only for
// js classes. Eventually we shouldn't use any other way
// of getting elements.

function get(selector: string, root: ?Element): ?Element {
  root = root || document.body

  if (/^js\-/.test(selector)) {
    return root.querySelector('.' + selector)
  }

  return null
}

function getAll(selector: string, root: ?Element): Element[] {
  root = root || document.body

  if (/^js\-/.test(selector)) {
    return Array.prototype.slice.call(root.querySelectorAll('.' + selector))
  }

  return []
}

export default {
  get: get,
  getAll: getAll,
  remove: remove,
  classlist: new Classlist()
}
