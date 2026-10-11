// Vite handles CSS module imports at build time.
// This declaration silences TypeScript's TS2882 for CSS side-effect imports.
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
