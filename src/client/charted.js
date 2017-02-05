/* @flow */

import {PageController} from "./PageController"

$(function () {
  window.__charted = new PageController()
  window.__charted.activate()
})
