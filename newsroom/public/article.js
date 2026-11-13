const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const formattedDate = (value) => { try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(value)); } catch { return ''; } };
document.querySelector('#year').textContent = new Date().getFullYear().toLocaleString('fa-IR');
const slug = new URLSearchParams(location.search).get('slug');
const root = document.querySelector('#article-content');
if (!slug) renderNotFound();
else fetch(`/api/news/${encodeURIComponent(slug)}`).then((response) => {
  if (!response.ok) throw new Error('not found');
  return response.json();
}).then(({ article }) => renderArticle(article)).catch(renderNotFound);
function renderNotFound() {
  document.title = 'مطلب پیدا نشد | ایران‌نگر';
  root.innerHTML = '<div class="article-notfound"><p class="eyebrow">۴۰۴ / مطلب در دسترس نیست</p><h1>این مطلب پیدا نشد.</h1><p>ممکن است پیوند تغییر کرده یا مطلب هنوز منتشر نشده باشد.</p><a class="button button-dark" href="/">بازگشت به صفحه‌ی نخست ←</a></div>';
}
function renderArticle(article) {
  document.title = `${article.title} | ایران‌نگر`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = article.excerpt;
  const paragraphs = article.body.split(/\n\s*\n/).map((paragraph) => `<p>${escape(paragraph).replaceAll('\n', '<br>')}</p>`).join('');
  root.innerHTML = `<header class="article-header"><span class="kind-pill">${escape(article.kind)} · ${escape(article.category)}</span>${article.sample ? '<span class="sample-badge">نمونه‌ی آغازین</span>' : ''}<h1>${escape(article.title)}</h1><p class="article-excerpt">${escape(article.excerpt)}</p><div class="article-meta"><span>نویسنده: ${escape(article.author)}</span><time datetime="${escape(article.publishedAt)}">${formattedDate(article.publishedAt)}</time><button type="button" class="share-button" id="share-article">اشتراک‌گذاری ↗</button></div></header><div class="article-body">${paragraphs}</div>${article.sourceName ? `<div class="article-source"><strong>منبع: ${escape(article.sourceName)}</strong>${article.sourceUrl ? ` · <a href="${escape(article.sourceUrl)}" rel="noopener noreferrer" target="_blank">بازکردن منبع ↗</a>` : ''}</div>` : ''}`;
  document.querySelector('#share-article').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); showToast('پیوند کپی شد'); }
    catch { showToast(location.href); }
  });
}
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.textContent = message; document.body.append(toast);
  setTimeout(() => toast.remove(), 2400);
}
