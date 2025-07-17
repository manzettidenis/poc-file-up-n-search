declare module 'pdf-text-extract' {
  function extract(
    filePath: string,
    callback: (err: Error | null, pages: string[]) => void
  ): void;
  
  function extract(
    filePath: string,
    options: { layout?: string },
    callback: (err: Error | null, pages: string[]) => void
  ): void;
  
  export = extract;
}
