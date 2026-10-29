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
    ['Page title', title.length > 0, title ? 'Title: ' + title.slice(0, 150) : 'Add a descriptive, relevant page title.'],
    ['Suggested title length', title.length >= 30 && title.length <= 60, title.length + ' characters. 30–60 characters is an approximate guideline only.'],
    ['Meta description', description.length > 0, description ? description.slice(0, 180) : 'Add a clear summary of the page content.'],
    ['Suggested description length', description.length >= 70 && description.length <= 160, description.length + ' characters. 70–160 characters is an approximate guideline only.'],
    ['Single H1 (structure guideline)', h1.length === 1, 'H1 count: ' + h1.length + '. A clear main heading helps organize the page.'],
    ['Heading order (accessibility guideline)', headings.length > 0 && !skipped, headings.length === 0 ? 'No headings found.' : skipped ? 'A heading level was skipped. Review the heading hierarchy.' : 'No skipped heading levels found.'],
    ['Image alt attributes', missingAlt === 0, images.length === 0 ? 'No images found. This check is not applicable and counts as passed.' : missingAlt + ' image(s) missing an alt attribute. Decorative images may use empty alt text. Text quality is not assessed.'],
    ['Mobile viewport', /width\s*=\s*device-width/i.test(meta('viewport')?.getAttribute('content') || ''), 'Checks for width=device-width in the viewport. This does not verify mobile design quality.'],
    ['Canonical URL', absoluteCanonical, 'An absolute HTTP or HTTPS canonical URL is recommended. The destination is not verified.'],
    ['HTML noindex directive', !/(^|[\s,])(noindex|none)(?=$|[\s,])/i.test(robots), robots ? 'Robots value: ' + robots : 'No noindex found in the robots meta tag. Server headers and actual indexing status are not checked.']
  ];
}
el('analyze').addEventListener('click', () => {
  const source = el('source').value.trim(); el('tool-error').textContent = '';
  if (!source || !/<[a-z][\s\S]*>/i.test(source)) { el('tool-error').textContent = 'Please enter valid HTML code.'; return; }
  if (source.length > 2000000) { el('tool-error').textContent = 'HTML must be smaller than 2 MB.'; return; }
  const checks = inspectHTML(source); const passed = checks.filter(c => c[1]).length;
  const panel = document.createElement('div'); panel.className = 'result';
  const top = document.createElement('div'); top.className = 'result-top';
  const score = document.createElement('span'); score.className = 'score'; score.textContent = passed * 10 + '/100';
  const label = document.createElement('strong'); label.textContent = passed + ' of 10 basic checks passed'; top.append(score, label); panel.append(top);
  const note = document.createElement('p'); note.className = 'tiny'; note.textContent = 'An internal Zikap score based on this HTML only. Not a Google score or ranking.'; panel.append(note);
  checks.forEach(([name, ok, detail]) => { const row = document.createElement('div'); row.className = 'check'; const status = document.createElement('span'); status.className = 'status ' + (ok ? 'good' : 'bad'); status.textContent = ok ? '✓' : '!'; const text = document.createElement('div'); const title = document.createElement('strong'); title.textContent = name; const small = document.createElement('small'); small.textContent = detail; text.append(title, small); row.append(status, text); panel.append(row); });
  lastReport = 'Zikap — Basic HTML report\n' + new Date().toISOString() + '\nInternal score: ' + passed * 10 + '/100\nThis is not a Google metric or a complete SEO audit.\n\n' + checks.map(([n,o,d]) => (o ? '[OK] ' : '[REVIEW] ') + n + '\n' + d).join('\n\n');
  const button = document.createElement('button'); button.className = 'btn ghost'; button.textContent = 'Download report'; button.addEventListener('click', () => download('zikap-html-report.txt', lastReport)); panel.append(button); el('output').replaceChildren(panel);
});
el('demo').addEventListener('click', () => {
  el('source').value = '<!doctype html>\n<html lang="en">\n<head>\n<title>Example Garden | Practical Home Gardening Tips</title>\n<meta name="description" content="Explore practical home gardening tips, seasonal planting guides, and simple ideas for growing a healthy garden in a small space.">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="canonical" href="https://example.com/garden">\n</head>\n<body><h1>Grow your first garden</h1><h3>Getting started</h3><img src="garden.jpg"></body>\n</html>';
  el('analyze').click();
});
el('upload').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; el('tool-error').textContent = ''; if (file.size > 2000000) { el('tool-error').textContent = 'The file must be smaller than 2 MB.'; event.target.value = ''; return; } try { el('source').value = await file.text(); el('analyze').click(); } catch { el('tool-error').textContent = 'Could not read the file. Please try again.'; } });
document.querySelectorAll('[data-service]').forEach(a => a.addEventListener('click', () => { el('service').value = a.dataset.service; }));
el('contact')?.addEventListener('submit', event => { event.preventDefault(); download('zikap-project-brief.txt', 'Zikap — Project brief\n\nWebsite: ' + el('site').value + '\nPackage: ' + el('service').selectedOptions[0].textContent + '\nScope and output: ' + el('package-summary').innerText + '\nGoals: ' + el('goal').value + '\n\nThis is a request brief only. It has not been submitted. No order has been placed and no payment has been collected. Scope, timing and acceptance must be agreed separately.'); el('brief-status').textContent = 'Your request brief is ready to download. No order has been submitted and no payment has been collected.'; });
