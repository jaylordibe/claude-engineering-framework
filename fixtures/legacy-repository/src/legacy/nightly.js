import { calcTotal } from './invoice-old.js';

// The nightly reconciliation job. Runs from cron on the billing host; there is
// no scheduler definition in this repository. TODO: move onto the queue.
export function reconcile(invoices) {
  return invoices.map((invoice) => ({
    id: invoice.id,
    total: calcTotal(invoice.lines), // TODO: switch to computeTotalCents
  }));
}
