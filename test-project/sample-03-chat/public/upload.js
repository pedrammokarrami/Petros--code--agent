const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  if (!fileInput.files.length) return;
  const form = new FormData();
  form.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    const filename = data.filename || 'unknown';
    socket.emit('message', { text: `[فایل] ${filename}` });
  } catch (e) {
    console.error(e);
  }
});
