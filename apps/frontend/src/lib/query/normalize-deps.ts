export function normalizeListDeps<T extends object>(deps: T): T {
  const result = { ...deps };
  for (const [key, value] of Object.entries(result)) {
    if (Array.isArray(value)) {
      Object.assign(result, { [key]: [...value].sort() });
    }
  }
  return result;
}
