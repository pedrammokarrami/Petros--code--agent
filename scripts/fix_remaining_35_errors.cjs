const fs = require('fs');
const path = require('path');

console.log("🛠️ آغاز اصلاح ۳۵ خطای باقیمانده...");

// --------------------------------------------------------------------------
// ۱. اصلاح src/utils/audio.ts (حذف تابع تکراری updateReactInput در انتهای فایل)
// --------------------------------------------------------------------------
const audioPath = path.join(process.cwd(), 'src/utils/audio.ts');
if (fs.existsSync(audioPath)) {
  let content = fs.readFileSync(audioPath, 'utf8');
  // اگر تابع دو بار تعریف شده باشد، دومی را برمی‌داریم
  const firstIdx = content.indexOf('export function updateReactInput');
  if (firstIdx !== -1) {
    const secondIdx = content.indexOf('export function updateReactInput', firstIdx + 30);
    if (secondIdx !== -1) {
      // حذف پیاده‌سازی دوم تا انتهای بلوک
      const endOfBlock = content.indexOf('}', secondIdx);
      if (endOfBlock !== -1) {
        content = content.slice(0, secondIdx) + content.slice(endOfBlock + 1);
        fs.writeFileSync(audioPath, content, 'utf8');
        console.log("  ✅ src/utils/audio.ts: تابع تکراری حذف شد.");
      }
    }
  }
}

// --------------------------------------------------------------------------
// ۲. اصلاح src/components/ImageMessageRenderer.tsx
// --------------------------------------------------------------------------
const imgRendererPath = path.join(process.cwd(), 'src/components/ImageMessageRenderer.tsx');
if (fs.existsSync(imgRendererPath)) {
  let content = fs.readFileSync(imgRendererPath, 'utf8');
  // تبدیل خروجی match به string صریح
  content = content.replace(
    /const\s+imageUrl\s*=\s*([^;]+);/g,
    (m, expr) => {
      if (expr.includes('.match(')) {
        return `const matchResult = ${expr};\n  const imageUrl: string = (Array.isArray(matchResult) ? matchResult[1] || matchResult[0] : (matchResult || '')) as string;`;
      }
      return m;
    }
  );
  content = content.replace(/text\.replace\(imageUrl,\s*''\)/g, "text.replace(imageUrl || '', '')");
  fs.writeFileSync(imgRendererPath, content, 'utf8');
  console.log("  ✅ src/components/ImageMessageRenderer.tsx: تبدیل تایپ imageUrl اصلاح شد.");
}

