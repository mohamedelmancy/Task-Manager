/** Public file path, including `<base href>` when the site is hosted in a subfolder. */
export function publicFile(path: string): string {
  const base = document.querySelector('base')?.getAttribute('href') ?? '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${path.replace(/^\//, '')}`;
}
