if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = (async () => {
    throw new Error('Test fetch mock not implemented');
  }) as typeof fetch;
}
