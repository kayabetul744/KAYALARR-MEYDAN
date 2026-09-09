import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/atolye")({
  head: () => ({
    meta: [
      { title: "ATÖLYE — Üret, Tasarla, Paylaş" },
      {
        name: "description",
        content:
          "ATÖLYE: tarayıcıda oynanan 3B blok dünyası. Üretim fabrikasını gez, tasarım kampüsünü keşfet, fikir meydanında fikrini paylaş.",
      },
      { property: "og:title", content: "ATÖLYE — Üret, Tasarla, Paylaş" },
      {
        property: "og:description",
        content: "3B blok dünyasında keşif, üretim ve fikir paylaşımı. Hemen tarayıcıdan oyna.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AtolyePage,
});

const ZONES = [
  {
    title: "Fikir Meydanı",
    text: "Büyük pano, amfi ve masalar. E tuşuyla fikrini panoya bırak.",
  },
  {
    title: "Tasarım Kampüsü",
    text: "Pembe ve mor stüdyolardan oluşan, sakura ağaçlı yaratıcılık alanı.",
  },
  {
    title: "Üretim Fabrikası",
    text: "Bacalarından duman tüten fabrika ve çalışan üretim bantları.",
  },
  {
    title: "Topluluk Bahçesi",
    text: "Ortak ev, buluşma masaları ve yeşil üretim bahçeleri.",
  },
  {
    title: "Pazar",
    text: "Renkli tezgâhlar, küçük dükkânlar ve canlı bir meydan.",
  },
  {
    title: "Başarı Salonu",
    text: "Altın avlu, ödül masaları ve başarıların sergilendiği salon.",
  },
];

const CONTROLS = [
  ["W A S D", "Hareket"],
  ["Fare", "Bakış"],
  ["Sol tık", "Blok koy"],
  ["Sağ tık", "Blok kır"],
  ["Boşluk", "Zıpla"],
  ["1-9", "Blok seç"],
  ["E", "Fikir panosu"],
  ["Tekerlek", "Yakınlaş / uzaklaş"],
  ["ESC", "Duraklat"],
];

function AtolyePage() {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <main className="fixed inset-0 bg-background">
        <iframe
          src="/game/index.html"
          title="ATÖLYE oyunu"
          className="h-full w-full border-0"
          allow="fullscreen; pointer-lock"
        />
        <button
          onClick={() => setPlaying(false)}
          className="absolute left-4 top-4 z-50 rounded-md border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-foreground backdrop-blur transition-colors hover:bg-accent"
        >
          ← Atölye sayfasına dön
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <Link
          to="/"
          className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground transition-colors hover:bg-accent"
        >
          ← Meydana dön
        </Link>
      </div>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
          Üret · Tasarla · Paylaş
        </p>
        <h1 className="mt-6 text-6xl font-black tracking-[0.18em] sm:text-8xl">ATÖLYE</h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">
          Tarayıcıda çalışan 3B blok dünyası. Fabrikayı gez, kampüsü keşfet, fikir meydanında
          düşünceni panoya bırak. Kurulum yok — tıkla ve başla.
        </p>
        <button
          onClick={() => setPlaying(true)}
          className="mt-10 rounded-lg bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          Oyunu Başlat
        </button>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Bölgeler
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ZONES.map((z) => (
            <article
              key={z.title}
              className="rounded-xl border border-border bg-card p-6 text-card-foreground"
            >
              <h3 className="text-lg font-bold">{z.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{z.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Kontroller
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTROLS.map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground">
                {key}
              </span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
