import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveDocument, documents } from '../src/store.js';
import { getDocument } from '../src/handlers.js';

// The suite covers the happy path only. There is no test for a caller reaching
// another workspace's document, and no test for an unauthenticated call.
test('a document can be fetched by id', async () => {
  const document = saveDocument({ workspaceId: 'w1', ownerId: 'u1', text: 'hello' });
  const response = await getDocument({ session: { userId: 'u1', workspaceId: 'w1' }, params: { documentId: document.id } });

  assert.equal(response.status, 200);
  assert.equal(response.body.text, 'hello');
});

test('an unknown id is not found', async () => {
  documents.delete('999');
  const response = await getDocument({ session: { userId: 'u1', workspaceId: 'w1' }, params: { documentId: '999' } });

  assert.equal(response.status, 404);
});
