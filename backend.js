/* إمداد · Supabase backend
   Inside Claude the app talks to window.claude.use('db' | 'user' | 'downloads').
   Here the same interface is provided on top of Supabase: email/password sign-in, one "docs" table
   (col, id, data) and realtime, so every user sees everyone else's changes live. */
(function () {
  const C = window.EMDAD_CONFIG || {};
  const configured = C.supabaseUrl && C.supabaseAnonKey && !/YOUR-/.test(C.supabaseUrl + C.supabaseAnonKey);
  const sb = configured && window.supabase ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  window.emdadSupabase = sb;

  let session = null, resolveReady;
  const ready = new Promise(r => (resolveReady = r));
  const domReady = new Promise(r => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r) : r());

  /* ---------- sign-in screen ---------- */
  const CSS = `
  .lg-wrap{position:fixed;inset:0;z-index:100;background:var(--home-bg,#F3F4F6);display:grid;place-items:center;overflow:auto;padding-block:24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
  .lg-card{width:min(400px,100%);background:var(--surface,#fff);border:1px solid var(--line,#DEE2E6);border-radius:8px;padding:28px 24px;display:flex;flex-direction:column;gap:14px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
  .lg-brand{display:flex;align-items:center;gap:12px}
  .lg-brand i{width:44px;height:44px;border-radius:10px;background:var(--nav,#714B67);display:grid;place-items:center}
  .lg-brand svg{width:24px;height:24px;fill:#fff}
  .lg-brand b{font-size:20px;display:block}
  .lg-brand span{font-size:13px;color:var(--muted,#5F6B76)}
  .lg-card label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}
  .lg-card input{border:1px solid var(--line,#DEE2E6);border-radius:4px;padding:9px 10px;background:var(--surface,#fff);color:var(--ink,#1F2933);font:inherit}
  .lg-card input:focus{outline:2px solid var(--accent,#714B67);outline-offset:0}
  .lg-card .pri{background:var(--accent,#714B67);color:var(--accent-ink,#fff);border:0;border-radius:4px;padding:10px;font:inherit;font-weight:600;cursor:pointer}
  .lg-card .pri:disabled{opacity:.6;cursor:wait}
  .lg-links{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
  .lg-links button{all:unset;cursor:pointer;color:var(--link,#017E84);font-size:13px}
  .lg-links button:focus-visible{outline:2px solid var(--accent,#714B67)}
  .lg-msg{font-size:13px;border-radius:4px;padding:8px 10px;margin:0}
  .lg-msg.bad{background:var(--bad-soft,#FBE6E3);color:var(--bad,#B42318)}
  .lg-msg.ok{background:var(--ok-soft,#E3F2E9);color:var(--ok,#1B7A48)}
  .lg-out{all:unset;cursor:pointer;width:36px;height:var(--nav-h,46px);display:grid;place-items:center}
  .lg-out:hover{background:var(--nav-hover,rgba(255,255,255,.14))}
  .lg-out svg{width:18px;height:18px;fill:currentColor}`;
  const LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 4.5v11L12 22l-9-4.5v-11zm0 2.2L6.2 7 12 9.8 17.8 7zM5 8.6v7.7l6 3v-7.7zm8 10.7 6-3V8.6l-6 3z"/></svg>';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let box = null;

  function screen(mode, msg, tone) {
    if (!box) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); box = document.createElement('div'); box.className = 'lg-wrap'; document.body.appendChild(box); }
    box.hidden = false;
    const head = `<div class="lg-brand"><i>${LOGO}</i><div><b>إمداد</b><span>منظومة سلسلة الإمداد</span></div></div>`;
    const note = msg ? `<p class="lg-msg ${tone || 'bad'}" role="status">${esc(msg)}</p>` : '';
    if (mode === 'setup') { box.innerHTML = `<div class="lg-card">${head}<p class="lg-msg bad">البرنامج لسه مش متوصل بقاعدة البيانات. افتح ملف <b>config.js</b> وحط فيه Project URL والـ anon key من Supabase.</p></div>`; return; }
    const signup = mode === 'signup', reset = mode === 'reset', newpw = mode === 'newpw';
    box.innerHTML = `<form class="lg-card" id="lgForm" novalidate>${head}
      <b style="font-size:16px">${signup ? 'حساب جديد' : reset ? 'نسيت الباسورد' : newpw ? 'باسورد جديد' : 'تسجيل الدخول'}</b>${note}
      ${signup ? '<label>الاسم<input id="lgName" name="name" required autocomplete="name"></label>' : ''}
      ${newpw ? '' : '<label>الإيميل<input id="lgEmail" name="email" type="email" required autocomplete="email" dir="ltr"></label>'}
      ${reset ? '' : `<label>الباسورد<input id="lgPw" name="pw" type="password" required minlength="6" autocomplete="${signup || newpw ? 'new-password' : 'current-password'}" dir="ltr"></label>`}
      <button class="pri" type="submit">${signup ? 'اعمل الحساب' : reset ? 'ابعتلي لينك تغيير الباسورد' : newpw ? 'احفظ الباسورد' : 'دخول'}</button>
      ${newpw ? '' : `<div class="lg-links">${mode === 'login' ? '<button type="button" data-m="signup">معنديش حساب</button><button type="button" data-m="reset">نسيت الباسورد</button>' : '<button type="button" data-m="login">رجوع لتسجيل الدخول</button>'}</div>`}
    </form>`;
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => screen(b.dataset.m));
    const f = box.querySelector('#lgForm');
    setTimeout(() => { const el = f.querySelector('input'); if (el) el.focus(); }, 30);
    f.onsubmit = async e => {
      e.preventDefault();
      const btn = f.querySelector('.pri'), v = n => (f.querySelector(`[name=${n}]`) || {}).value || '';
      const email = v('email').trim(), pw = v('pw'), name = v('name').trim();
      if (!newpw && !/^\S+@\S+\.\S+$/.test(email)) return screen(mode, 'اكتب إيميل صحيح.');
      if (!reset && pw.length < 6) return screen(mode, 'الباسورد لازم يكون 6 حروف أو أكتر.');
      if (signup && !name) return screen(mode, 'اكتب اسمك عشان التيم يعرف مين اللي سجّل.');
      btn.disabled = true;
      try {
        if (mode === 'login') {
          const { error } = await sb.auth.signInWithPassword({ email, password: pw });
          if (error) throw error;
        } else if (signup) {
          const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { name }, emailRedirectTo: location.href.split('#')[0] } });
          if (error) throw error;
          if (!data.session) return screen('login', 'اتعمل الحساب. افتح الإيميل اللي وصلك ودوس على لينك التأكيد، وبعدين ادخل.', 'ok');
        } else if (reset) {
          const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
          if (error) throw error;
          return screen('login', 'لو الإيميل ده عليه حساب، هيوصله لينك لتغيير الباسورد.', 'ok');
        } else if (newpw) {
          const { error } = await sb.auth.updateUser({ password: pw });
          if (error) throw error;
          box.hidden = true;
        }
      } catch (err) {
        const m = String(err && err.message || '');
        screen(mode, /Invalid login/i.test(m) ? 'الإيميل أو الباسورد غلط.' : /not confirmed/i.test(m) ? 'لسه ما أكدتش الإيميل. افتح رسالة التأكيد الأول.' : /already registered/i.test(m) ? 'الإيميل ده عليه حساب بالفعل. ادخل بيه.' : /rate limit/i.test(m) ? 'محاولات كتير. استنى شوية وجرّب تاني.' : 'حصلت مشكلة: ' + m);
      }
    };
  }

  async function signedIn(s) {
    session = s;
    if (box) box.hidden = true;
    const u = s.user, meta = u.user_metadata || {};
    // keep the user's display name in profiles so other people's screens can show it
    try {
      const { data } = await sb.from('profiles').select('name').eq('id', u.id).maybeSingle();
      const name = (data && data.name) || meta.name || (u.email || '').split('@')[0];
      await sb.from('profiles').upsert({ id: u.id, name, email: u.email, updated_at: new Date().toISOString() });
    } catch (e) { console.warn('profile', e); }
    resolveReady();
    domReady.then(addSignOut);
  }
  function addSignOut() {
    const sys = document.querySelector('.o-sys');
    if (!sys || sys.querySelector('.lg-out')) return;
    const b = document.createElement('button');
    b.className = 'lg-out'; b.title = 'تسجيل خروج'; b.setAttribute('aria-label', 'تسجيل خروج');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-9v-2h9V5h-9zm-1.6 4.6L9.8 9l-2 2H16v2H7.8l2 2-1.4 1.4L4 12z"/></svg>';
    b.onclick = async () => { await sb.auth.signOut(); location.reload(); };
    sys.appendChild(b);
  }

  if (!sb) { domReady.then(() => screen('setup')); }
  else {
    sb.auth.onAuthStateChange((ev, s) => {
      if (ev === 'PASSWORD_RECOVERY') { domReady.then(() => screen('newpw', 'اكتب الباسورد الجديد.', 'ok')); return; }
      if (s && !session) signedIn(s);
      else if (s) session = s;
      if (ev === 'SIGNED_OUT' && session) location.reload();
    });
    sb.auth.getSession().then(({ data }) => { if (data.session) { if (!session) signedIn(data.session); } else domReady.then(() => { if (!session) screen('login'); }); });
  }

  /* ---------- install as an app (Android, desktop Chrome / Edge; iPhone uses Share → Add to Home Screen) ---------- */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; domReady.then(addInstall); });
  window.addEventListener('appinstalled', () => { installEvt = null; const b = document.querySelector('.lg-install'); if (b) b.remove(); });
  function addInstall() {
    const sys = document.querySelector('.o-sys');
    if (!sys || !installEvt || sys.querySelector('.lg-install')) return;
    const b = document.createElement('button');
    b.className = 'lg-out lg-install'; b.title = 'ثبّت إمداد كتطبيق على الجهاز'; b.setAttribute('aria-label', b.title);
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3zM4 18h16v2H4z"/></svg>';
    b.onclick = async () => { if (!installEvt) return; installEvt.prompt(); const r = await installEvt.userChoice; if (r.outcome === 'accepted') b.remove(); installEvt = null; };
    sys.prepend(b);
  }

  /* ---------- db: collection(col).doc(id).set/delete + onSnapshot ---------- */
  const subs = new Map(); // col → {map, cbs}
  let channel = null, wasDown = false;
  const mapErr = e => { const c = String(e && e.code || ''); const err = new Error(e && e.message || 'خطأ في الحفظ'); err.code = c === '42501' || /row-level security/i.test(err.message) ? 'invalid_argument' : /fetch|network/i.test(err.message) ? 'unavailable' : c; return err; };
  function emit(col) { const s = subs.get(col); if (!s) return; const docs = [...s.map.entries()].map(([id, data]) => ({ id, data: () => data })); s.cbs.forEach(cb => { try { cb({ docs }); } catch (e) { console.error(e); } }); }
  async function loadCol(col) {
    const all = new Map();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('docs').select('id,data').eq('col', col).range(from, from + 999);
      if (error) throw mapErr(error);
      data.forEach(r => all.set(r.id, r.data));
      if (data.length < 1000) break;
    }
    subs.get(col).map = all; emit(col);
  }
  function ensureChannel() {
    if (channel) return;
    channel = sb.channel('emdad-docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
        const row = p.eventType === 'DELETE' ? p.old : p.new;
        const s = row && subs.get(row.col); if (!s) return;
        if (p.eventType === 'DELETE') s.map.delete(row.id); else s.map.set(row.id, row.data);
        emit(row.col);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED' && wasDown) { wasDown = false; subs.forEach((_, col) => loadCol(col).catch(console.error)); }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') wasDown = true;
      });
  }
  const db = {
    collection(col) {
      return {
        doc(id) {
          return {
            async set(data) { const { error } = await sb.from('docs').upsert({ col, id, data, updated_at: new Date().toISOString() }); if (error) throw mapErr(error); },
            async delete() { const { error } = await sb.from('docs').delete().eq('col', col).eq('id', id); if (error) throw mapErr(error); }
          };
        },
        onSnapshot(cb, errCb) {
          if (!subs.has(col)) subs.set(col, { map: new Map(), cbs: [] });
          subs.get(col).cbs.push(cb);
          ensureChannel();
          loadCol(col).catch(e => errCb && errCb(e));
          return () => { const s = subs.get(col); if (s) s.cbs = s.cbs.filter(x => x !== cb); };
        }
      };
    }
  };

  /* ---------- user: id, admin check, names, people search ---------- */
  let adminP = null;
  const clean = q => String(q || '').replace(/[,()%*\\]/g, ' ').trim();
  const user = {
    id: async () => session.user.id,
    isOwner: () => adminP || (adminP = sb.rpc('is_admin').then(r => !!r.data, () => false)),
    canEdit: async () => false,
    can: async () => true,
    profiles: async ids => { const o = {}; if (!ids.length) return o; const { data } = await sb.from('profiles').select('id,name,email').in('id', ids); (data || []).forEach(p => o[p.id] = { name: p.name || p.email }); return o; },
    search: async q => { let qy = sb.from('profiles').select('id,name,email').order('name').limit(12); const t = clean(q); if (t) qy = qy.or(`name.ilike.%${t}%,email.ilike.%${t}%`); const { data } = await qy; return (data || []).map(p => ({ id: p.id, name: p.name || p.email })); }
  };

  /* ---------- downloads: a normal browser download ---------- */
  const downloads = {
    async save({ filename, data }) {
      const url = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  };

  window.claude = {
    use: async name => {
      if (!sb) return null; // no config → the app falls back to its local demo mode behind the setup screen
      await ready;
      if (name === 'db') return db;
      if (name === 'user') return user;
      if (name === 'downloads') return downloads;
      throw new Error('unknown capability ' + name);
    }
  };
})();
