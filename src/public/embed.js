var CHARTED

(function () {
  if (CHARTED && CHARTED.createIframes && CHARTED.onMessage) {
    CHARTED.createIframes()
    return
  }

  CHARTED = {
    createIframes: function () {
      var scripts = document.getElementsByTagName('script')
      var i, chartId, iframe, link

      for (var i = 0; i < scripts.length; i++) {
        script = scripts[i]

        if (script.getAttribute('data-charted-processed')) {
          continue
        }

        chartId = script.getAttribute('data-charted')
        if (!chartId) {
          continue
        }

        iframe = document.createElement('iframe')
        iframe.setAttribute('id', 'charted-' + chartId)
        iframe.setAttribute('height', '600px')
        iframe.setAttribute('width', '100%')
        iframe.setAttribute('scrolling', 'yes')
        iframe.style.border = 'solid 1px #ccc'

        link = document.createElement('a')
        link.setAttribute('href', script.getAttribute('src'))
        iframe.setAttribute('src', link.origin + '/embed/' + chartId)

        script.parentNode.insertBefore(iframe, script.nextSibling)
        script.setAttribute('data-charted-processed', 'yes')
      }
    },

    onMessage: function (ev) {
      var message = ev.data.split(':')
      var iframe = document.getElementById('charted-' + message[0])
      var link = document.createElement('a')
      link.setAttribute('href', iframe.getAttribute('src'))

      if (ev.origin !== link.origin) {
        return
      }

      iframe.style.transition = 'height 200ms'
      iframe.style.MozTransition = 'height 200ms'
      iframe.style.WebkitTransition = 'height 200ms'
      iframe.style.height = message[1] + 'px'
    }
  }

  CHARTED.createIframes()
  if (window.postMessage && window.addEventListener) {
    window.addEventListener('message', CHARTED.onMessage)
  }
}())
