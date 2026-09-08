# Meydan — içine gir.

## Takım İsmi

**KAYALAR**

## Ürün İle İlgili Bilgiler

### Yarışma

TEKNOFEST NSosyal İnovasyon Yarışması

### Ürün İsmi

**Meydan**

### Ürün Açıklaması

Bugünkü sosyal platformlarda bir fikir paylaşılır, beğeni/yorum alır ve kaybolur gider — hiçbir zaman somut bir sonuca evrilmez. Fikir sahibi de, onu geliştirmek isteyenler de birbirini bulamaz.

**Meydan**, paylaşılan fikirlerin gerçek bir gelişim sürecinden geçtiği ve bu sürecin 3B, herkesin **aynı anda birlikte bulunduğu tek bir ortak dünyada** görselleştiği bir platform vizyonuyla yola çıkar — yapay zekânın herkese ayrı, izole bir dünya ürettiği bir sistem değil. Bir fikir, merkezdeki meydandan açılan sabit bir hat üzerinde ilerler: **Fikir → Tasarım → Üretim → Topluluk → Pazar → Başarı**.

| # | Bölge | Ne işe yarar |
|---|-------|---------------|
| 1 | **Fikir** | Fikir paylaşılır, Fikir Çekirdeği analiz edip yönlendirir |
| 2 | **Tasarım** | İsteyen kullanıcılar fikre katkı/geliştirme önerisi sunar, sahibi onaylar |
| 3 | **Üretim** | Onaylanan tasarım somut bir ürüne/prototipe dönüşür |
| 4 | **Topluluk** | Geri bildirim alınır, tartışılır, iyileştirilir |
| 5 | **Pazar** | Ürün paylaşılır, gerçek değer kazanmaya başlar |
| 6 | **Başarı** | Fikir sahibi + tüm katkı verenler Katkı Puanı (KP) ile ödüllenir |

