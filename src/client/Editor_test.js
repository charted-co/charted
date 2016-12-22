import Editor from "./Editor"

export function testEditor(test) {
  // We need to append this sandbox to the DOM because
  // otherwise innerText omits newlines.
  let sandbox = document.createElement('div')
  document.body.appendChild(sandbox)

  let editor = new Editor(sandbox)
  test.equal('', editor.getContent())
  test.ok(editor.rootElement.classList.contains('empty'))

  editor.setContent('Hello\nWorld')
  test.equal('Hello\nWorld', editor.getContent())
  test.ok(!editor.rootElement.classList.contains('empty'))

  sandbox.innerHTML = 'Hello<div>World</div>'
  test.equal('Hello\nWorld', editor.getContent())
  test.ok(!editor.rootElement.classList.contains('empty'))

  document.body.removeChild(sandbox)
  test.done()
}

