/**
 * Gerçek zamanlı senkronizasyon — istemci tarafı abone.
 *
 * `pusher-server.ts`'in yayınladığı olaya websocket üzerinden abone olur;
 * bir fikir/katkı değiştiğinde `onUpdate` neredeyse anında (genelde <1sn)
 * tetiklenir. VITE_PUSHER_KEY tanımlı değilse tamamen no-op'tur — çağıran
 * bileşen periyodik yenilemeye (bkz. IdeasBrowser.tsx FALLBACK_POLL_MS)
 * güvenmeye devam eder.
 */

import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";

const MEYDAN_CHANNEL = "meydan";
const IDEAS_UPDATED_EVENT = "ideas-updated";

export function useMeydanRealtime(onUpdate: () => void): boolean {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const key = import.meta.env["VITE_PUSHER_KEY"] as string | undefined;
    const cluster = import.meta.env["VITE_PUSHER_CLUSTER"] as string | undefined;
    if (!key || !cluster) return;

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(MEYDAN_CHANNEL);
    channel.bind(IDEAS_UPDATED_EVENT, () => onUpdateRef.current());
    pusher.connection.bind("connected", () => setConnected(true));
    pusher.connection.bind("disconnected", () => setConnected(false));

    return () => {
      channel.unbind(IDEAS_UPDATED_EVENT);
      pusher.unsubscribe(MEYDAN_CHANNEL);
      pusher.disconnect();
    };
  }, []);

  return connected;
}
