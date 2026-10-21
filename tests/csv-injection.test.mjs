import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeCsv } from "../src/utils/safeCsv.js";

test("CSV exports quote commas, quotes and newlines", () => {
  assert.equal(escapeCsv('A, B'), '"A, B"');
  assert.equal(escapeCsv('He said "yes"'), '"He said ""yes"""');
  assert.equal(escapeCsv('normal\nsecond'), '"normal\nsecond"');
  assert.equal(escapeCsv(null), '""');
});
test("CSV exports prevent spreadsheet formula evaluation after invisible prefixes", () => {
  for (const prefix of ["=", "+", "-", "@", "  =",
    "\t=", "\r+", "\n@", "\uFEFF=", "\u200B+", "\u2060-"]) {
    assert.equal(escapeCsv(prefix + "1+1"), `"'${prefix}1+1"`);
  }
});
test("CSV exports retain ordinary text and existing apostrophes", () => {
  assert.equal(escapeCsv("Jane Doe"), '"Jane Doe"');
  assert.equal(escapeCsv("name@example.edu"), '"name@example.edu"');
  assert.equal(escapeCsv("999"), '"999"');
  assert.equal(escapeCsv("'=already text"), '"\'=already text"');
});
