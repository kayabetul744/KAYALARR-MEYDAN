import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/insa")({
  head: () => ({
    meta: [
      { title: "Üretim Atölyesi | Fikir Meydanı" },
      {
        name: "description",
        content:
          "Voxel dünyasında gez, blok seç, blok ekle ya da kır ve kendi yapını oluştur.",
      },
      { property: "og:title", content: "Üretim Atölyesi | Fikir Meydanı" },
      {
        property: "og:description",
        content: "Blok blok inşa edebileceğin MineWorld atölyesi — koy, kır, gez.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsaPage,
});

function InsaPage() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <h1 className="sr-only">Üretim Atölyesi MineWorld</h1>
      <iframe
        src="/mineworld/index.html"
        title="Üretim Atölyesi MineWorld"
        className="h-full w-full border-0"
        allow="fullscreen; pointer-lock"
      />
      <Link
        to="/"
        className="absolute left-4 top-4 z-50 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground shadow-lg"
      >
        ← Meydana dön
      </Link>
    </main>
  );
}
