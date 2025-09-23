This is a collection of projects, to formalize and prototype an implementation of Factorio smart belt.

Informal spec is in spec_src/spec.md.

## Rust Prototype
The main prototype implementation is a rust crate, with tests.
Rust was chosen, to allow the prototype to be mostly but not completely functional.

Cargo.toml is in `prototype_abstract/`; `cd` first for cargo commands.

## Main logic

- All the "main" logic is in `prototype_abstract/src/smart_belt/*.rs`.
- This logic will eventually be extracted into a different programming language.

- Testing is mainly done through the a test suite, test cases defined in `./test_suite/*.yaml`, parsed and processed by `prototype_abstract/src/test_case.rs`. A build script gathers these, and generates normal rust integration tests.
- The goal is to get enough tests to get 100% code and branch coverage for `smart_belt/*`

## Other modules

- Other things in `src/prototype_abstract/src/` contain a simplified abstraction of Factorio.
- For unit tests for these,. Keep these brief; don't test every corner case, only a few interesting cases.

## Code style
Strongly prefer functional programming style

Do NOT add additional comments, or doc comments.
Do NOT add additional examples, readme, or explanations, etc.
