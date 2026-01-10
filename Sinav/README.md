# Eğitim Yönetim Sistemi (LMS) Kurulum Rehberi

Bu proje, Google Sheets ve Google Apps Script tabanlı, mobil uyumlu (iOS stili) bir eğitim yönetim ve sınav analiz sistemidir.

## 1. Google Sheets Kurulumu

Yeni bir Google E-Tablo oluşturun ve aşağıdaki 3 sayfayı (sekme) ekleyin. İsimlerin birebir aynı olması önemlidir.

### A. `Kullanicilar` Sayfası
Sütunlar (1. Satır):
`ID` | `AdSoyad` | `Rol` | `Sifre`

Örnek Veri:
- 101 | Ali Yılmaz | Öğrenci | 1234
- 999 | Zeynal Hoca | Öğretmen | admin

### B. `Sinavlar` Sayfası
Sütunlar (1. Satır):
`ID` | `Ad` | `Anahtar` | `Tarih` | `SonuclariGoster` | `Durum` | `SiralamaGoster` | `TekrarIzni`

Örnek Veri:
- MAT1 | Matematik Deneme | Matematik:ABCDE... | 01.01.2026 | Evet | Aktif | Evet | Hayır

### C. `Sonuclar` Sayfası
Sütunlar (1. Satır):
`Zaman` | `OgrenciAdi` | `SinavID` | `Detaylar` | `BasariYuzdesi`

*(Bu sayfa sistem tarafından otomatik doldurulacaktır)*

## 2. Google Apps Script Kurulumu

1. E-Tablonuzda **Uzantılar > Apps Script** menüsüne gidin.
2. `Code.gs` dosyasındaki içeriği kopyalayıp oradaki kod editörüne yapıştırın.
3. Kodun başındaki `SPREADSHEET_ID` kısmını kendi E-Tablo ID'niz ile güncelleyin.
4. **Dağıt (Deploy) > Yeni Dağıtım** diyerek:
   - Tür: **Web Uygulaması**
   - Yürüten: **Ben (Me)**
   - Erişim: **Herkes (Anyone)**
5. Size verilen **Web App URL**'sini kopyalayın.

## 3. Frontend Ayarları

1. `script.js` dosyasını açın.
2. En üstteki `API_URL` değişkenine kopyaladığınız Web App URL'sini yapıştırın.
3. `USE_MOCK_API = false` yaparak gerçek sistemi aktif hale getirin.

## Özellikler

- **Öğrenci Paneli:** Sınav listesi, online sınav olma (optik form), anlık karne grafiği.
- **Öğretmen Paneli:** Sınav ekleme, detaylı analiz (soru bazlı başarı matrisi), öğrenci yönetimi.
- **Telegram Entegrasyonu:** Her sınav bitiminde öğretmene anlık bildirim gider.
- **Puanlama:** 3 yanlış 1 doğruyu götürür (Net hesabı).

## Tasarım
Sistem "Mobile-First" prensibiyle iOS tasarım diline uygun hazırlanmıştır.

---
**Not:** Telegram Bot Token ve ID kod içerisinde tanımlıdır. Güvenlik için bu bilgileri kimseyle paylaşmayınız.