Fikrin sahibi her aşamada sahip kalır; katkı verenler kendi KP'sini kendi emeğiyle kazanır. Bu akışın 3B dünya karşılığı bugün itibarıyla **gezilebilir** durumda; **fikir gönderimi, AI Fikir Çekirdeği'nin bölge yönlendirmesi, katkı/onay akışı ve kalıcı Katkı Puanı defteri artık gerçek** (bkz. [Sprint 4](#sprint-4) ve [Sprint 5](#sprint-5)). Gerçek bir kimlik doğrulama (NSosyal ile SSO) ve tam kapsamlı moderasyon ise henüz koda bağlanmamış, aşağıdaki [Sonraki Adımlar](#sonraki-adımlar) bölümünde planlanan işlevlerdir.

<p align="center">
  <img src="docs/ada_genel_gorunum.png" alt="Meydan — ada genel görünümü, 6 bölge ve merkez çekirdek" width="100%" />
</p>
<p align="center"><sub>Görseller, projenin gerçekten çalıştırılan 3B ortamından alınmıştır.</sub></p>

### Ürün Özellikleri

- Merkezdeki hologram **Fikir Çekirdeği** etrafında kurulu, 6 sabit bölgeye (Fikir, Tasarım, Üretim, Topluluk, Pazar, Başarı) ayrılmış tek parça voxel dünya
- Şehirde gezdirilebilen bir karakter: joystick ile yürüme, kamera `OrbitControls` ile sürükle-döndür/yakınlaştır
- **İstanbul saatine göre gerçek zamanlı gündüz/gece döngüsü** — gökyüzü, ışıklandırma ve çekirdek parıltısı saatle birlikte değişir
- Çekirdeğin canlı durum göstergesi (`Dinliyor` / `Analiz ediyor`) ve NSOSYAL bilgi paneli
- `EffectComposer` + `UnrealBloomPass` ile ışık hüzmeleri ve gece parıltısı
- **"Fikrini Paylaş" paneli:** serbest metni AI Fikir Çekirdeği'ne gönderir; çekirdek fikri altı bölgeden birine yönlendirir, bir başlık/tema/renk ve önerilen Katkı Puanı üretir, sonuç doğru bölgenin üstünde beliren bir hologram katkı yapısı olarak 3B dünyaya işlenir ve kalıcı deftere kaydedilir
- **"Fikirler & Katkılar" paneli:** paylaşılan tüm fikirleri listeler; başkasının fikrine katkı sunabilir, kendi fikrine gelen katkıları onaylayıp/reddedebilirsin — onaylanan katkı, katkı verene KP kazandırır ve fikri bir sonraki bölgeye ilerletir
- **Liderlik tablosu:** onaylanan katkılara göre toplam Katkı Puanı sıralaması
- Herkesin aynı anda birlikte bulunduğu tek bir ortak 3B dünya: fikirler/katkılar kalıcı bir veritabanında yaşar, tüm kullanıcılar aynı veriye bakar (periyodik yenileme ile senkronize; gerçek zamanlı anlık iletim [Sonraki Adımlar](#sonraki-adımlar)'da)

### Farkımız

Bugünkü sosyal platformların büyük çoğunluğunda bir fikir paylaşılır, tepki alır ve unutulur. Meydan'ı farklı kılan dört temel nokta:

| | Klasik Sosyal Platformlar | Meydan |
|---|---|---|
| **Fikrin Akıbeti** | Beğeni/yorum alır, sonra kaybolur gider; somut bir sonuca evrilmez. | Sabit 6 aşamalı bir süreçte (Fikir → Tasarım → Üretim → Topluluk → Pazar → Başarı) somut ürüne evrilir. |
| **Dünya Yapısı** | Her kullanıcıya ayrı, izole bir akış/feed sunulur. | Herkesin **aynı anda birlikte bulunduğu** tek bir ortak 3B dünya; yapay zekâ herkese ayrı bir dünya üretmez. |
| **Katkı Sahipliği** | Kim neye ne kadar katkı sundu belirsizdir. | Katkı Puanı (KP) ile her katkı verenin emeği şeffaf ve ölçülebilir şekilde kayıt altına alınır. |
| **Süreç Şeffaflığı** | Fikir bir kez paylaşılır, sonraki süreç görünmezdir. | Fikrin bölgeden bölgeye ilerleyişi 3B ortamda ışık hatlarıyla canlı olarak izlenebilir. |

### Hedef Kitle

- Fikir sahibi bireyler ve girişimciler
- Ürün geliştirmeye katkı sunmak isteyen tasarımcı/mühendisler
- Sosyal inovasyon topluluğu
- Öğrenci girişim ekipleri
- Fikirlerin geliştirilme sürecini takip etmek isteyen mentor ve yatırımcılar

### Sprint Takibi

Görevler [Issues](../../issues) üzerinde, [Milestones](../../milestones) ile sprint bazlı takip edilir. Etiketler: `sprint`, `3d-dünya`, `karakter`, `ai-katmanı`, `rapor`.

---

## Sprint 1

### Sprint 1 Notları

Sprint 1 kapsamında ürün fikrinin netleştirilmesi, 6 bölgelik akış mimarisinin tasarlanması ve 3B dünyanın temel iskeletinin (proje kurulumu, sahne/kamera/ışıklandırma) kurulması hedeflenmiştir.

### Sprint 1 Goal

Sprint 1'in hedefi; TanStack Start + Three.js tabanlı proje iskeletini kurmak, temel voxel sahne render hattını (kamera, ışıklandırma, `OrbitControls`) çalışır hâle getirmek ve 6 bölgenin yerleşim planını netleştirmektir.

### Sprint 1 İçin Seçilen Görevler

**To-do**
- Karakter hareketi ve joystick entegrasyonunun tasarlanması
- İstanbul saatine göre gündüz/gece mantığının planlanması

**In Progress**
- 6 bölgenin (Fikir, Tasarım, Üretim, Topluluk, Pazar, Başarı) voxel yerleşim planının çıkarılması
- Merkez hologram çekirdeğin ilk taslağı

**Complete**
- GitHub repository açılması
- TanStack Start (React 19 + Vite + Nitro) proje iskeleti
- Tailwind CSS v4 + Radix UI (shadcn tabanlı) ile temel arayüz bileşenleri
- Three.js temel sahne kurulumu: kamera, ışıklandırma, `OrbitControls`

### Sprint 1 Ürün Durumu

Sprint 1 sonunda proje iskeleti ve temel 3B sahne render hattı kurulmuştur. 6 bölgenin yerleşim planı netleşmiş, ancak henüz tüm bölgeler voxel olarak inşa edilmemiştir; asıl amaç Sprint 2'de tüm dünyayı inşa etmek için gerekli altyapıyı hazırlamaktır.

### Sprint 1 Review

Sprint 1 boyunca yapılan işler değerlendirilmiştir. Proje iskeletinin ve temel render hattının kurulması olumlu bulunmuştur. Karakter hareketi ve gündüz/gece mantığının Sprint 2'ye taşınmasına karar verilmiştir.

Alınan kararlar:
- 6 bölgenin sabit konumlarda kalmasına, merkezdeki çekirdeğe ışık hatlarıyla bağlanmasına karar verilmiştir.
- Sprint 2'de tüm bölgelerin voxel olarak inşa edilmesine ve karakter/joystick entegrasyonuna odaklanılması kararlaştırılmıştır.

### Sprint 1 Retrospective

İlk sprintte sahne/render mimarisine beklenenden fazla zaman ayrıldığı, bunun karşılığında Sprint 2'nin daha hızlı ilerlemesi için sağlam bir temel oluştuğu değerlendirilmiştir.

Alınan kararlar:
- Sahne/render mimarisi erken sprintte sağlamlaştırılmalı, sonraki sprintler bunun üzerine katman eklemelidir.
- Her bölge için görev sorumluluğu net şekilde ayrılmalıdır.

---

## Sprint 2

### Sprint 2 Notları

Sprint 1'de kurulan render hattı üzerine, Sprint 2 kapsamında **6 bölgenin tamamının voxel olarak inşası**, karakter/joystick ile gezinme ve İstanbul saatine göre gündüz/gece döngüsüne odaklanılmıştır.

### Sprint 2 Goal

Sprint 2'nin hedefi; 6 bölgenin (özellikle Üretim ve Topluluk) voxel dünyada somut karşılıklarını inşa etmek, karakteri joystick ile şehirde gezdirilebilir hâle getirmek ve gerçek zamanlı gündüz/gece döngüsünü çalıştırmaktır.

### Sprint 2'de Ele Alınan Görevler

**To-do**
- Fikir paylaşım formunun arayüz taslağı

**In Progress**
- NPC'lerin bölgelere yerleştirilmesi ve sahneye canlılık katılması

**Complete**
- **Üretim** ve **Topluluk** bölgelerinin voxel olarak inşası
- Karakter hareketi ve `Joystick` bileşeniyle gezinme
- İstanbul saatine göre gerçek zamanlı gündüz/gece döngüsü
- Merkez hologram çekirdeğin (Fikir Çekirdeği) sahneye entegrasyonu

### Sprint 2 Ürün Durumu

Sprint 2 sonunda Üretim ve Topluluk bölgeleri, merkez çekirdeğe ışık hatlarıyla bağlı, kendi voxel yerleşimine sahip gezilebilir 3B alanlar hâline gelmiştir. Karakter joystick ile şehirde dolaştırılabilmekte, gündüz/gece döngüsü İstanbul saatine göre gerçek zamanlı işlemektedir.

#### Sprint 2 Ürün Görselleri

<table>
  <tr>
    <td width="50%">
      <img src="docs/uretim_bolgesi.png" alt="Üretim bölgesi — üretim hattı ve robotik kollar" width="100%" />
      <p align="center"><b>Üretim</b><br/><sub>Bölgenin voxel dünyadaki somut karşılığı</sub></p>
    </td>
    <td width="50%">
      <img src="docs/topluluk_cekirdegi.png" alt="Topluluk bölgesi — merkez çekirdek ve bağlantı hatları" width="100%" />
      <p align="center"><b>Topluluk</b><br/><sub>Merkez çekirdeğe ışık hatlarıyla bağlı bölge</sub></p>
    </td>
  </tr>
</table>

### Sprint 2 Review

Sprint 2 sonunda ekip, Üretim ve Topluluk bölgelerinin somut 3B karşılıklarını ve karakter gezinme deneyimini birlikte değerlendirmiştir. Sprint 1'de hedeflenen "render altyapısı" hedefinin ötesine geçilerek, dünyanın gezilebilir hâle geldiği görülmüştür.

Alınan kararlar:
- Bölgeler arası ışık hattı efektinin dünyayı bir bütün olarak okunabilir kıldığı olumlu bulunmuş, Sprint 3'te kalan bölgelere (Pazar) ve genel görsel cilaya odaklanılmasına karar verilmiştir.
- Fikir paylaşımı gibi veri gerektiren özelliklerin, dünya tamamlandıktan sonraki bir aşamaya bırakılmasına karar verilmiştir.

### Sprint 2 Retrospective

Bölge bazlı görev dağılımının (her bölge = bağımsız bir voxel alan) paralel çalışmayı kolaylaştırdığı görülmüştür. Karakter/joystick entegrasyonunun sahne mimarisiyle uyumlu ilerlediği değerlendirilmiştir.

Alınan kararlar:
- Görsel/dünya işleri ile veri/backend işleri net şekilde ayrılmalı, karıştırılmamalıdır.
- Her bölgenin voxel inşası bittiğinde ekip içi kısa bir gözden geçirme yapılmalıdır.

---

## Sprint 3

### Sprint 3 Notları

Sprint 2 sonunda dünyanın büyük kısmı gezilebilir hâle gelmişti; Sprint 3 kapsamında **Pazar** bölgesinin voxel inşası tamamlanmış, ayrıca dünyanın genel görsel cilasına (bloom efektleri, gece ışıklandırması, çekirdek durum animasyonu) odaklanılmıştır.

### Sprint 3 Goal

Sprint 3'ün hedefi; **Pazar** bölgesinin voxel dünyada inşa edilmesi, `EffectComposer` + `UnrealBloomPass` ile görsel cilanın tamamlanması, çekirdeğin canlı durum göstergesinin (`Dinliyor` / `Analiz ediyor`) arayüze eklenmesi ve dünyanın sunuma hazır hâle getirilmesidir.

### Sprint 3'te Tamamlanan İşler

**Done**
- **Pazar** bölgesinin meydan çevresinde voxel olarak inşası
- `EffectComposer` + `UnrealBloomPass` ile ışık hüzmeleri ve gece parıltısı
- Çekirdeğin canlı durum göstergesi (`Dinliyor` / `Analiz ediyor`) — şu an istemci tarafında simüle edilen bir görsel/metin döngüsü
- Uçtan uca TypeScript tip güvenliği taraması

**Devam Eden**
- **Başarı** bölgesinin KP ödüllendirme ekranıyla detaylandırılması
- Sunum/rapor hazırlığı

### Sprint 3 Ürün Durumu

Sprint 3 sonunda dünya, uçtan uca gezilebilir, gündüz/gece döngüsüne ve görsel cilaya sahip bir prototip hâline gelmiştir. Pazar bölgesi meydan çevresinde voxel yerleşimiyle görselleştirilmiş, çekirdeğin durum göstergesi arayüze eklenmiştir. Fikir paylaşımı, onay akışı ve KP hesaplaması bu aşamada henüz gerçek bir veri katmanına bağlı değildir (bkz. [Sonraki Adımlar](#sonraki-adımlar)).

#### Sprint 3 Ürün Görselleri

<table>
  <tr>
    <td width="50%">
      <img src="docs/pazar_bolgesi.png" alt="Pazar bölgesi — meydan çevresinde birim yerleşimi" width="100%" />
      <p align="center"><b>Pazar</b><br/><sub>Meydan çevresinde voxel olarak inşa edilen bölge</sub></p>
    </td>
    <td width="50%">
      <img src="docs/ada_gece_gorunum.png" alt="Meydan — gece modunda ada genel görünümü, bloom efektleri" width="100%" />
      <p align="center"><b>Gece Modu</b><br/><sub>Gündüz/gece döngüsü ve bloom cilasıyla tamamlanan dünya</sub></p>
    </td>
  </tr>
</table>

### Sprint 3 Review

Sprint 3 sonunda ekip, tamamlanan dünyayı uçtan uca birlikte değerlendirmiştir. Sprint 2'de hedeflenen "dünyanın gezilebilir hâle gelmesi" hedefine ulaşılmış, bunun ötesinde görsel cila eklenerek dünya sunuma hazır bir aşamaya getirilmiştir.

Alınan kararlar:
- Fikir paylaşımı, onay akışı ve KP sisteminin gerçek bir veri katmanına bağlanmasının bir sonraki geliştirme döngüsüne bırakılmasına karar verilmiştir.
- Gündüz/gece döngüsünün ve çekirdek animasyonunun, sunumlarda dünyanın "canlı" hissettirilmesi için kullanılmasına karar verilmiştir.

### Sprint 3 Retrospective

Görsel dünyanın (6 bölge, gündüz/gece, bloom) veri katmanından (fikir paylaşımı, KP) önce tamamlanmasının, ürünü erken aşamada somut ve gösterilebilir kıldığı; ancak "Farkımız" bölümünde anlatılan katkı/onay/KP mekanizmalarının henüz gerçek işlevler olmadığı, bunun net şekilde belirtilmesi gerektiği değerlendirilmiştir.

Alınan kararlar:
- Ürünün iddia ettiği akışın (Fikir → Başarı) hangi adımlarının gerçekten kodda karşılığı olduğu README'de açıkça belirtilmelidir.
- Bir sonraki sprintte veri katmanına (fikir paylaşımı, onay akışı, KP) öncelik verilmelidir.

---

## Sprint 4

### Sprint 4 Notları

Sprint 3 sonunda tespit edilen en önemli boşluk, "Farkımız" bölümünde anlatılan AI Fikir Çekirdeği'nin gerçekte sadece görsel bir animasyon olmasıydı. Sprint 4 kapsamında bu boşluk kapatıldı: fikir gönderimi ve bölge yönlendirmesi artık uçtan uca çalışan, gerçek bir yapay zekâ katmanına bağlı.

### Sprint 4 Goal

Sprint 4'ün hedefi; teknik rapordaki AI akışını (serbest metin → yapılandırılmış, Zod ile doğrulanmış plan → voxel motoruna parametre) koda geçirmek, bunu bir arayüz paneliyle kullanıcıya açmak ve AI servisi kullanılamadığında oyunun asla kırılmamasını sağlayan deterministik bir yedek mekanizma kurmaktır.

### Sprint 4'te Tamamlanan İşler

**Done**
- `ideaPlanSchema` (Zod): bölge, tema, başlık (≤6 kelime), `#rrggbb` renk, önerilen Katkı Puanı ve 14-26 öğelik yapı listesini (8-88 yerel koordinat aralığında) doğrulayan şema
- `analyzeIdea` sunucu fonksiyonu (`createServerFn`): Vercel AI SDK'nın `generateObject`'i ve `@ai-sdk/google` sağlayıcısıyla gerçek bir Gemini modeline (`GOOGLE_GENERATIVE_AI_API_KEY` tanımlıysa) bağlanır; istemci paketine AI SDK kodu hiç dahil edilmez (build çıktısı ile doğrulandı)
- `fallbackPlan`: anahtar tanımlı değilse veya model çağrısı başarısız/zaman aşımına uğrarsa devreye giren, anahtar kelime tabanlı bölge tahmini yapan deterministik üretici — aynı metin her zaman aynı planı üretir
- `planToVoxels`: doğrulanmış planı, doğru bölgenin üstünde çatıların üzerinde süzülen bir hologram katkı yapısına (`Voxel[]`) çevirir; çakışma riski olmadan sahneye eklenir
- **"Fikrini Paylaş"** arayüz paneli (`IdeaSquare.tsx`): metin girişi, çekirdek durumu, sonuç kartı (bölge/tema/renk/KP) ve "yapay zekâ ile mi yoksa deterministik plan ile mi analiz edildi" şeffaflığı
- Sahneye dünyanın kamera/karakter durumunu bozmadan yeni katkı yapıları ekleyen ayrı bir React effect'i (`sceneRef` + `contributions`)

### Sprint 4 Ürün Durumu

Sprint 4 sonunda bir kullanıcı gerçekten fikrini yazıp gönderebiliyor; AI Fikir Çekirdeği (anahtar tanımlıysa Gemini, değilse deterministik plan) fikri analiz edip doğru bölgeye yönlendiriyor ve sonuç, o bölgenin üstünde beliren yeni bir hologram yapısı olarak 3B dünyaya işleniyor. Bu, `npm run build` çıktısında AI SDK kodunun yalnızca sunucu paketinde yer aldığı ve tarayıcıda üç ayrı fikir gönderiminin doğru bölge/renk/koordinatlarla sahneye eklendiği (konsol izleriyle) doğrulanmıştır. Katkı/onay akışı ve kalıcı bir KP defteri henüz bu kapsamda değildir.

### Sprint 4 Review

Sprint 4 sonunda ekip, artık gerçekten çalışan bir AI Fikir Çekirdeği'ni birlikte test etmiştir. Sprint 3'ün retrospective'inde alınan "iddia edilen ile kodda karşılığı olan net ayrılmalı" kararı doğrultusunda, README'deki ilgili bölümler de güncellenmiştir.

Alınan kararlar:
- Deterministik fallback'in varlığı, AI anahtarı olmadan da demo/jüri gösteriminin güvenilir şekilde yapılabilmesini sağladığı için kalıcı bir tasarım kararı olarak korunacaktır.
- Bir sonraki sprintte katkı/onay akışı ve kalıcı KP defterine öncelik verilmesine karar verilmiştir.

### Sprint 4 Retrospective

TanStack Start'ın import-protection kuralının `**/server/**` desenini dosya yoluna göre kör bir şekilde uyguladığı (içeriğin `createServerFn` olup olmadığına bakmaksızın) sprint içinde öğrenilen önemli bir teknik detaydır; sunucu fonksiyonları bu yüzden `src/lib/` altında, sıradan dosya adlarıyla tutulmuştur.

Alınan kararlar:
- Framework'e özgü konvansiyonlar (klasör adlandırma, import-protection kuralları) varsayılmadan önce gerçek bir build ile doğrulanmalıdır.
- Yeni bir dış servis entegrasyonu eklenirken, önce "servis yokken ne olur?" sorusunun cevabı (fallback) tasarlanmalıdır.

---

## Sprint 5

### Sprint 5 Notları

Sprint 4'ün retrospective'inde belirlenen öncelik doğrultusunda, Sprint 5 kapsamında katkı/onay akışı ve kalıcı Katkı Puanı (KP) defteri gerçek bir veritabanına bağlandı. Bu, "Farkımız" bölümünde anlatılan katkı sahipliği ve süreç şeffaflığı iddialarının artık koda karşılık gelmesini sağlar.

### Sprint 5 Goal

Sprint 5'in hedefi; fikirleri ve katkıları kalıcı olarak saklayan bir veri katmanı kurmak, fikir sahibinin gelen katkıları onaylayıp/reddedebildiği bir arayüz sunmak, onaylanan katkıların KP kazandırıp fikri bir sonraki bölgeye ilerletmesini sağlamak ve temel bir moderasyon/spam denetimi eklemektir.

### Sprint 5'te Tamamlanan İşler

**Done**
- Postgres şeması (`meydan_ideas`, `meydan_contributions`) — Vercel Postgres/Neon ile çalışacak şekilde `pg` istemcisiyle kuruldu (`src/lib/db.ts`, `src/lib/ideas-db.ts`)
- `saveIdea` / `listIdeas`: her fikir artık AI/fallback analizinden sonra kalıcı olarak kaydediliyor ve listelenebiliyor
- `proposeContribution` / `listContributions` / `decideContribution`: katkı sunma, fikir sahibinin görmesi ve onaylama/reddetme — onaylanan katkı katkı verene KP kazandırır, fikri `nextRegion` ile bir sonraki bölgeye ilerletir
- `getLeaderboard`: onaylanan katkılara göre toplam KP sıralaması
- **"Fikirler & Katkılar"** arayüz paneli (`IdeasBrowser.tsx`): fikirleri gezme, katkı sunma, kendi fikrine gelen katkıları onaylama/reddetme, liderlik tablosu — 15 saniyede bir kendini tazeler (basit çoklu kullanıcı senkronizasyonu)
- Kalıcı takma ad (`use-meydan-user.ts`, `localStorage`) — gerçek kimlik doğrulama olmadan "kim kimdir" sorusuna cevap veren, pilot ölçekte yeterli bir çözüm
- Temel moderasyon: `ideaPlanSchema`'ya eklenen `uygunMu` alanı (AI kullanılabiliyorsa modelin kendi sınıflandırması), fallback için basit spam/anlamsız-içerik denetimi (`looksLikeSpam`)

### Sprint 5 Ürün Durumu

Sprint 5 sonunda bir kullanıcı fikrini paylaşabiliyor, başka bir kullanıcı buna katkı sunabiliyor, fikir sahibi katkıyı onaylayabiliyor — onaylandığında katkı veren KP kazanıyor ve fikir gerçekten bir sonraki bölgeye ilerliyor (görsel bir simülasyon değil, veritabanındaki gerçek bir durum değişikliği). Bu akış, yerel bir Postgres'e karşı iki farklı takma adla (fikir sahibi / katkı veren) uçtan uca test edilmiştir: katkı sunma → onaylama → bölge ilerlemesi → liderlik tablosunda görünme, hepsi doğrulanmıştır. Gerçek zamanlı (websocket) senkronizasyon henüz bu kapsamda değildir (bkz. [Sonraki Adımlar](#sonraki-adımlar)).

**Sprint 5 sonrası ek doğrulama:** Gerçek bir Google AI Studio API anahtarıyla test edilirken, varsayılan model olarak seçilen `gemini-2.5-flash`'ın Google tarafından yeni kullanıcılara kapatıldığı ve `gemini-3.6-flash`'a geçilmesi gerektiği canlı olarak ortaya çıktı; varsayılan model buna göre güncellendi (teknik rapordaki `google/gemini-3.7-flash` tahmini, Gemini'nin 3.x nesline geçtiğini doğruladı). Aynı testte, uzun Türkçe kelimeler içeren bir fikir metninde `fallbackPlan`'ın ürettiği başlığın 60 karakter sınırını aşıp `saveIdea`'yı Zod hatasıyla başarısız kıldığı gerçek bir hata da yakalanıp düzeltildi. Bu düzeltmelerden sonra gerçek Gemini çağrısı `"YAPAY ZEKÂ İLE ANALİZ EDİLDİ"` kaynağıyla, anlamlı bir başlık/bölge/tema/KP üreterek uçtan uca doğrulanmıştır — AI Fikir Çekirdeği artık yalnızca doğru bağlanmış değil, gerçekten çalıştığı kanıtlanmış durumdadır.

### Sprint 5 Review

Sprint 5 sonunda ekip, katkı/onay akışının uçtan uca çalıştığını iki farklı kullanıcı kimliğiyle birlikte test etmiştir. Sprint 4'ün retrospective kararı (katkı/onay ve KP defterine öncelik) karşılanmıştır.

Alınan kararlar:
- Vercel Postgres/Neon bağlantısı olmadan da uygulamanın çökmemesi (anlaşılır bir hata gösterip 3B dünyanın çalışmaya devam etmesi) kalıcı bir tasarım kuralı olarak korunacaktır.
- Gerçek kimlik doğrulama (NSosyal SSO) gelene kadar takma ad tabanlı sahiplik modelinin pilot/demo amaçlı yeterli olduğu, ancak üretim sürümü için yetersiz olduğu not edilmiştir.

### Sprint 5 Retrospective

Veritabanı bağlantı dizesinin (`DATABASE_URL`) Vercel Postgres ile Neon'un serverless sürücüsü yerine standart `pg` istemcisiyle okunması, kodu hem yerel Postgres'e hem Vercel'e karşı aynı şekilde çalışır kıldı — bu, bir önceki sprintin "framework'e özgü konvansiyonlar doğrulanmadan varsayılmamalı" dersinin bir uzantısı olarak, mümkün olduğunda standart/taşınabilir arayüzlerin tercih edilmesi gerektiğini gösterdi.

Alınan kararlar:
- Yeni bir veri katmanı eklenirken, sağlayıcıya özel SDK'lar yerine önce standart protokolün (burada düz Postgres bağlantısı) yeterli olup olmadığı değerlendirilmelidir.
- Sahiplik/onay gibi yetki gerektiren her sunucu fonksiyonunda, yetki kontrolü (burada `ownerName` eşleşmesi) istemciye değil sunucuya konulmalıdır.

---

## Kullanılan Teknolojiler ve Mimari

### Klasörler

- `src/routes/` — TanStack Start dosya tabanlı route'lar (şu an tek route: `/`)
- `src/components/` — `IdeaSquare.tsx` (ana 3B sahne bileşeni + "Fikrini Paylaş" paneli), `IdeasBrowser.tsx` ("Fikirler & Katkılar" paneli, liderlik tablosu), `Joystick.tsx` (karakter kontrolü), `ui/` (shadcn tabanlı arayüz bileşenleri)
- `src/lib/` — `voxel-world.ts` (voxel dünya üretimi: 6 bölge, çekirdek, NPC'ler), `istanbul-time.ts` (gündüz/gece saat mantığı), `seascape.ts` (ada çevresindeki deniz), `idea-core.ts` (Zod şeması, deterministik fallback, plan→voxel dönüşümü — izomorfik), `idea-core-ai.ts` (AI Fikir Çekirdeği'nin `createServerFn` sunucu fonksiyonu), `db.ts` (paylaşılan Postgres bağlantı havuzu), `ideas-db.ts` (fikir/katkı/KP `createServerFn`'leri — bunlar da sunucuda çalışır), `use-meydan-user.ts` (kalıcı takma ad hook'u)

### Mimari Genel Bakış

```
┌──────────────────────────────┐        analyzeIdea()        ┌──────────────────────────────┐
│  TanStack Start (SSR kabuk)   │  ───────────────────────────▶│  idea-core-ai.ts (sunucu)      │
│  src/routes/index.tsx          │      RPC (createServerFn)    │  generateObject + google()     │
└───────────────┬────────────────┘                              │  → ideaPlanSchema (Zod)        │
                │ render                                        └───────────────┬────────────────┘
                ▼                                                                │ başarısız/anahtar yok
┌──────────────────────────────────────────────┐                                ▼
│  IdeaSquare.tsx — Three.js sahnesi             │                 ┌────────────────────────────┐
│  OrbitControls · EffectComposer+UnrealBloom    │◀── contribution ─│  idea-core.ts: fallbackPlan  │
│  "Fikrini Paylaş" paneli                       │   (planToVoxels) │  (izomorfik, deterministik)  │
└───────┬─────────────────┬──────────────┬──────┘                 └────────────────────────────┘
        │                 │              │
        ▼                 ▼              ▼
 voxel-world.ts     istanbul-time.ts   Joystick.tsx
 6 bölge + çekirdek   gündüz/gece        karakter
 + NPC üretimi          saat mantığı      girdisi

┌───────────────────────────────┐   saveIdea / listIdeas / propose-      ┌───────────────────────────┐
│  IdeasBrowser.tsx               │   Contribution / decideContribution   │  ideas-db.ts (sunucu)      │
│  Fikirler · Katkı Sun · Onayla  │ ─────────────────────────────────────▶│  db.ts (pg Pool)           │
│  · Liderlik Tablosu · 15sn poll │◀────────────────────────────────────  │  → Vercel Postgres / Neon  │
└───────────────────────────────┘        IdeaRecord[] / KP sıralaması    └───────────────────────────┘
```

`voxel-world.ts`, 6 bölgeyi (`REGIONS`: Fikir, Tasarım, Üretim, Topluluk, Pazar, Başarı) ve merkezdeki hologram çekirdeği (`buildCore`) prosedürel olarak üretir; `IdeaSquare.tsx` bu veriyi Three.js sahnesine render eder, `istanbul-time.ts`'den gelen saate göre gündüz/gece geçişini uygular ve `Joystick.tsx` üzerinden gelen girdiyle karakteri hareket ettirir. Kullanıcı bir fikir gönderdiğinde `analyzeIdea` sunucu fonksiyonu çağrılır; sonuç (AI'dan ya da fallback'ten) hem `planToVoxels` ile bölgenin üstünde süzülen bir hologram katkı yapısına çevrilip sahneye eklenir, hem de `saveIdea` ile kalıcı deftere kaydedilir. `IdeasBrowser.tsx`, `ideas-db.ts` üzerinden fikirleri/katkıları okur ve yazar; bir katkı onaylandığında fikrin bölgesi `nextRegion` ile ilerler ve katkı veren KP kazanır.

### İstemci

- **TanStack Start** (React 19 + Vite + Nitro) — SSR uygulama kabuğu
- **Three.js** — prosedürel voxel dünya üretimi, `OrbitControls`, `EffectComposer` + `UnrealBloomPass`
- **Tailwind CSS v4 + Radix UI** (shadcn tabanlı) — arayüz bileşenleri
- **TypeScript** — uçtan uca tip güvenliği

### Yapay Zekâ Katmanı (Sprint 4)

- **Vercel AI SDK (`generateObject`) + `@ai-sdk/google`** — `GOOGLE_GENERATIVE_AI_API_KEY` tanımlıysa gerçek bir Gemini modeline (`gemini-3.6-flash`, `MEYDAN_GEMINI_MODEL` ile değiştirilebilir) bağlanır; gerçek bir anahtarla uçtan uca test edilmiştir
- **Zod (`ideaPlanSchema`)** — model çıktısını bölge/tema/başlık/renk/KP/yapı listesi şemasına zorlar; şema dışı çıktı asla oyun motoruna parametre olamaz
- **Deterministik `fallbackPlan`** — anahtar tanımlı değilse veya çağrı başarısız/zaman aşımına uğrarsa devreye girer; anahtar kelime tabanlı bölge tahmini yapar, aynı metin için her zaman aynı planı üretir
- Çekirdeğin `Dinliyor` / `Analiz ediyor` ambiyans döngüsü hâlâ görsel bir animasyondur; "Fikrini Paylaş" panelindeki analiz ise artık gerçek bir sunucu çağrısıdır (AI ya da fallback kaynağı arayüzde şeffafça belirtilir)

### Veri Katmanı (Sprint 5)

- **Postgres** (`pg` istemcisi, Vercel Postgres/Neon uyumlu) — `meydan_ideas` ve `meydan_contributions` tabloları; ilk çağrıda şema otomatik oluşturulur (`ensureSchema`)
- **Katkı/onay akışı** — `proposeContribution` bir katkıyı `pending` olarak kaydeder; `decideContribution` yalnızca fikrin `owner_name`'iyle eşleşen isteklere onay/red izni verir (sunucu tarafında doğrulanır, istemciye güvenilmez)
- **KP defteri ve bölge ilerlemesi** — onaylanan her katkı, katkı verene KP kazandırır ve fikri `nextRegion` ile bir sonraki bölgeye taşır; `getLeaderboard` bunları toplam KP'ye göre sıralar
- **Basit çoklu kullanıcı senkronizasyonu** — `IdeasBrowser` açıkken 15 saniyede bir kendini tazeler; gerçek zamanlı (websocket/anlık) senkronizasyon henüz yok
- Veritabanı bağlantısı tanımlı değilse "Fikirler & Katkılar" paneli anlaşılır bir hata gösterir; 3B dünya ve AI Fikir Çekirdeği bundan etkilenmez

## Sonraki Adımlar

- Gerçek kimlik doğrulama (NSosyal ile SSO) — şu an yalnızca tarayıcı başına kalıcı bir takma ad var, gerçek bir hesap sistemi değil
- Gerçek Gemini anahtarının üretim ortamına (Vercel) eklenmesi — yerel olarak uçtan uca doğrulandı, ancak canlı dağıtımda henüz `GOOGLE_GENERATIVE_AI_API_KEY` tanımlı değil
- Tam kapsamlı içerik moderasyonu (şu an yalnızca temel spam denetimi ve AI'nin kendi `uygunMu` sınıflandırması var; insan incelemesi/itiraz akışı yok)
- Gerçek zamanlı (websocket tabanlı) çoklu kullanıcı senkronizasyonu — periyodik yenilemenin yerini alacak

## Kurulum

```bash
git clone https://github.com/kayabetul744/KAYALARR-MEYDAN.git
cd KAYALARR-MEYDAN
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build      # üretim derlemesi
npm run preview    # üretim derlemesini yerelde önizleme
npm run lint        # ESLint
npm run format       # Prettier
```

Katkı/onay akışı ve KP defteri için bir Postgres bağlantısı gerekir (`.env.example`'a bakın): Vercel'de proje panelinden bir Postgres (Neon) storage eklediğinizde `POSTGRES_URL` otomatik enjekte edilir; yerelde kendi Postgres'inizin bağlantı dizesini `DATABASE_URL` olarak `.env` dosyanıza girin. Tanımlı değilse 3B dünya ve AI Fikir Çekirdeği yine de çalışır, yalnızca "Fikirler & Katkılar" paneli bir hata gösterir.

## Ekip

KAYALAR — TEKNOFEST NSosyal İnovasyon Yarışması
