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

import {
  fallbackPlan,
  aiIdeaPlanSchema,
  generateStructurePoints,
  hashText,
  type IdeaAnalysis,
  type IdeaPlan,
} from "@/lib/idea-core";

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
- "renk" #rrggbb biçiminde olmalı (örn. #35d6ff).
- "baslik" en fazla altı kelime olmalı, kullanıcının fikrini özetlemeli.
- "onerilenKatkiPuani" 1 ile 100 arasında bir tam sayı olmalı; fikrin netliği ve kapsamına göre öner.
- "tema" fikri iki-üç kelimeyle özetleyen kısa bir etiket olmalı.
- "uygunMu": metin saldırgan/nefret söylemi, taciz, açık kişisel veri (telefon,
  adres, TC kimlik no vb.) veya spam/anlamsız içerik barındırıyorsa false,
  aksi hâlde true olmalı. false olsa bile şemanın geri kalanını yine de,
  makul bir tahminle, eksiksiz doldur.

Her durumda şemaya tam uyan bir çıktı üret; içeriği reddetme veya boş bırakma,
yalnızca sınıflandır — nihai karar "uygunMu" alanına yansır.`;

// gemini-2.5-flash yeni kullanıcılara kapatıldı (Google API'sinin canlı hata
// mesajıyla doğrulandı); güncel hızlı model olarak gemini-3.6-flash kullanılır.
const DEFAULT_MODEL = "gemini-3.6-flash";

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
        schema: aiIdeaPlanSchema,
        system: SYSTEM_PROMPT,
        prompt: text,
        // Şema artık sadece sınıflandırma istediği için gerçek üretim ~2-3sn
        // sürüyor; 30sn'lik pay, ücretsiz katmanın kota/hız sınırına takılıp
        // AI SDK'nin dahili backoff ile tekrar denediği (nadir) durumlar içindir.
        abortSignal: AbortSignal.timeout(30_000),
        providerOptions: {
          // Bu sınıflandırma/planlama görevi için derin "thinking" gerekmiyor;
          // düşük seviye tutmak gecikmeyi ciddi ölçüde azaltıyor (bkz. Sprint 6 notları).
          google: { thinkingConfig: { thinkingLevel: "low" } },
        },
      });
      // 3B koordinat listesi ("yapilar") modelden istenmiyor — bu mekanik bir
      // üretim görevi ve model bunu güvenilir üretemiyordu (bkz. idea-core.ts
      // > aiIdeaPlanSchema yorumu). Aynı deterministik üreticiyle eklenir;
      // modelin katkısı yalnızca sınıflandırma kısmıdır.
      const plan: IdeaPlan = { ...object, yapilar: generateStructurePoints(hashText(text)) };
      return { plan, source: "ai" };
    } catch (error) {
      console.error("[idea-core] AI analizi başarısız, deterministik plana geçiliyor:", error);
      return { plan: fallbackPlan(text), source: "fallback" };
    }
  });
