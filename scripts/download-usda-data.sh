#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
project_dir=$(cd "$script_dir/.." && pwd)
data_dir="$project_dir/data/usda"
archive="$data_dir/FoodData_Central_csv_2026-04-30.zip"
source_url="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2026-04-30.zip"

mkdir -p "$data_dir"
curl --fail --location --continue-at - --output "$archive" "$source_url"
(cd "$data_dir" && shasum -a 256 "$(basename "$archive")" > "$(basename "$archive").sha256")

echo "Downloaded USDA FoodData Central to $archive"
