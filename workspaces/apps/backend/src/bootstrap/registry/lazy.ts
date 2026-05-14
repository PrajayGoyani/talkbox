/**
 * Defines a lazy-loaded property on an object.
 * The factory is only called once when the property is first accessed.
 * The getter then replaces itself with the actual value for subsequent accesses.
 */
export function lazy<T extends object, K extends keyof T>(obj: T, key: K, factory: () => T[K]) {
  Object.defineProperty(obj, key, {
    get() {
      const value = factory();
      Object.defineProperty(this, key, {
        value,
        enumerable: true,
        configurable: true,
      });
      return value;
    },
    configurable: true,
    enumerable: true,
  });
}
