// DEPRECATED — superseded by src/billing/total.js in 2024.
// Still imported by src/legacy/nightly.js. Do not use in new code.
//
// Floating-point money. This is the bug that caused the 2024 reconciliation
// incident; the fix was to stop using this, not to fix it.
export function calcTotal(lines) {
  let total = 0;
  for (var i = 0; i < lines.length; i++) {
    total = total + lines[i].unit_price * lines[i].qty;
  }
  return total;
}
