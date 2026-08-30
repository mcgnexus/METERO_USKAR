export function memoizeInflight<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
  keyFn: (...args: Args) => string = (...args) => args.map((arg) => JSON.stringify(arg)).join("|"),
): (...args: Args) => Promise<T> {
  const inFlight = new Map<string, Promise<T>>();
  return (...args: Args): Promise<T> => {
    const key = keyFn(...args);
    let pending = inFlight.get(key);
    if (!pending) {
      pending = fn(...args).finally(() => {
        inFlight.delete(key);
      });
      inFlight.set(key, pending);
    }
    return pending;
  };
}
