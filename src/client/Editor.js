/* @flow */

export default class Editor {
  rootElement: Element;
  listener: Function;

  constructor(el: Element) {
    this.rootElement = el
    this.listener = () => {}
    this.setContent(this.getContent())

    this.rootElement.addEventListener('focusout', () => {
      let content = this.getContent()

      this.setContent(content)
      this.listener(content)
    })
  }

  onChange(fn: Function) {
    this.listener = fn
  }

  getContent(): string {
    let content = this.rootElement.innerText
    return content ? content.trim() : ''
  }

  setContent(text: string): void {
    if (!text) {
      this.rootElement.innerHTML = ''
      this.rootElement.classList.add('empty')
      return
    }

    let sandbox = document.createElement('div')
    sandbox.innerHTML = text

    let sanitizedText = sandbox.innerText
    let sanitizedHTML = (sanitizedText || '')
      .split('\n')
      .map((line) => `<div>${line}</div>`)
      .join('')

    this.rootElement.innerHTML = sanitizedHTML
    this.rootElement.classList.remove('empty')
  }
}
