import { findById, listForBusiness } from './orders.repository.js';
import { requireSession } from '../auth/session.js';

// Handlers are plain functions registered in src/server.js. There is no
// framework, no decorators and no ability check: the session gives an actor,
// and the query below is not scoped to it.
export async function getOrder(request) {
  const session = await requireSession(request);
  if (!session) return { status: 401 };

  const order = await findById(request.params.orderId);
  if (!order) return { status: 404 };

  return { status: 200, body: order };
}

export async function listOrders(request) {
  const session = await requireSession(request);
  if (!session) return { status: 401 };

  return { status: 200, body: await listForBusiness(request.query.businessId) };
}
