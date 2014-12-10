/*global $, PageController */

$(function () {
  var $dataInput = $('.data-file-input')
  var pageController = new PageController()

  $('.load-data-form').submit(function (e) {
    e.preventDefault()

    if($dataInput.val()) {
      pageController.setupPage({dataUrl: $dataInput.val()})
    } else {
      var emptyInputError = new Error('You’ll need to paste in the URL to a .csv file or Google Spreadsheet first.')
      pageController.errorNotify(emptyInputError)
    }
  })

  // parse the url on page load and every state change
  pageController.useUrl()
  $(window).on('popstate', pageController.useUrl.bind(pageController))
})
