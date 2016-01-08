/* @flow */

import {PageController} from "./PageController"

$(function () {
  var pageController = new PageController()
  pageController.useUrl()

  $(window).on('popstate', function (ev) {
    // Safari and some earlier versions of Chrome fire 'popstate' on
    // page load so here we make sure that it was actually us who
    // initiated the state change.
    if (ev && ev.state && ev.state.isChartUpdate) {
      pageController.useUrl()
    }
  })
})
