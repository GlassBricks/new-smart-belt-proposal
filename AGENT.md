This is a collection of projects to formalize and prototype an implementation of Factorio smart belt.

## Rust Prototype

The main prototype implementation is a rust crate, with tests.

- All the "main" logic is in `prototype_abstract/src/smart_belt/*.rs`.

## TS/mod prototype

in prototype_mod/, a prototype that is a direct port of the rust prototype, compiled to a Factorio mod using TypescriptToLua.

2 subdirs: `prototype_mod/common/` (shared logic) and `prototype_mod/mod-scripts/` (mod-only entry points).

## Testing

Testing is done through a shared test suite, test cases defined in `./test_suite/*.yaml`.
These are turned into runnable tests:

- In rust, tests are generated using build.rs.
- In the mod, tests are generated into `prototype_mod/mod-tests/generated/` via `bun run generate-factorio-tests`, and run in-game via the `factorio-test` framework. `prototype_mod/mod-tests/test_helpers.ts` provides the test harness. Manual tests live alongside generated tests in `mod-tests/`.

## Debugging rust vs TS

When debugging test failing in one version but not the other, some techniques:

- See where implementations diverge: TS implementation SHOULD be nearly a direct port from rust.
- Enable or add logging: (RUST_LOG=debug for prototype_abstract, adding/enabling corresponding console log statements in ts version).
