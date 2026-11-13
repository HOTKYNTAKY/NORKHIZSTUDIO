const $ = (selector) => document.querySelector(selector);
const loginView = $('#login-view');
const dashboard = $('#dashboard');
const form = $('#article-form');
let currentArticles = [];
async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `خطای ${response.status}`);
  return data;
}
function setMessage(element, text, ok = false) { element.textContent = text; element.classList.toggle('ok', ok); }
function setLoggedIn(username) { loginView.hidden = true; dashboard.hidden = false; $('#welcome').textContent = `خوش آمدید، ${username}`; refreshList(); }
function setLoggedOut() { dashboard.hidden = true; loginView.hidden = false; }
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const message = $('#login-message');
  setMessage(message, 'در حال بررسی…');
  try {
    const data = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: formData.get('username'), password: formData.get('password') }) });
    event.currentTarget.reset(); setMessage(message, ''); setLoggedIn(data.username);
  } catch (error) { setMessage(message, error.message); }
});
$('#logout').addEventListener('click', async () => { try { await request('/api/admin/logout', { method: 'POST', body: '{}' }); } catch {} setLoggedOut(); });
async function refreshList() {
  const list = $('#admin-list'); list.innerHTML = '<p class="muted">در حال دریافت…</p>';
  try {
    const status = $('#status-filter').value;
    const data = await request(`/api/admin/articles?status=${encodeURIComponent(status)}`);
    currentArticles = data.articles;
    list.innerHTML = currentArticles.length ? currentArticles.map((article) => `<article class="admin-item"><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.kind)} · ${escapeHtml(article.category)} · <span class="${article.status === 'draft' ? 'draft' : ''}">${article.status === 'draft' ? 'پیش‌نویس' : 'منتشرشده'}</span></p><button type="button" data-edit="${article.id}">ویرایش مطلب ←</button></article>`).join('') : '<p class="muted">هنوز مطلبی ثبت نشده است.</p>';
    list.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => editArticle(Number(button.dataset.edit))));
  } catch (error) { list.innerHTML = `<p class="form-message">${escapeHtml(error.message)}</p>`; if (error.message.includes('وارد')) setLoggedOut(); }
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function editArticle(id) {
  const article = currentArticles.find((item) => item.id === id);
  if (!article) return;
  form.elements.id.value = article.id;
  for (const field of ['title','slug','excerpt','body','category','kind','author','status']) form.elements[field].value = article[field] ?? '';
  form.elements.sourceName.value = article.sourceName || '';
  form.elements.sourceUrl.value = article.sourceUrl || '';
  form.elements.featured.checked = article.featured;
  $('#form-title').textContent = 'ویرایش مطلب';
  $('#delete-article').hidden = false;
  $('#form-message').textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function resetForm() { form.reset(); form.elements.id.value = ''; form.elements.author.value = 'تحریریه ایران‌نگر'; $('#form-title').textContent = 'مطلب تازه'; $('#delete-article').hidden = true; $('#form-message').textContent = ''; }
$('#new-article').addEventListener('click', resetForm);
$('#status-filter').addEventListener('change', refreshList);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#form-message');
  const data = new FormData(form);
  const payload = Object.fromEntries(['title','slug','excerpt','body','category','kind','author','sourceName','sourceUrl','status'].map((key) => [key, String(data.get(key) || '').trim()]));
  payload.featured = form.elements.featured.checked;
  const id = form.elements.id.value;
  const button = $('#save-article'); button.disabled = true; setMessage(message, 'در حال ذخیره…');
  try {
    await request(id ? `/api/admin/articles/${id}` : '/api/admin/articles', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    setMessage(message, 'مطلب ذخیره شد.', true); resetForm(); await refreshList();
  } catch (error) { setMessage(message, error.message); }
  finally { button.disabled = false; }
});
$('#delete-article').addEventListener('click', async () => {
  const id = form.elements.id.value;
  if (!id || !confirm('این مطلب برای همیشه حذف شود؟')) return;
  try { await request(`/api/admin/articles/${id}`, { method: 'DELETE', body: '{}' }); resetForm(); await refreshList(); }
  catch (error) { setMessage($('#form-message'), error.message); }
});
request('/api/admin/me').then((data) => setLoggedIn(data.username)).catch(setLoggedOut);
