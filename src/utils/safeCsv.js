/**
 * Quote values for spreadsheet-compatible CSV exports.
 *
 * CSV values are untrusted: a student can control their name, email and roll
 * number. Leading whitespace/invisible characters must not disguise Excel /
 * LibreOffice formula prefixes (=, +, -, @).
 *
 * This reduces formula injection risk for standard spreadsheet imports.
 * It does not sanitize arbitrary spreadsheet macros or third-party importers.
 */
export function escapeCsv(value) {
  let cell = String(value ?? "");
  const formulaAfterIgnorablePrefix = /^[\s\u200B-\u200D\u2060\uFEFF]*[=+@-]/u;
  const beginsWithControl = /^[\t\r\n]/u;
  if (formulaAfterIgnorablePrefix.test(cell) || beginsWithControl.test(cell)) {
    cell = "'" + cell;
  }
  return `"${cell.replace(/"/g, '""')}"`;
}
