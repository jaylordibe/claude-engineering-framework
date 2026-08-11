// Counts rows in a fixed sample. The malformed case is the defect: the row is
// dropped rather than counted, which is what CLAUDE.md says must not happen.
const SAMPLES = {
  valid: ['2026-01-01,4', '2026-01-02,7'],
  empty: [],
  malformed: ['not-a-row'],
};

const rows = SAMPLES[process.argv[2]] ?? [];
const counted = rows.filter((row) => /^\d{4}-\d{2}-\d{2},\d+$/.test(row));

process.stdout.write(String(counted.length));
