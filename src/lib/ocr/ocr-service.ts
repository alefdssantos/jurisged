/**
 * Camada de OCR atrás de uma interface. Em desenvolvimento usamos o mock
 * (sem dependência externa). Em produção, plugar `TesseractOcrEngine`
 * (Tesseract + Poppler) — ver `docs/OCR.md`.
 */
export interface OcrEntrada {
  bytes: Buffer;
  mimeType: string;
  nomeArquivo: string;
}

export interface OcrEngine {
  nome: string;
  extrair(entrada: OcrEntrada): Promise<string>;
}

class MockOcrEngine implements OcrEngine {
  nome = "mock";

  async extrair({ bytes, mimeType, nomeArquivo }: OcrEntrada): Promise<string> {
    // Arquivos de texto: o "OCR" é o próprio conteúdo (real e pesquisável).
    if (mimeType.startsWith("text/")) {
      return bytes.toString("utf8").slice(0, 20000);
    }
    // PDF/imagem: em produção o Tesseract extrairia o texto. No mock,
    // geramos um marcador rastreável e pesquisável.
    return `[OCR simulado] Texto reconhecido de ${nomeArquivo} (${mimeType}). Em produção este conteúdo viria do Tesseract (idioma português) e é indexado para busca textual.`;
  }
}

let engine: OcrEngine = new MockOcrEngine();

export function getOcrEngine(): OcrEngine {
  return engine;
}

/** Permite trocar o engine (ex.: testes ou produção com Tesseract). */
export function setOcrEngine(novo: OcrEngine) {
  engine = novo;
}

export async function executarOcr(entrada: OcrEntrada): Promise<string> {
  return engine.extrair(entrada);
}
