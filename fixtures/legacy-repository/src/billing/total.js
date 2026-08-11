// The current way to compute a total. Cents, integer arithmetic.
export function computeTotalCents(lines) {
  return lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
}
