import { createFileRoute } from "@tanstack/react-router";
import { IdeaSquare } from "@/components/IdeaSquare";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fikir Meydanı — Voxel Şehir" },
      {
        name: "description",
        content:
          "Türkiye saatine göre gündüz-gece değişen voxel Fikir Meydanı: yollar, ağaçlar, köprüler ve şehirde gezdirebileceğin bir karakter.",
      },
      { property: "og:title", content: "Fikir Meydanı — Voxel Şehir" },
      {
        property: "og:description",
        content: "Gündüz ve gece modlu voxel şehir, yürünebilir yollar ve hologram fikir çekirdeği.",
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
