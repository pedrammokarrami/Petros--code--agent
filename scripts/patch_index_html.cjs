const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const oldSnippet = 'setInterval(renderAIImages, 500);';
if (html.includes(oldSnippet)) {
  const newSnippet = `if (window.MutationObserver) {
        let scheduled = false;
        const obs = new MutationObserver(() => {
          if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
              renderAIImages();
              scheduled = false;
            });
          }
        });
        document.addEventListener("DOMContentLoaded", () => {
          renderAIImages();
          obs.observe(document.body, { childList: true, subtree: true });
        });
      } else {
        document.addEventListener("DOMContentLoaded", renderAIImages);
      }`;
  html = html.replace(oldSnippet, newSnippet);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Successfully replaced setInterval in index.html');
} else {
  console.log('Snippet not found');
}
