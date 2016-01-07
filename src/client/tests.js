import * as tests_PageData from "./PageData_test"
import * as tests_ChartParameters from "../shared/ChartParameters_test"

nodeunit.run({
  'PageData': tests_PageData,
  'ChartParameters': tests_ChartParameters
})
