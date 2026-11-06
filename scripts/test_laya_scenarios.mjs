const scenarios = [
  { id: 'ecommerce', title: 'AI E-Commerce', prompt: 'من قصد دارم یک پلتفرم تجارت الکترونیک مبتنی بر هوش مصنوعی برای بهینه‌سازی زنجیره تأمین و قیمت‌گذاری خودکار راه‌اندازی کنم.' },
  { id: 'healthcare', title: 'Healthcare Logistics', prompt: 'ایده من ایجاد یک شبکه لجستیک و توزیع هوشمند دارو با رعایت زنجیره سرد و رهگیری آنلاین برای داروخانه‌ها و بیمارستان‌هاست.' },
  { id: 'saas', title: 'Financial SaaS CRM', prompt: 'ما می‌خواهیم یک نرم‌افزار ابری (SaaS) مدیریت ارتباط با مشتریان تخصصی برای شرکت‌های خدمات مالی ایجاد کنیم.' },
  { id: 'agency', title: 'Digital Marketing Agency', prompt: 'برنامه من راه‌اندازی یک آژانس بازاریابی دیجیتال مبتنی بر اتوماسیون هوش مصنوعی در شبکه‌های اجتماعی است.' },
  { id: 'iot_hardware', title: 'IoT Clean Air Hardware', prompt: 'استارتاپ ما تولید دستگاه‌های سخت‌افزاری هوشمند پایش کیفیت هوا و سنسورهای اینترنت اشیاء برای منازل است.' }
];

async function testAllScenarios() {
  console.log('--- Testing 5 Laya Business Scenarios ---');
  const results = {};
  for (const sc of scenarios) {
    const t0 = Date.now();
    try {
      const res = await fetch('http://127.0.0.1:3000/api/agent/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sc.prompt })
      });
      const data = await res.json();
      const dt = Date.now() - t0;
      const text = data.text || '';
      console.log(`[${sc.id}] HTTP ${res.status} (${dt}ms) -> Response length: ${text.length} chars`);
      console.log(`   Preview: ${text.substring(0, 140).replace(/\r?\n|\r/g, ' ')}...`);
      results[sc.id] = {
        title: sc.title,
        status: res.status,
        durationMs: dt,
        charCount: text.length,
        hasPersianResponse: /[\u0600-\u06FF]/.test(text),
        sample: text.substring(0, 300)
      };
    } catch(err) {
      console.error(`[${sc.id}] ERROR: ${err.message}`);
      results[sc.id] = { title: sc.title, error: err.message };
    }
  }
  return results;
}

testAllScenarios();
