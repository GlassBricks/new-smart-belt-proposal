This is a collection of projects to formalize and prototype an implementation of Factorio smart belt.

## Rust Prototype

The main prototype implementation is a rust crate, with tests.

- All the "main" logic is in `prototype_abstract/src/smart_belt/*.rs`.

## TS/mod prototype

in prototype_mod/, another prototype, mostly a direct port of the rust prototype.

Contains both pure Typescript, and a lua Factorio mod compiled using TypescriptToLua.
3 subdirs for different parts:
`prototype_mod/common/`, `prototype_mod/ts_only/`, and `prototype_mod/mod-scripts/` (mod-only).

## Testing

Testing is done through a shared test suite, test cases defined in `./test_suite/*.yaml`.
These are turned into runnable tests:

- In rust, tests are generated using build.rs.
- In TS, tests are generated using `bun run generate-tests`, need to manually run this before bun tests.
- In the mod, tests are generated into `prototype_mod/mod-tests/generated/` and run in-game via the `factorio-test` framework. `prototype_mod/mod-tests/test_helpers.ts` provides the test harness for in-game mod tests:

## Debugging rust vs TS

When debugging test failing in one version but not the other, some techniques:

- See where implementations diverge: TS implementation SHOULD be nearly a direct port from rust.
- Enable or add logging: (RUST_LOG=debug for prototype_abstract, adding/enabling corresponding console log statements in ts version).
