export function normalizeListDeps<T extends Record<string, unknown>>(deps: T): T {
  const result = { ...deps };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = [...value].sort();
    }
  }
  return result;
}