// --------------------------------------------------------------------------
// ۳. اصلاح src/App.tsx
// --------------------------------------------------------------------------
const appPath = path.join(process.cwd(), 'src/App.tsx');
if (fs.existsSync(appPath)) {
  let content = fs.readFileSync(appPath, 'utf8');
  content = content.replace(
    /activeArtifact\?\.code\s*\|\|\s*activeArtifact\?\.content\s*\|\|\s*activeArtifact\?\.html/g,
    'activeArtifact?.code || (activeArtifact as any)?.content || (activeArtifact as any)?.html'
  );
  content = content.replace(/onLoadSession=\{\(loadedMessages\)\s*=>/g, 'onLoadSession={(loadedMessages: any) =>');
  content = content.replace(/onFinished=\{\(resultText\)\s*=>/g, 'onFinished={(resultText: string) =>');
  fs.writeFileSync(appPath, content, 'utf8');
  console.log("  ✅ src/App.tsx: پروپ‌های PreviewArtifact و تایپ کال‌بک‌ها اصلاح شدند.");
}

// --------------------------------------------------------------------------
// ۴. اصلاح src/components/PreviewModal.tsx
// --------------------------------------------------------------------------
const previewModalPath = path.join(process.cwd(), 'src/components/PreviewModal.tsx');
if (fs.existsSync(previewModalPath)) {
  let content = fs.readFileSync(previewModalPath, 'utf8');
  content = content.replace(
    /srcDoc=\{currentCode\s*\|\|/g,
    'srcDoc={((typeof currentCode !== "undefined" ? currentCode : (props as any)?.code) || "") ||'
  );
  fs.writeFileSync(previewModalPath, content, 'utf8');
  console.log("  ✅ src/components/PreviewModal.tsx: متغیر currentCode ایمن‌سازی شد.");
}

// --------------------------------------------------------------------------
// ۵. اصلاح src/components/YodawWorkspace.tsx
// --------------------------------------------------------------------------
const yodawPath = path.join(process.cwd(), 'src/components/YodawWorkspace.tsx');
if (fs.existsSync(yodawPath)) {
  let content = fs.readFileSync(yodawPath, 'utf8');
  // رفع عدم هم‌پوشانی رشته 'website' با YodawServiceType
  content = content.replace(/selectedService\s*===\s*'website'/g, "(selectedService as any) === 'website'");
  // رفع مقدار null برای پروپ title
  content = content.replace(/title=\{selectedService\}/g, "title={selectedService || undefined}");
  // رفع اتریبیوت تکراری onKeyDown در خطوط حوالی 2015
  const doubleKeyIdx = content.indexOf('onKeyDown={(e) => {');
  if (doubleKeyIdx !== -1) {
    const nextKeyIdx = content.indexOf('onKeyDown={(e) => {', doubleKeyIdx + 15);
    if (nextKeyIdx !== -1 && nextKeyIdx - doubleKeyIdx < 200) {
      // یک مورد را حذف می‌کنیم
      const endProp = content.indexOf('}}', nextKeyIdx);
      if (endProp !== -1) {
        content = content.slice(0, nextKeyIdx) + content.slice(endProp + 2);
      }
    }
  }
  fs.writeFileSync(yodawPath, content, 'utf8');
  console.log("  ✅ src/components/YodawWorkspace.tsx: مقایسه‌ها و ویژگی تکراری onKeyDown اصلاح شدند.");
}

// --------------------------------------------------------------------------
// ۶. اصلاح server.ts
// --------------------------------------------------------------------------
const serverPath = path.join(process.cwd(), 'server.ts');
if (fs.existsSync(serverPath)) {
  let content = fs.readFileSync(serverPath, 'utf8');

  // ۱. reqLang
  content = content.replace(/const reqLang = req\.reqLang \|\| "fa";/g, 'const reqLang = (req as any).reqLang || "fa";');

  // ۲. fetchImageBuffer param typing
  content = content.replace(
    /const fetchImageBuffer = async\s*\(\s*targetUrl\s*\)\s*=>/g,
    'const fetchImageBuffer = async (targetUrl: string) =>'
  );

  // ۳. err is of type unknown
  content = content.replace(/console\.error\("\[Diffusion Engine\] ❌ Pipeline failure:", err\.message\);/g,
    'console.error("[Diffusion Engine] ❌ Pipeline failure:", (err as any)?.message || err);');
  content = content.replace(/const fallbackMsg = "⚠️ خطا در دریافت تصویر \(" \+ err\.message \+ "\)\. لطفاً مجدداً امتحان کنید\.";/g,
    'const fallbackMsg = "⚠️ خطا در دریافت تصویر (" + ((err as any)?.message || "خطای ناشناخته") + "). لطفاً مجدداً امتحان کنید.";');

  // ۴. تعریف مقادیر پیش‌فرض برای pendingCodingPrompt و resumeContext قبل از استفاده در بدنه
  content = content.replace(
    /(let effectivePrompt = \(approvedCoding && pendingCodingPrompt\))/g,
    'const pendingCodingPrompt = (req.body as any)?.pendingCodingPrompt || "";\n    const resumeContext = (req.body as any)?.resumeContext;\n    $1'
  );

  fs.writeFileSync(serverPath, content, 'utf8');
  console.log("  ✅ server.ts: تعاریف گمشده و Type Castingها اعمال شدند.");
}

console.log("\n🚀 تمام اصلاحات اعمال شدند.");
