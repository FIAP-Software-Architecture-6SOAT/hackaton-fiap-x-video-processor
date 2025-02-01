#!/bin/bash

# Run Jest tests with coverage
jest --coverage --coverageReporters=json-summary || exit 1

# Extract the coverage percentage from the output
coverage=$(jq -r '.total.lines.pct' ./coverage/coverage-summary.json)
echo "Coverage: $coverage"

# Convert coverage percentage to a float
coverage_num=$(echo "$coverage" | sed 's/%//' | bc -l)  # Use bc for floating-point arithmetic

readonly minimum_coverage=18

# Check if coverage is below the threshold
if (( $(bc <<< "$coverage_num < $minimum_coverage") )); then  # Use bc for float comparison
  echo "Coverage is below $minimum_coverage%: $coverage_num%"
  exit 1
fi

echo "Coverage is acceptable: $coverage_num%"

jest --coverage|| exit 1
