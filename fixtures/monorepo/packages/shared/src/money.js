// Imported by both applications. A change here reaches every package.
export function formatCents(totalCents) {
  return `${(totalCents / 100).toFixed(2)}`;
}
