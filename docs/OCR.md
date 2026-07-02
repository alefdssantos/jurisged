# OCR Real em Produção — Guia Técnico

> Substitui o mock de `OcrEngine.extrair({bytes, mimeType, nomeArquivo}): Promise<string>`
> (`src/lib/ocr/ocr-service.ts`) por uma implementação real para PDFs e imagens
> digitalizadas em português (`por`).
>
> **Recomendação central:** binário `tesseract` via `child_process` + `poppler-utils`,
> rodando num **worker de fila** (não na request). Para arquivar PDF pesquisável (PDF/A),
> use **OCRmyPDF**.

## 1. Instalação no Docker (Debian/Ubuntu) + idioma português

Pacote de idioma segue a convenção `tesseract-ocr-<langcode>` — português é `por`.

```dockerfile
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-por \
    poppler-utils \
    ghostscript \
    imagemagick \
 && rm -rf /var/lib/apt/lists/*

RUN tesseract --list-langs   # confirma que "por" aparece

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "server.js"]
```

- `tesseract-ocr` — motor (binário `tesseract`)
- `tesseract-ocr-por` — dados do português (`por.traineddata`)
- `poppler-utils` — `pdftotext` (texto nativo) e `pdftoppm` (rasteriza PDF→imagem)
- `ghostscript` — rasterização alternativa / dependência do OCRmyPDF
- `imagemagick` — pré-processamento (deskew/threshold)

## 2. Node.js: binário (`child_process`) vs `tesseract.js` (WASM)

**Recomendado: binário nativo** — mais rápido/preciso, integra com poppler/ghostscript já no
container, controle total de `--oem/--psm/-l`. Use `tesseract.js` apenas sem permissão para
binários nativos ou no browser (e reutilize o worker entre chamadas).

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

async function ocrImagem(caminho: string) {
  const { stdout } = await execFileAsync("tesseract", [
    caminho, "stdout", "-l", "por", "--oem", "1", "--psm", "3",
  ]);
  return stdout;
}
```

## 3. Pipeline para PDF

Sempre **tente texto nativo primeiro** (rápido e exato); só faça OCR se vier vazio.

```bash
# 3.1 PDF com texto nativo
pdftotext -layout entrada.pdf -        # stdout

# 3.2 PDF-imagem (digitalizado): rasteriza e roda OCR por página
pdftoppm -r 300 -png entrada.pdf pagina
for img in pagina-*.png; do
  tesseract "$img" stdout -l por --oem 1 --psm 3
done
```

## 4. Boas práticas

- **Resolução** ~300 dpi (`pdftoppm -r 300`).
- **Pré-processamento**: `convert in.png -deskew 40% -colorspace Gray -threshold 60% out.png`.
- **Tesseract**: `-l por` (bilíngue: `-l por+eng`), `--oem 1` (LSTM), `--psm 3` (auto; teste 4/6 p/ colunas/blocos).
- **Assíncrono**: OCR é CPU-intensivo — **nunca** rode na request. Upload → enfileira job
  (BullMQ/Redis ou tabela de fila) → **worker** dedicado processa → persiste texto + status
  (`pendente/processando/concluído/erro`) → UI faz polling. Em Next.js, o worker é um processo
  Node separado (serviço `worker` no compose), não uma API route.

## 5. Alternativa pronta: OCRmyPDF

Empacota Tesseract + Ghostscript + QPDF + Leptonica e gera **PDF/A pesquisável** (deskew, rotação,
multipágina, multi-core).

```bash
docker run --rm -i jbarlow83/ocrmypdf -l por --sidecar saida.txt - - < entrada.pdf > saida.pdf
# --sidecar grava o texto OCR num .txt — exatamente o retorno que OcrEngine.extrair precisa
```

Prefira OCRmyPDF quando quiser **arquivar o PDF pesquisável** (caso típico jurídico). Use o
pipeline manual da Seção 3 quando precisa só do texto com controle máximo, ou para imagens soltas.

## 6. `TesseractOcrEngine` — onde plugar

Implementação concreta recomendada: `pdftotext` → fallback `pdftoppm` + `tesseract` (PDF);
`tesseract` direto (imagem). Rodar **dentro do worker da fila**.

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OcrEngine, OcrEntrada } from "@/lib/ocr/ocr-service";

const execFileAsync = promisify(execFile);

export class TesseractOcrEngine implements OcrEngine {
  nome = "tesseract";
  private idioma = "por";

  async extrair({ bytes, mimeType, nomeArquivo }: OcrEntrada): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "ocr-"));
    try {
      if (mimeType === "application/pdf" || nomeArquivo.toLowerCase().endsWith(".pdf")) {
        return await this.extrairDePdf(bytes, dir);
      }
      const img = join(dir, "in");
      await writeFile(img, bytes);
      return await this.tesseract(img);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async extrairDePdf(bytes: Buffer, dir: string): Promise<string> {
    const pdf = join(dir, "in.pdf");
    await writeFile(pdf, bytes);
    const nativo = await this.pdftotext(pdf);
    if (nativo.trim().length > 50) return nativo;       // texto nativo basta

    const base = join(dir, "page");
    await execFileAsync("pdftoppm", ["-r", "300", "-png", pdf, base]);
    const paginas = (await readdir(dir)).filter((f) => f.startsWith("page") && f.endsWith(".png")).sort();
    const partes: string[] = [];
    for (const p of paginas) partes.push(await this.tesseract(join(dir, p)));
    return partes.join("\n\n");
  }

  private async pdftotext(pdf: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync("pdftotext", ["-layout", pdf, "-"]);
      return stdout;
    } catch {
      return "";
    }
  }

  private async tesseract(imagem: string): Promise<string> {
    const { stdout } = await execFileAsync("tesseract", [imagem, "stdout", "-l", this.idioma, "--oem", "1", "--psm", "3"]);
    return stdout;
  }
}
```

Para ativar em produção, no boot do worker:

```ts
import { setOcrEngine } from "@/lib/ocr/ocr-service";
import { TesseractOcrEngine } from "./tesseract-ocr-engine";
setOcrEngine(new TesseractOcrEngine());
```

## Fontes oficiais

- Tesseract — instalação / pacotes de idioma: https://tesseract-ocr.github.io/tessdoc/Installation.html
- Tesseract — uso por linha de comando (`-l`, `--oem`, `--psm`): https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html
- tesseract.js — README/API: https://github.com/naptha/tesseract.js/
- poppler-utils (Debian, `pdftotext`/`pdftoppm`): https://packages.debian.org/sid/poppler-utils
- pdftotext — manpage: https://manpages.debian.org/bookworm/poppler-utils/pdftotext.1.en.html
- OCRmyPDF: https://github.com/ocrmypdf/OCRmyPDF · Docker: https://ocrmypdf.readthedocs.io/en/latest/docker.html · cookbook: https://ocrmypdf.readthedocs.io/en/latest/cookbook.html

## Ressalvas

- `--oem 1` / `--psm 3` são defaults sensatos (LSTM + auto), mas o melhor PSM depende do layout —
  teste com amostras reais. Binário vs WASM: recomendação de engenharia (sem benchmark oficial único).
  O limiar de 50 caracteres para "texto nativo vazio → OCR" é heurística ajustável.
