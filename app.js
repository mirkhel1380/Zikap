'use strict';
const el = id => document.getElementById(id);
let lastReport = '';
function download(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], {type}));
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function inspectHTML(source) {
  // Parse in a detached template. Uploaded scripts, styles and resource elements are never inserted into the live page.
  const template = document.createElement('template'); template.innerHTML = source;
  const doc = template.content;
  const meta = name => Array.from(doc.querySelectorAll('meta')).find(m => (m.getAttribute('name') || '').toLowerCase() === name);
  const title = (doc.querySelector('title')?.textContent || '').trim();
  const description = (meta('description')?.getAttribute('content') || '').trim();
  const h1 = doc.querySelectorAll('h1');
  const images = Array.from(doc.querySelectorAll('img'));
  const missingAlt = images.filter(i => !i.hasAttribute('alt')).length;
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'));
  let previous = 0, skipped = false;
  headings.forEach(h => { const level = Number(h.tagName.slice(1)); if (level > previous + 1) skipped = true; previous = level; });
  const canonical = Array.from(doc.querySelectorAll('link')).find(l => (l.getAttribute('rel') || '').toLowerCase().split(/\s+/).includes('canonical'));
  let absoluteCanonical = false; try { const u = new URL(canonical?.getAttribute('href')); absoluteCanonical = ['http:', 'https:'].includes(u.protocol); } catch {}
  const robots = (meta('robots')?.getAttribute('content') || '').toLowerCase();
  return [
    ['عنوان صفحه', title.length > 0, title ? 'عنوان: ' + title.slice(0, 150) : 'یک عنوان توصیفی و مرتبط برای صفحه بنویسید.'],
    ['طول پیشنهادی عنوان', title.length >= 30 && title.length <= 60, title.length + ' نویسه؛ بازه ۳۰ تا ۶۰ فقط یک راهنمای تقریبی است.'],
    ['توضیحات متا', description.length > 0, description ? description.slice(0, 180) : 'توضیحی روشن درباره محتوای صفحه اضافه کنید.'],
    ['طول پیشنهادی توضیحات', description.length >= 70 && description.length <= 160, description.length + ' نویسه؛ بازه ۷۰ تا ۱۶۰ یک راهنمای تقریبی است.'],
    ['یک عنوان اصلی H1', h1.length === 1, 'تعداد H1: ' + h1.length + '. یک عنوان اصلی روشن به ساختار صفحه کمک می‌کند.'],
    ['ترتیب هدینگ‌ها', headings.length > 0 && !skipped, headings.length === 0 ? 'هیچ هدینگی پیدا نشد.' : skipped ? 'پرش سطح هدینگ دیده شد؛ ساختار عنوان‌ها را بازبینی کنید.' : 'پرش سطح در عنوان‌ها دیده نشد.'],
    ['ویژگی alt تصاویر', missingAlt === 0, images.length === 0 ? 'تصویری وجود ندارد؛ این بررسی قابل اعمال نیست و موفق شمرده شده است.' : missingAlt + ' تصویر بدون ویژگی alt. برای تصویر تزئینی alt خالی مجاز است؛ کیفیت متن بررسی نمی‌شود.'],
    ['تنظیم نمایش موبایل', /width\s*=\s*device-width/i.test(meta('viewport')?.getAttribute('content') || ''), 'وجود viewport با width=device-width بررسی می‌شود؛ این تست کیفیت طراحی موبایل را تأیید نمی‌کند.'],
    ['آدرس canonical', absoluteCanonical, 'یک آدرس کامل http یا https برای canonical پیشنهاد می‌شود؛ صحت مقصد بررسی نشده است.'],
    ['دستور noindex در HTML', !/(^|[\s,])(noindex|none)(?=$|[\s,])/i.test(robots), robots ? 'مقدار robots: ' + robots : 'دستور noindex در متای robots دیده نشد؛ هدر سرور و وضعیت واقعی ایندکس بررسی نشده‌اند.']
  ];
}
el('analyze').addEventListener('click', () => {
  const source = el('source').value.trim(); el('tool-error').textContent = '';
  if (!source || !/<[a-z][\s\S]*>/i.test(source)) { el('tool-error').textContent = 'لطفاً کد HTML معتبر وارد کنید.'; return; }
  if (source.length > 2000000) { el('tool-error').textContent = 'حجم کد باید کمتر از ۲ مگابایت باشد.'; return; }
  const checks = inspectHTML(source); const passed = checks.filter(c => c[1]).length;
  const panel = document.createElement('div'); panel.className = 'result';
  const top = document.createElement('div'); top.className = 'result-top';
  const score = document.createElement('span'); score.className = 'score'; score.textContent = passed * 10 + '/100';
  const label = document.createElement('strong'); label.textContent = passed + ' بررسی موفق از ۱۰ بررسی پایه'; top.append(score, label); panel.append(top);
  const note = document.createElement('p'); note.className = 'tiny'; note.textContent = 'امتیاز داخلی Zikap بر اساس همین HTML است؛ رتبه یا امتیاز گوگل نیست.'; panel.append(note);
  checks.forEach(([name, ok, detail]) => { const row = document.createElement('div'); row.className = 'check'; const status = document.createElement('span'); status.className = 'status ' + (ok ? 'good' : 'bad'); status.textContent = ok ? '✓' : '!'; const text = document.createElement('div'); const title = document.createElement('strong'); title.textContent = name; const small = document.createElement('small'); small.textContent = detail; text.append(title, small); row.append(status, text); panel.append(row); });
  lastReport = 'Zikap — بررسی پایه HTML\n' + new Date().toISOString() + '\nامتیاز داخلی: ' + passed * 10 + '/100\nاین امتیاز معیار گوگل یا بررسی کامل سئو نیست.\n\n' + checks.map(([n,o,d]) => (o ? '[OK] ' : '[REVIEW] ') + n + '\n' + d).join('\n\n');
  const button = document.createElement('button'); button.className = 'btn ghost'; button.textContent = 'دانلود گزارش ↓'; button.addEventListener('click', () => download('zikap-html-report.txt', lastReport)); panel.append(button); el('output').replaceChildren(panel);
});
el('demo').addEventListener('click', () => {
  el('source').value = '<!doctype html>\n<html lang="en">\n<head>\n<title>Example Garden | Practical Home Gardening Tips</title>\n<meta name="description" content="Explore practical home gardening tips, seasonal planting guides, and simple ideas for growing a healthy garden in a small space.">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="canonical" href="https://example.com/garden">\n</head>\n<body><h1>Grow your first garden</h1><h3>Getting started</h3><img src="garden.jpg"></body>\n</html>';
  el('analyze').click();
});
el('upload').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; el('tool-error').textContent = ''; if (file.size > 2000000) { el('tool-error').textContent = 'فایل باید کمتر از ۲ مگابایت باشد.'; event.target.value = ''; return; } try { el('source').value = await file.text(); el('analyze').click(); } catch { el('tool-error').textContent = 'خواندن فایل ممکن نشد؛ دوباره تلاش کنید.'; } });
document.querySelectorAll('[data-service]').forEach(a => a.addEventListener('click', () => { el('service').value = a.dataset.service; }));
el('contact').addEventListener('submit', event => { event.preventDefault(); download('zikap-project-brief.txt', 'Zikap — شرح پروژه\n\nآدرس: ' + el('site').value + '\nخدمت: ' + el('service').value + '\nهدف: ' + el('goal').value + '\n\nاین فایل به صورت خودکار ارسال نشده است.'); el('brief-status').textContent = 'فایل برای دانلود آماده شد. هیچ درخواست آنلاینی ارسال نشده است.'; });
