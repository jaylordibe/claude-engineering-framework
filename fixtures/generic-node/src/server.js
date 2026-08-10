import { createServer } from 'node:http';
import { timingSafeEqual, createHmac } from 'node:crypto';

const deliveredEventIds = new Map();

function isSignatureValid(rawBody, providedSignature) {
  const expected = createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(rawBody)
    .digest();
  const provided = Buffer.from(providedSignature ?? '', 'hex');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

createServer((request, response) => {
  if (request.url !== '/hooks' || request.method !== 'POST') {
    response.writeHead(404).end();
    return;
  }

  let rawBody = '';
  request.on('data', (chunk) => { rawBody += chunk; });
  request.on('end', () => {
    if (!isSignatureValid(rawBody, request.headers['x-signature'])) {
      response.writeHead(401).end();
      return;
    }
    const event = JSON.parse(rawBody);
    if (deliveredEventIds.has(event.id)) {
      response.writeHead(200).end();
      return;
    }
    deliveredEventIds.set(event.id, Date.now());
    response.writeHead(202).end();
  });
}).listen(8080);
