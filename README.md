# New Factorio smart belt proposal

A proposal for a new, improved, and fixed version of Factorio smart belt!

Spec is available as:
- [This blueprint](showcase_blueprint.txt) showcasing visually all parts of the spec.
- [Text spec](smart_belt_spec.md), formalizing goals and requirements.

Will later have a prototype implementation.

#### Comments and critiques are welcome!
Feel free to open an issue or a pull request.

## Background

We've had many months of smart belt bugs, limitations, regressions, and frustrations, especially in the Factorio speedrunning discord. Many times thinking "I could (probably) implement that better so these bugs can never have existed in the first place"; I finally decided to find out if that is really true and give a shot at implementing things myself.
The goal is to overhaul smart belt, such that just always "just works", and is fixed once and for all.

This starts with the spec. it aims to:
- Formalize what it means for smart belt to be correct and useful
- Fix all smart belt bugs now and forever
- Mathematically cover _all_ possible scenarios.
- Support all past building features, like upgrading and rotating
- Support some new features, like un-dragging belt and belt-weaving.
- _Changes_ some smart belt behavior to be the most useful.

This includes a comprehensive list of test cases, according to the spec.

Then will come a prototype implementation, that people can play with to get feedback and make sure everything works.

Finally, if everything is working and people are happy, trying to convince Kovarex to get source access to put it in the main game.
