import { PageHeader } from "@/components/page-header";
import { getCategorias, getTags, getCamposPersonalizados } from "@/lib/data/catalog";
import { CatalogoManager } from "@/components/catalogo/catalogo-manager";

export default async function CatalogoPage() {
  const [categorias, tags, campos] = await Promise.all([
    getCategorias(),
    getTags(),
    getCamposPersonalizados(),
  ]);

  return (
    <>
      <PageHeader
        title="Catálogo"
        description="Categorias, tags e campos personalizados para classificar documentos."
      />
      <CatalogoManager
        categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
        tags={tags.map((t) => ({ id: t.id, nome: t.nome }))}
        campos={campos.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }))}
      />
    </>
  );
}
