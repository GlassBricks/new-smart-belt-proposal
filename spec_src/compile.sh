#!/usr/bin/env bash
cd "$(dirname "$0")"
cd ../image_renderer && cargo run ../spec_src/spec.md -o ../smart_belt_spec.md -d ../images -r
