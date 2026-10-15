const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// بررسی و تصحیح براکت‌های سرگردان در اطراف خط ۴۵
const lines = code.split('\n');
console.log("خطوط ۴۰ تا ۵۰ فعلی:");
for (let i = Math.max(0, 39); i < Math.min(lines.length, 52); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}

// اگر خط ۴۵ صرفاً }); سرگردان باشد، آن را پاک می‌کنیم
if (lines[44] && lines[44].trim() === '});') {
  console.log("حذف خط سرگردان ۴۵...");
  lines.splice(44, 1);
  fs.writeFileSync('server.ts', lines.join('\n'));
  console.log("✅ خط ۴۵ اصلاح شد.");
} else {
  // پاکسازی عمومی الگوهای }); اضافی پس از Fatal Guards
  code = code.replace(/process\.on\('unhandledRejection'[\s\S]*?\}\);\s*\}\);/, (m) => {
    return m.replace(/\}\);\s*\}\);$/, "});");
  });
  fs.writeFileSync('server.ts', code);
}
