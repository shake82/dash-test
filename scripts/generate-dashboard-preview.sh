#!/usr/bin/env bash
set -euo pipefail

input_file="${1:-public/api/dashboard-data.json}"
output_file="${2:-public/api/dashboard-data-preview-2.json}"

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required to generate the dashboard preview." >&2
  exit 1
fi

if [[ ! -f "$input_file" ]]; then
  echo "Error: input file not found: $input_file" >&2
  exit 1
fi

tmp_file="$(mktemp "${output_file}.tmp.XXXXXX")"
trap 'rm -f "$tmp_file"' EXIT

jq --stream '
  def dimensions:
    [
      "currentLocationCode",
      "fcoLocationCode",
      "adjudicationLocationCode",
      "caseSubstatusCode",
      "filingCategoryCode",
      "channelTypeCode",
      "atNBC",
      "milnatzInd",
      "isRemoteInd",
      "uscisReceiptDate"
    ];

  def normalize:
    if . == null or . == "" then "Unknown" else tostring end;

  def month_key:
    normalize
    | if test("^\\d{4}-\\d{2}") then .[0:7] else . end;

  def dimension_value($row; $dimension):
    if $dimension == "uscisReceiptDate" then
      ($row[$dimension] | month_key)
    else
      ($row[$dimension] | normalize)
    end;

  def dashboard_row_event:
    length == 2
    and (.[0] | length) == 3
    and .[0][0] == "data"
    and (.[0][1] | type) == "number";

  def add_current_row:
    if (.row | length) == 0 then
      .
    else
      (.row.total // 0 | tonumber) as $total
      | reduce dimensions[] as $dimension (.;
          dimension_value(.row; $dimension) as $value
          | .aggregates[$dimension][$value] =
              ((.aggregates[$dimension][$value] // 0) + $total)
        )
    end;

  reduce inputs as $event (
    { rowIndex: null, row: {}, aggregates: {} };
    if ($event | dashboard_row_event) then
      ($event[0][1]) as $rowIndex
      | ($event[0][2]) as $field
      | ($event[1]) as $value
      | if .rowIndex == null or .rowIndex == $rowIndex then
          .rowIndex = $rowIndex
          | .row[$field] = $value
        else
          add_current_row
          | .rowIndex = $rowIndex
          | .row = { ($field): $value }
        end
    else
      .
    end
  )
  | add_current_row
  | .aggregates as $aggregates
  | [
      dimensions[] as $dimension
      | (
          $aggregates[$dimension] // {}
          | to_entries
          | if $dimension == "uscisReceiptDate" then
              sort_by(.key)
            else
              sort_by(-.value, .key)
            end
          | .[]
          | { id: $dimension, value: .key, aggregate: .value }
        )
    ]
' "$input_file" > "$tmp_file"

mv "$tmp_file" "$output_file"
trap - EXIT

echo "Generated $output_file from $input_file"
