#!/bin/sh
set -eu

# Exercise the same fixtures in previews and production, with provider
# credentials excluded from the test processes and bounded memory usage.
env -i PATH="$PATH" HOME=/tmp CI=true node --test --test-concurrency=2 tests/*.test.cjs
npm run build
