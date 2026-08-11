// The caller's identity. Trusted: it is derived from a verified token.
export function currentUser(request) {
  return request.session ?? null; // { userId, workspaceId, role }
}
