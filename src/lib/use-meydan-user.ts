import { useEffect, useState } from "react";

/**
 * Uygulamada gerçek bir kimlik doğrulama (NSosyal ile SSO) henüz yok (bkz.
 * README > Sonraki Adımlar). Bu, katkı/onay akışının "kim kimdir" sorusuna
 * cevap verebilmesi için tarayıcı başına kalıcı, basit bir takma ad —
 * yarışma/pilot topluluk ölçeğinde makul, gerçek bir kullanıcı sistemi değil.
 */
const STORAGE_KEY = "meydan_user_name";

export function useMeydanUser() {
  const [name, setNameState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setNameState(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      setNameState(null);
    } finally {
      setReady(true);
    }
  }, []);

  const setName = (value: string) => {
    const trimmed = value.trim().slice(0, 40);
    if (!trimmed) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      // localStorage kullanılamıyor olabilir (ör. gizli sekme); state yine de güncellenir.
    }
    setNameState(trimmed);
  };

  return { name, setName, ready };
}
