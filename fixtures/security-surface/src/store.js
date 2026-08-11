// Stands in for a database. The shape is what matters, not the storage.
export const documents = new Map();
export const invoices = new Map();

let nextId = 1;

export function saveDocument(document) {
  document.id ??= String(nextId++);
  documents.set(document.id, document);
  return document;
}
