This is a collection of projects, to formalize and prototype an implementation of Factorio smart belt.

Informal spec is in spec_src/spec.md.

## Rust Prototype
The main prototype implementation is a rust crate, with tests.
- All the "main" logic is in `prototype_abstract/src/smart_belt/*.rs`.

## TS/mod prototype
There's another prototype, which is mostly a direct port of the rust prototype.
This is written in typescript, setup using bun.sh, in `prototype_mod`.

Part of this is compiled with TypescriptToLua, to create an actual Factorio mod.
This creates 3 subdirs for different parts:
`prototype_mod/common/`, `prototype_mod/ts_only/`, and `prototype_mod/scripts` (mod-only).

## Testing
Testing is mainly done through the a test suite, test cases defined in `test_suite/*.yaml`.
These are turned into runnable tests.
The rust version generates tests using build.rs.
The TS version generates test using a script, `generate-tests.ts`.
There is no equivalent for the mod version.

## Code style
Strongly prefer functional programming style.

Do not add additional explanatory tests, readme.md, examples, doc comments, etc.
Instead, opt toward refactoring to more self-documenting code.

## After a task
After completing a task, evaluate if there are any unused functions (or functions only used in tests and nowhere else).
Remove these. Keep the code focused.
