// Two date helpers with the same job and different names, from two eras.
// Neither is deprecated, both are used, and nothing says which to prefer.
export function formatDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function toDateString(value) {
  return new Date(value).toISOString().split('T')[0];
}
