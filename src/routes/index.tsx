import { createFileRoute } from "@tanstack/react-router";
import { IdeaSquare } from "@/components/IdeaSquare";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fikir Meydanı | TEKNOFEST Akıllı Şehir" },
      {
        name: "description",
        content:
          "TEKNOFEST için tasarlanan etkileşimli voxel şehir; akıllı tarım, sürdürülebilir pazar ve üretim bölgelerini keşfedin.",
      },
      { property: "og:title", content: "Fikir Meydanı | TEKNOFEST Akıllı Şehir" },
      {
        property: "og:description",
        content: "Akıllı tarım ve sürdürülebilir üretimi deneyimleten etkileşimli voxel şehir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="h-screen w-full overflow-hidden bg-background">
      <h1 className="sr-only">Fikir Meydanı — voxel tabanlı gece şehri</h1>
      <IdeaSquare />
    </main>
  );
}
