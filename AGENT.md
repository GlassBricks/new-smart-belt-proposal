This is a collection of projects, to formalize and prototype an implementation of Factorio smart belt.

Informal spec is in spec_src/spec.md.

## Rust Prototype
The main prototype implementation is a rust crate, with tests.
Rust was chosen, to allow the prototype to be mostly but not completely functional.

## Main logic
- All the "main" logic is in `prototype_abstract/src/smart_belt/*.rs`.
- This logic will eventually be extracted into a different programming language.

- Testing is mainly done through the a test suite, test cases defined in `./test_suite/*.yaml`, parsed and processed by `prototype_abstract/src/test_case.rs`. A build script gathers these, and generates normal rust integration tests.
- The goal is to get enough tests to get 100% code and branch coverage for `smart_belt/*`

## Other modules

- Other things in `src/prototype_abstract/src/` contain a simplified abstraction of Factorio.
- For unit tests for these. Keep tests very BRIEF. Don't test every corner case, only a few interesting cases.
- If there is already decent test coverage, DO NOT add new tests.

## Code style
Strongly prefer functional programming style.

IMPORTANT: do not add additional explanations.
Do NOT add comments.
Do NOT add additional comments
Do NOT add additional examples, readme, explanations, or documentation.
Do NOT add additional examples, readme, explanations, or documentation.
Do NOT add additional explanatory tests.

## After a task
After completing a task, evaluate if there are any unused functions (or functions only used in tests and nowhere else).
Remove these. Keep the code focused.
