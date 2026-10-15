const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("==========================================");
console.log("🛠️ بازیابی server.ts و فعال‌سازی مجدد میکروفون");
console.log("==========================================\n");

// ۱. بازیابی server.ts از بک‌آپ سالم
const backups = ['server.ts.laya_bak', 'server.ts.bak_1790956006', 'server.ts.bak_1790955746', 'server.ts.bak'];
let restored = false;
for (const b of backups) {
  if (fs.existsSync(b)) {
    const content = fs.readFileSync(b, 'utf8');
    if (content.includes('express') && content.includes('app.listen')) {
      fs.writeFileSync('server.ts', content);
      console.log(`✅ server.ts با موفقیت از بک‌آپ سالم ${b} بازیابی شد.`);
      restored = true;
      break;
    }
  }
}

// ۲. فعال‌سازی مجدد میکروفون در تمام فایل‌های src
console.log("\n🎙️ فعال‌سازی مجدد navigator.mediaDevices.getUserMedia در سورس فرانت‌اند...");
function walkAndFix(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') walkAndFix(full);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')) {
      let code = fs.readFileSync(full, 'utf8');
      if (code.includes('/* getUserMedia disabled */ undefined')) {
        code = code.replace(/\/\* getUserMedia disabled \*\/ undefined/g, 'navigator.mediaDevices.getUserMedia');
        fs.writeFileSync(full, code);
        console.log(`   ✅ میکروفون فعال شد در: ${full}`);
      }
    }
  }
}
walkAndFix(path.join(process.cwd(), 'src'));

console.log("\n==========================================");
console.log("تست کامپایل پس از بازیابی:");
console.log("==========================================");
