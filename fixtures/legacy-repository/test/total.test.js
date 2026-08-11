import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTotalCents } from '../src/billing/total.js';

// Only the current path is covered. src/legacy/ has no tests at all.
test('totals line items', () => {
  assert.equal(computeTotalCents([{ unitCents: 100, quantity: 2 }]), 200);
});
