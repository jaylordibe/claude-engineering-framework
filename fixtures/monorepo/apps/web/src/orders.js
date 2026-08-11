import { formatCents } from '@fixture/shared/src/money.js';

// Reads the same Order shape. `status` is rendered directly, so a new
// enumerated value reaches the browser before this file knows about it.
export async function renderOrder(id) {
  const order = await (await fetch(`/orders/${id}`)).json();
  return `${order.status}: ${formatCents(order.totalCents)}`;
}
