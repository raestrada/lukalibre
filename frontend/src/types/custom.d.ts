// Declaración para importar archivos Markdown con el sufijo ?raw
declare module '*.md?raw' {
  const content: string;
  export default content;
}

// Declaración para importar archivos Markdown normales
declare module '*.md' {
  const content: string;
  export default content;
}
