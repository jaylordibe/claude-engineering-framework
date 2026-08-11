import { createServer } from 'node:http';
import { formatCents } from '@fixture/shared/src/money.js';

// Returns the Order shape declared in packages/contracts/order.json.
const orders = new Map([['1', { id: '1', totalCents: 2500, status: 'placed' }]]);

createServer((request, response) => {
  const id = request.url?.replace('/orders/', '');
  const order = orders.get(id);
  if (!order) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ ...order, display: formatCents(order.totalCents) }));
}).listen(3000);
