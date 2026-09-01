/**
 * AI Fikir Çekirdeği — sunucu tarafı analiz uç noktası.
 *
 * Serbest kullanıcı metnini alır, google/gemini modeliyle (Vercel AI SDK
 * `generateObject`) `ideaPlanSchema`'ya uyan yapılandırılmış bir plana
 * dönüştürür: hangi bölgeye gideceği, teması, başlığı, rengi, önerilen katkı
 * puanı ve voxel motoruna doğrudan parametre olabilecek yapı listesi.
 *
 * `GOOGLE_GENERATIVE_AI_API_KEY` tanımlı değilse veya model çağrısı herhangi
 * bir sebeple (ağ, zaman aşımı, geçersiz anahtar, şema dışı çıktı) başarısız
 * olursa, `fallbackPlan` devreye girer — bu prototipin AI anahtarı olmadan da
 * jüriye/kullanıcıya gösterilebilmesini sağlayan kasıtlı bir tasarım kararıdır.
 */

import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { fallbackPlan, ideaPlanSchema, type IdeaAnalysis } from "@/lib/idea-core";

const SYSTEM_PROMPT = `Sen "Meydan" adlı sosyal inovasyon platformunun AI Fikir Çekirdeği'sin.

Rolün: kullanıcının fikri yerine karar veren bir otorite değil; fikri anlayan,
doğru bölgeye yönlendiren ve ilk katkı önerisini oluşturan bir kolaylaştırıcısın.
Bir içerik/sohbet üreticisi değil; serbest metni oyun motorunun anlayacağı
güvenli bir plana çeviren bir sınıflandırıcı ve üretim planlayıcısısın.

Kullanıcının fikrini analiz et ve şu altı bölgeden TAM OLARAK birine ata:
- Fikir: henüz netleşmemiş, ilk aşamadaki ham fikirler
- Tasarım: görsel/arayüz/kullanıcı deneyimi katkısı gerektiren fikirler
- Üretim: kod, prototip, fiziksel/dijital üretim gerektiren fikirler
- Topluluk: geri bildirim, tartışma, gönüllü katkı gerektiren fikirler
- Pazar: satış, gelir, müşteri, yatırım odaklı fikirler
- Başarı: tamamlanmaya yakın, ödül/lansman aşamasındaki fikirler

Kurallar (bunlara kesinlikle uy, aksi hâlde çıktı reddedilir):
- "yapilar" listesi 14 ile 26 arasında öğe içermeli.
- Her yapı noktasının x ve z değeri 8 ile 88 arasında bir tam sayı olmalı; y değeri 0 ile 8 arasında bir tam sayı olmalı.
- "renk" #rrggbb biçiminde olmalı (örn. #35d6ff).
- "baslik" en fazla altı kelime olmalı, kullanıcının fikrini özetlemeli.
- "onerilenKatkiPuani" 1 ile 100 arasında bir tam sayı olmalı; fikrin netliği ve kapsamına göre öner.
- "tema" fikri iki-üç kelimeyle özetleyen kısa bir etiket olmalı.

Uygunsuz, saldırgan veya kişisel veri içeren metinlerde bile şemaya uygun bir
çıktı üret; içeriği yorumlama veya reddetme, yalnızca sınıflandır.`;

const DEFAULT_MODEL = "gemini-2.5-flash";

export const analyzeIdea = createServerFn({ method: "POST" })
  .validator((text: unknown) => {
    if (typeof text !== "string") throw new Error("Fikir metni gerekli.");
    const trimmed = text.trim();
    if (trimmed.length < 3) throw new Error("Fikrini biraz daha uzun yaz.");
    if (trimmed.length > 2000) throw new Error("Fikir metni çok uzun (en fazla 2000 karakter).");
    return trimmed;
  })
  .handler(async ({ data: text }): Promise<IdeaAnalysis> => {
    if (!process.env["GOOGLE_GENERATIVE_AI_API_KEY"]) {
      return { plan: fallbackPlan(text), source: "fallback" };
    }

    try {
      const modelId = process.env["MEYDAN_GEMINI_MODEL"] ?? DEFAULT_MODEL;
      const { object } = await generateObject({
        model: google(modelId),
        schema: ideaPlanSchema,
        system: SYSTEM_PROMPT,
        prompt: text,
        abortSignal: AbortSignal.timeout(12_000),
      });
      return { plan: object, source: "ai" };
    } catch (error) {
      console.error("[idea-core] AI analizi başarısız, deterministik plana geçiliyor:", error);
      return { plan: fallbackPlan(text), source: "fallback" };
    }
  });
