/* @flow */

type ListenerFunction = (el: Element, name: string, ev: Event) => void;
type Listeners = {[name: string]: ListenerFunction[]}

export default class Actions {
  rootElement: Element;
  listeners: Listeners;
  boundListener: Function;

  constructor(el: Element) {
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
