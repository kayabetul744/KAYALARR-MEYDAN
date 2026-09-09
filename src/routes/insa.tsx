import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { analyzeIdea } from "@/lib/idea-core-ai";
import { saveIdea, listIdeas, proposeContribution } from "@/lib/ideas-db";
import { useMeydanUser } from "@/lib/use-meydan-user";

export const Route = createFileRoute("/insa")({
  head: () => ({
    meta: [
      { title: "Üretim Atölyesi | Fikir Meydanı" },
      {
        name: "description",
        content: "Voxel dünyasında gez, blok seç, blok ekle ya da kır ve kendi yapını oluştur.",
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
  const { name: userName } = useMeydanUser();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const postToGame = useCallback((msg: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  // Üretim Atölyesi'nin (public/mineworld) Fikir Panosu'nu gerçek AI Fikir
  // Çekirdeği + Postgres katkı/KP sistemine bağlayan postMessage köprüsü —
  // aynı desen /atolye (src/routes/atolye.tsx) için kullanılan köprüyle
  // birebir aynı; oyun vanilla JS/iframe içinde çalıştığı için sunucu
  // fonksiyonlarını doğrudan çağıramıyor.
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as {
        type?: string;
        text?: string;
        author?: string;
        ideaId?: number;
        contributorName?: string;
        description?: string;
      } | null;
      if (!data || typeof data !== "object") return;

      if (data.type === "atolye:request-ideas") {
        try {
          const ideas = await listIdeas();
          postToGame({ type: "atolye:ideas", ideas });
        } catch {
          postToGame({ type: "atolye:ideas", ideas: [] });
        }
        return;
      }

      if (data.type === "atolye:submit-idea") {
        const text = (data.text ?? "").trim();
        const author = (data.author ?? "").trim() || userName || "Anonim";
        if (text.length < 3) {
          postToGame({ type: "atolye:idea-error", message: "Fikrini biraz daha uzun yaz." });
          return;
        }
        try {
          const analysis = await analyzeIdea({ data: text });
          const idea = await saveIdea({
            data: { text, plan: analysis.plan, source: analysis.source, ownerName: author },
          });
          postToGame({ type: "atolye:idea-created", idea, source: analysis.source });
          const ideas = await listIdeas();
          postToGame({ type: "atolye:ideas", ideas });
        } catch (err) {
          postToGame({
            type: "atolye:idea-error",
            message:
              err instanceof Error ? err.message : "Çekirdek şu anda analiz edemedi, tekrar dene.",
          });
        }
        return;
      }

      if (data.type === "atolye:propose-contribution") {
        const description = (data.description ?? "").trim();
        const contributorName = (data.contributorName ?? "").trim() || userName || "Anonim";
        const ideaId = data.ideaId;
        if (!ideaId || description.length < 3) {
          postToGame({
            type: "atolye:contribution-error",
            message: "Katkı açıklamasını biraz daha uzun yaz.",
          });
          return;
        }
        try {
          await proposeContribution({ data: { ideaId, contributorName, description } });
          postToGame({ type: "atolye:contribution-created" });
        } catch (err) {
          postToGame({
            type: "atolye:contribution-error",
            message: err instanceof Error ? err.message : "Katkı gönderilemedi.",
          });
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [userName, postToGame]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <h1 className="sr-only">Üretim Atölyesi MineWorld</h1>
      <iframe
        ref={iframeRef}
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
