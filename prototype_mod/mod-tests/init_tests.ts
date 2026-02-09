const init = require("__factorio-test__/init") as (
  files: string[],
  config?: object,
) => void
import * as generatedTests from "./generated/test_list.json"

const manualTests: string[] = ["mod-tests.build_mode_test"]

init([...generatedTests, ...manualTests])
