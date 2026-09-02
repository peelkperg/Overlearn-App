// `useLocalSearchParams<{ id: string }>()` is a compile-time assertion, not
// a runtime guarantee: the param is absent on a malformed route and is an
// array when it appears more than once. Passing either straight through
// produces keys like `history.undefined` and routes like `/session/a,b`.
export function useRouteId(params: Record<string, string | string[] | undefined>): string | undefined {
  const id = params.id;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}
