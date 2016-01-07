import * as tests_PageData from "./PageData_test"
import * as tests_ChartParameters from "../shared/ChartParameters_test"
import * as tests_sha1 from "../shared/sha1_test"

nodeunit.run({
  'PageData': tests_PageData,
  'ChartParameters': tests_ChartParameters,
  'sha1': tests_sha1
})
