import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { listModerationQueue } from "@/lib/ideas-db";
import type { ModerationEntry } from "@/lib/ideas-db";

export const Route = createFileRoute("/moderasyon")({
  head: () => ({
    meta: [
      { title: "Moderasyon | Fikir Meydanı" },
      {
        name: "description",
        content: "Topluluk tarafından bildirilip gizlenen içerikler — şeffaf moderasyon kaydı.",
      },
    ],
  }),
  component: ModerasyonPage,
});

function ModerasyonPage() {
  const [entries, setEntries] = useState<ModerationEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listModerationQueue()
      .then(setEntries)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Moderasyon kaydı yüklenemedi."),
      );
  }, []);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground transition-colors hover:bg-accent"
        >
          ← Meydana dön
        </Link>

        <h1 className="mt-6 text-2xl font-bold">Moderasyon</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Meydan'da gerçek bir kimlik doğrulama/admin sistemi yok (bkz. proje README'si), bu yüzden
          moderasyon <b>şeffaflığa</b> dayanır: bir içerik en az iki farklı kullanıcı tarafından
          bildirilince otomatik gizlenir ve burada, gerekçesiyle birlikte herkese açık olarak
          listelenir. Geri açma yok.
        </p>

        {error && (
          <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {!error && entries === null && (
          <p className="mt-6 text-sm text-muted-foreground">Yükleniyor…</p>
        )}

        {entries && entries.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            Şu an gizlenmiş bir içerik yok — moderasyon kuyruğu boş.
          </p>
        )}

        {entries && entries.length > 0 && (
          <ul className="mt-6 space-y-3">
            {entries.map((e) => (
              <li
                key={`${e.targetType}-${e.targetId}`}
                className="rounded-xl border border-border/40 bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {e.targetType === "idea" ? "Fikir" : "Katkı"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{e.flagCount} bildirim</span>
                </div>
                <p className="mt-2 text-sm text-card-foreground">{e.text}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Sahibi/Katkı veren: {e.ownerOrContributor} · Gerekçeler:{" "}
                  {Array.from(new Set(e.reasons)).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
