/**
 * Gera um PDF mínimo, válido e renderável no navegador, a partir de linhas de texto.
 * Usado para criar arquivos de exemplo (seed) sem dependência externa.
 * Os offsets do xref são calculados a partir do tamanho em bytes acumulado.
 */
export function gerarPdfSimples(titulo: string, linhas: string[]): Buffer {
  const esc = (s: string) =>
    s.replace(/[()\\]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, " ");

  const todas = [titulo, "", ...linhas].slice(0, 40);
  const content =
    `BT /F1 13 Tf 60 780 Td 16 TL ` +
    todas.map((l) => `(${esc(l)}) Tj T*`).join(" ") +
    ` ET`;

  const objetos = [
    `<</Type/Catalog/Pages 2 0 R>>`,
    `<</Type/Pages/Kids[3 0 R]/Count 1>>`,
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>`,
    `<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>`,
    `<</Length ${Buffer.byteLength(content, "latin1")}>>\nstream\n${content}\nendstream`,
  ];

  let pdf = `%PDF-1.4\n`;
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objetos.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
