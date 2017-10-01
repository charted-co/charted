/* @flow */

type ListenerFunction = (el: Element, name: string, ev: Event) => void;
type Listeners = {[name: string]: ListenerFunction[]}

export default class Actions {
  rootElement: Element;
  listeners: Listeners;
  boundListener: Function;

  constructor(el: ?Element) {
    if (!el) {
      throw new Error('root element is not initialized yet')
    }

    this.rootElement = el
    this.listeners = {}
  }

  activate() {
    this.boundListener = this.handleClick.bind(this)
    this.rootElement.addEventListener('click', this.boundListener)
  }

  deactivate() {
    if (this.boundListener) {
      this.rootElement.removeEventListener('click', this.boundListener)
    }

    delete this.boundListener
    delete this.rootElement
    this.listeners = {}
  }

  add<T>(name: string, listener: ListenerFunction, thisObj: T): Actions {
    if (!this.listeners[name]) {
      this.listeners[name] = []
    }

    this.listeners[name].push(listener.bind(thisObj))
    return this
  }

  handleClick(ev: Event) {
    let target = ev.target

    if (!(target instanceof Element)) {
      return
    }

    if (target instanceof HTMLElement) {
      if (target.nodeName == 'BUTTON' && target.getAttribute('type') == 'submit') {
        return
      }
    }

    let root = this.rootElement.parentNode
    while (target && target != root && target != document) {
      if (target instanceof HTMLElement) {
        let name = target.getAttribute('data-click')

        // If the element doesn't have a data-click property but is something
        // you'd want to click on (like a text field), return without firing.
        if (this.isClickable(target) && !name) {
          return
        }

        if (name) {
          this.fire(name, target, ev)
          return
        }
      }

      target = target.parentNode
    }
  }

  isClickable(el: HTMLElement) {
    switch (el.nodeName) {
      case 'A':
      case 'BUTTON':
      case 'INPUT':
      case 'TEXTAREA':
        return true
      default:
        if (el.getAttribute('contenteditable')) {
          return true
        }
    }

    return false
  }

  fire(name: string, target: Element, ev: Event) {
    if (!this.listeners[name]) {
      return
    }

    this.listeners[name].forEach((fn: ListenerFunction) => {
      fn(target, name, ev)
    })

    ev.stopPropagation()
    ev.preventDefault()
  }
}
