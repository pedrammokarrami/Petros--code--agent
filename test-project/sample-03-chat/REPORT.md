# گزارش نمونه ۰۳ — ساخته‌ی خود کدگر (بدون هیچ کلید API)

## سازنده
100٪ خروجی موتور AgentRuntime کدگر از مسیر `POST /api/tasks` با استخر free بدون کلید.
تسک‌ها در `GET /api/tasks` قابل مشاهده‌اند (c7y8a و بعدی‌ها). هیچ فایلی دستی نوشته نشده.

## فایل‌ها (test-project/sample-03-chat)
- `server.js` — Express + Socket.io روی 4103: اتاق‌های public/programming/design، تاریخچه در حافظه، presence، typing، آپلود multer (8 مگ)، پوش mock
- `package.json` — express, cors, socket.io, multer (نصب تمیز، 107 پکیج)
- `public/index.html` — فارسی راست‌چین، ورود با نام + انتخاب اتاق، 3 اسکریپت
- `public/app.js` — join، تاریخچه، ارسال، تایپینگ (ارسال+نمایش)، presence
- `public/upload.js` — آپلود واقعی با FormData
- `public/styles.css` — تم تیره ریسپانسیو

## تست زنده (2026-10-14، پورت 4103)
- `npm install` ✅ (یک‌بار نسخه multer خراب بود، خود کدگر درستش کرد)
- `node server.js` ✅ — بدون کرش
- `GET /api/rooms` ✅ → ["public","programming","design"]
- صفحه اصلی ✅ (title=Chat)
- `POST /api/push/send` ✅
- `POST /api/upload` ✅ → filename برگشت
- سوکت realtime: سارا فرستاد → پدرام 4ms بعد گرفت ✅
- `presence` ✅ و `GET /api/history/public` → 1 پیام (ذخیره واقعی) ✅

## باگ‌های واقعی که حین ساخت پیدا و درست شد
1. موفقیت فیک بدون کلید (completed با صفر فایل) → حالا fallback واقعاً می‌سازد یا failed صادقانه می‌دهد
2. خروجی JSON مدل پارس نمی‌شد → پروتکل === FILE: ===
3. قطع شدن فایل‌ها (سقف خروجی tier رایگان) → حد 4 فایل/250 خط و تک‌فایل در هر تسک
4. مدل فایل‌های نامرتبط بازنویسی می‌کرد → قانون ONLY-named-files در system prompt
5. نسخه نامعتبر multer → خود کدگر اصلاح کرد
6. ناسازگاری آی‌دی‌ها بین index و app → با قرارداد دقیق آیدی‌ها درست شد

## محدودیت‌های صادقانه
- سهمیه ناشناس free(provider) پنجره‌ای است: گاهی 402/empty → backoff تا 45s×5 و retry
- کیفیت مدل free در حد نمونه کوچک است، نه اپ production
- روترهای OmniRoute/9Router/VansRouter در کدگر состоянию فعلی mock/flag هستند؛ بک‌اند واقعی free همین freePool است
