import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';
import { currentUser } from './session.js';
import { documents, invoices, saveDocument } from './store.js';

const STORAGE_ROOT = '/srv/documents';

// Fetch a document by id.
export async function getDocument(request) {
  const user = currentUser(request);
  if (!user) return { status: 401 };

  const document = documents.get(request.params.documentId);
  if (!document) return { status: 404 };

  return { status: 200, body: document };
}

// Update a document.
export async function updateDocument(request) {
  const user = currentUser(request);
  if (!user) return { status: 401 };

  const document = documents.get(request.params.documentId);
  if (!document) return { status: 404 };
  if (document.workspaceId !== user.workspaceId) return { status: 403 };

  Object.assign(document, request.body);
  saveDocument(document);

  return { status: 200, body: document };
}

// List documents for a workspace.
export async function listDocuments(request) {
  const user = currentUser(request);
  if (!user) return { status: 401 };

  const workspaceId = request.query.workspaceId ?? user.workspaceId;
  const results = [...documents.values()].filter((d) => d.workspaceId === workspaceId);

  return { status: 200, body: results };
}

// Download a stored attachment.
export async function downloadAttachment(request) {
  const user = currentUser(request);
  if (!user) return { status: 401 };

  const contents = await readFile(join(STORAGE_ROOT, request.query.name));
  return { status: 200, body: contents };
}

// Import a document from a URL the caller supplies.
export async function importFromUrl(request) {
  const user = currentUser(request);
  if (!user) return { status: 401 };

  const response = await fetch(request.body.url);
  const text = await response.text();
  const document = { workspaceId: user.workspaceId, ownerId: user.userId, text };
  saveDocument(document);

  return { status: 201, body: document };
}

// Billing provider webhook.
export async function billingWebhook(request) {
  const signature = request.headers['x-billing-signature'];
  const expected = createHmac('sha256', process.env.BILLING_SECRET)
    .update(request.rawBody)
    .digest('hex');

  if (signature !== expected) return { status: 401 };

  const event = JSON.parse(request.rawBody);
  invoices.set(event.invoiceId, { paid: true, amount: event.amount });

  return { status: 200 };
}

// Delete every document in a workspace. Administrative.
export async function purgeWorkspace(request) {
  const user = currentUser(request);
  if (!user) return { status: 401 };
  if (user.role !== 'admin') return { status: 403 };

  for (const [id, document] of documents) {
    if (document.workspaceId === request.body.workspaceId) documents.delete(id);
  }

  return { status: 200 };
}
