/**
 * Gerçek zamanlı senkronizasyon — sunucu tarafı yayıncı.
 *
 * Vercel'in serverless fonksiyonları kalıcı websocket bağlantısını doğrudan
 * desteklemediği için (her istek ayrı, kısa ömürlü bir çalıştırma), gerçek
 * anlık senkronizasyon ancak ayrı bir pub/sub servisiyle mümkün: burada
 * Pusher Channels kullanılıyor. Sunucu, veri değiştiğinde (fikir/katkı
 * eklendi, karara bağlandı, bildirildi) Pusher'a REST üzerinden bir olay
 * yayınlar; istemciler (IdeasBrowser.tsx) o olaya websocket üzerinden abone
 * olur ve anında kendini tazeler.
 *
 * PUSHER_* değişkenleri tanımlı değilse tamamen sessiz no-op'a döner —
 * gerçek zamanlı özellik olmadan da katkı/KP sistemi periyodik yenilemeyle
 * (bkz. IdeasBrowser.tsx FALLBACK_POLL_MS) çalışmaya devam eder.
 */

import Pusher from "pusher";

let client: Pusher | null | undefined;

function getClient(): Pusher | null {
  if (client !== undefined) return client;
  const appId = process.env["PUSHER_APP_ID"];
  const key = process.env["PUSHER_KEY"];
  const secret = process.env["PUSHER_SECRET"];
  const cluster = process.env["PUSHER_CLUSTER"];
  if (!appId || !key || !secret || !cluster) {
    client = null;
    return client;
  }
  client = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return client;
}

export const MEYDAN_CHANNEL = "meydan";
export const IDEAS_UPDATED_EVENT = "ideas-updated";

/**
 * Fikir/katkı defterinde bir şey değiştiğinde çağrılır. Pusher yapılandırılmış
 * değilse veya yayın hatası (ağ, kota) olursa, çağıranı asla bloklamaz/hata
 * fırlatmaz — gerçek zamanlı bildirim en iyi çaba (best-effort) esasına
 * dayanır, kalıcı veri katkı/KP işlemi zaten kendi başına tamamlanmıştır.
 */
export function notifyIdeasChanged(): void {
  const pusher = getClient();
  if (!pusher) return;
  pusher.trigger(MEYDAN_CHANNEL, IDEAS_UPDATED_EVENT, {}).catch((error: unknown) => {
    console.error("[pusher] Bildirim gönderilemedi:", error);
  });
}
