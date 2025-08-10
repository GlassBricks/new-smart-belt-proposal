# New Factorio smart belt proposal

A [detailed spec](smart_belt_spec.md) of a new, improved, and fixed version of Factorio smart belt!

Will later have a prototype implementation.

#### Comments and critiques are welcome!
Feel free to open an issue or a pull request.

## Background

After months of smart belt bugs, limitations, regressions, and frustrations; many times thinking "I could (probably) implement that better"; and being slightly annoyed at the implementation when seeing [kovarex fixing some bugs](https://www.youtube.com/watch?v=AmliviVGX8Q); I finally decided to give a shot myself.
The goal is to overhaul smart belt, such that just always "just works" and is fixed once and for all.

This starts with the [detailed spec](smart_belt_spec.md). It aims to:
- Fix all smart belt bugs now an forever
- Support all past building features, like upgrading and rotating
- Support some new features, like un-dragging belt and belt-weaving.
- Cover _all_ possible scenarios.
- **Changes** some smart belt behavior to be the most useful.
   - For instance, ensuring the dragged belt will be always be continuous, and always giving an error if this is not possible.

Next comes a comprehensive list of test cases, according to the spec.

Then will come a prototype implementation, that people can play with to ensure everything works.

Finally, if everything is working, trying to convince Kovarex to get source access to put it in the main game.
