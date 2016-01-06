var CHARTED

(function () {
  if (CHARTED) {
    return
  }

  if (!window.postMessage || !window.addEventListener) {
    return 
  }

  CHARTED = {}
  CHARTED.onMessage = function (ev) {
    var message = ev.data.split(':')
    var iframe = document.getElementById('charted:' + message[0])
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

  window.addEventListener('message', CHARTED.onMessage)
}())


/*                                                   *\

      (here's a little poem I wrote a while back)

      oh, right
      ---------

      it’s early evening
      i’m sitting at my desk
      spending hours i will never get back
      staring at the screen
      trying
      to figure out what’s wrong

      oh, right
      offset += offset + sentence.length

\*                                                   */