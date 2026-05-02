const icons = import.meta.glob("/src/lib/assets/icons/*.svg", {
  query: "?raw",
  import: "default",
});

const cache = new Map<string, string>();

/**
 * Loads an icon's SVG content and returns it as a CSS-safe Data URI.
 * Uses Vite's dynamic imports to lazy-load icons at runtime.
 */
export async function getIconData(name: string): Promise<string | null> {
  if (cache.has(name)) return cache.get(name)!;

  const path = `/src/lib/assets/icons/${name}.svg`;
  const loader = icons[path];

  if (loader) {
    try {
      const content = (await loader()) as string;
      // Convert SVG content to a safe Data URI for mask-image
      // Using encodeURIComponent ensures all characters are safe for CSS
      const dataUri = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}")`;
      cache.set(name, dataUri);
      return dataUri;
    } catch (error) {
      console.error(`Failed to load icon: ${name}`, error);
      return null;
    }
  }

  return null;
}
