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

      // Use the standardized version of postMessage iframe.resize.
      var data
      try {
        data = JSON.parse(ev.data)
      } catch (e) {
        return
      }

      if (data.context !== 'iframe.resize') {
        return
      }

      var iframe = document.querySelector('#charted-' + data.chartId)

      if (!iframe) {
        return
      }

      iframe.style.transition = 'height 200ms'
      iframe.style.MozTransition = 'height 200ms'
      iframe.style.WebkitTransition = 'height 200ms'
      iframe.style.height = data.height + 'px'
    }
  }

  CHARTED.createIframes()
  if (window.postMessage && window.addEventListener) {
    window.addEventListener('message', CHARTED.onMessage)
  }
}())
