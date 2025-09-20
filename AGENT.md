This is a collection of projects, to formalize and prototype an implementation of Factorio smart belt.

Informal spec is in spec_src/spec.md.

## Rust Prototype Implementation
The main prototype implementation is a rust crate with tests, in prototype_src.
Rust was chosen for this because the prototype wants to be mostly functional-style.

All the "main" logic that will be transferrable outside the prototype is in `src/prototype_abstract/src/smart_belt/*.rs`
The rest is an abstraction of Factorio

## Tests
- Testing is mainly done through the above test suite
Test cases are in `./test_src/*.yaml`
Currently parsed/handled by `prototype_abstract/src/test/*.rs`.

A build script gathers these and creates normal rust integration tests.

The goal is to get enough tests to get 100% code and branch coverage.

## Unit Testing
Some modules have unit tests. Keep these brief; there's no need to test every corner case (only a few "interesting" cases).

## Code style

Prefer functional programming style:
- Functional operators
- Immutability and pure functions

Do not add comments. Only humans should do that.
Do not add additional examples, readme, or explanations, etc.
