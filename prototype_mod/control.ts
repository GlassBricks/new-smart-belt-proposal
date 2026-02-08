import "./mod-scripts/event_handler.ts"

if (script.active_mods["factorio-test"]) {
  require("mod-tests.generated.init_tests")
}
