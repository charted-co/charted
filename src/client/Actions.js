/* @flow */

type ListenerFunction = (el: Element, name: string, ev: Event) => void;
type Listeners = {[name: string]: ListenerFunction[]}

export default class Actions {
  rootElement: Element;
  listeners: Listeners;

  constructor(el: Element) {
    this.rootElement = el
    this.listeners = {}
  }

  activate() {
    this.rootElement.addEventListener('click', this.handleClick.bind(this))
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

    let root = this.rootElement.parentNode
    while (target && target != root && target != document) {
      if (target instanceof HTMLElement) {
        let name = target.getAttribute('data-click')
        if (name) {
          this.fire(name, target, ev)
          return
        }
      }

      target = target.parentNode
    }
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
