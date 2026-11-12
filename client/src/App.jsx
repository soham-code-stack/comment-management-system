import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

function AuthForm({ onDone, onCancel }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: f });
      localStorage.setItem('token', data.token);
      onDone(data.user);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <form className="panel auth" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
      {mode === 'register' && <input placeholder="Name" value={f.name} onChange={set('name')} required />}
      <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      <input type="password" placeholder="Password (6+ characters)" value={f.password} onChange={set('password')} required />
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row">
        <button className="primary">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Composer({ initial = '', submitLabel, placeholder, onSubmit, onCancel }) {
  const [text, setText] = useState(initial);
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSubmit(text);
    setText('');
  };
  return (
    <form className="composer" onSubmit={submit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={1000} rows={3} />
      <div className="row">
        <button className="primary" disabled={!text.trim()}>{submitLabel}</button>
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
        <span className="count">{text.length}/1000</span>
      </div>
    </form>
  );
}

function Comment({ c, replies = [], user, act, needAuth }) {
  const [mode, setMode] = useState(null); // 'reply' | 'edit'
  const mine = user && user.id === c.author.id;
  const admin = user?.role === 'admin';
  const guard = (fn) => (user ? fn() : needAuth());

  return (
    <article className="comment">
      <div className="avatar" aria-hidden="true">{c.author.name[0]?.toUpperCase()}</div>
      <div className="body">
        <header>
          <strong>{c.author.name}</strong>
          <time>{fmt(c.createdAt)}{c.edited && ' (edited)'}</time>
        </header>

        {mode === 'edit' ? (
          <Composer
            initial={c.text}
            submitLabel="Save changes"
            onCancel={() => setMode(null)}
            onSubmit={(text) => act(() => api(`/comments/${c.id}`, { method: 'PUT', body: { text } })).then(() => setMode(null))}
          />
        ) : (
          <p className="text">{c.text}</p>
        )}

        <div className="actions">
          <button className={c.liked ? 'on' : ''} onClick={() => guard(() => act(() => api(`/comments/${c.id}/like`, { method: 'POST' })))}>
            {c.liked ? 'Liked' : 'Like'} · {c.likes}
          </button>
          {!c.parent && <button onClick={() => guard(() => setMode(mode === 'reply' ? null : 'reply'))}>Reply</button>}
          {mine && <button onClick={() => setMode('edit')}>Edit</button>}
          {(mine || admin) && (
            <button onClick={() => window.confirm('Delete this comment?') && act(() => api(`/comments/${c.id}`, { method: 'DELETE' }))}>
              Delete
            </button>
          )}
          {!mine && (
            <button className={c.reported ? 'on' : ''} onClick={() => guard(() => act(() => api(`/comments/${c.id}/report`, { method: 'POST' })))}>
              {c.reported ? 'Reported' : 'Report'}
            </button>
          )}
        </div>

        {mode === 'reply' && (
          <Composer
            submitLabel="Post reply"
            placeholder={`Reply to ${c.author.name}`}
            onCancel={() => setMode(null)}
            onSubmit={(text) => act(() => api('/comments', { method: 'POST', body: { text, parent: c.id } })).then(() => setMode(null))}
          />
        )}

        {replies.length > 0 && (
          <div className="replies">
            {replies.map((r) => <Comment key={r.id} c={r} user={user} act={act} needAuth={needAuth} />)}
          </div>
        )}
      </div>
    </article>
  );
}

function Moderation({ comments, act }) {
  const [filter, setFilter] = useState('reported');
  const list = comments.filter((c) =>
    filter === 'reported' ? c.reports > 0 : filter === 'hidden' ? c.status === 'hidden' : true
  );
  const counts = {
    all: comments.length,
    reported: comments.filter((c) => c.reports > 0).length,
    hidden: comments.filter((c) => c.status === 'hidden').length,
  };
  const setStatus = (id, status) => act(() => api(`/comments/${id}/status`, { method: 'PATCH', body: { status } }));

  return (
    <section>
      <div className="tabs sub">
        {['reported', 'hidden', 'all'].map((k) => (
          <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
            {k[0].toUpperCase() + k.slice(1)} ({counts[k]})
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="empty">Nothing here. Reported and hidden comments will show up in this queue.</p>}
      {list.map((c) => (
        <div key={c.id} className={`mod-row ${c.status}`}>
          <div>
            <p className="text">{c.text}</p>
            <small>
              {c.author.name} · {fmt(c.createdAt)}
              {c.reports > 0 && <span className="flag"> · {c.reports} report{c.reports > 1 && 's'}</span>}
              {c.status === 'hidden' && <span className="flag"> · hidden</span>}
            </small>
          </div>
          <div className="row">
            {c.status === 'visible'
              ? <button onClick={() => setStatus(c.id, 'hidden')}>Hide</button>
              : <button onClick={() => setStatus(c.id, 'visible')}>Restore</button>}
            <button className="danger" onClick={() => window.confirm('Delete permanently?') && act(() => api(`/comments/${c.id}`, { method: 'DELETE' }))}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [view, setView] = useState('thread');
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setComments(await api(`/comments${view === 'moderate' ? '?all=1' : ''}`));
    } catch (e) {
      setError(e.message);
    }
  }, [view]);

  useEffect(() => {
    if (localStorage.getItem('token'))
      api('/auth/me').then(setUser).catch(() => localStorage.removeItem('token'));
  }, []);
  useEffect(() => { load(); }, [load, user]);

  const act = async (fn) => {
    try { setError(''); await fn(); await load(); } catch (e) { setError(e.message); }
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); setView('thread'); };

  const top = comments.filter((c) => !c.parent);
  const repliesOf = (id) => comments.filter((c) => c.parent === id).reverse();

  return (
    <div className="page">
      <header className="top">
        <h1>Comment Desk</h1>
        <div className="row">
          {user ? (
            <>
              <span className="who">{user.name}{user.role === 'admin' && ' (admin)'}</span>
              <button className="ghost" onClick={logout}>Sign out</button>
            </>
          ) : (
            <button className="primary" onClick={() => setShowAuth(true)}>Sign in</button>
          )}
        </div>
      </header>

      {user?.role === 'admin' && (
        <nav className="tabs">
          <button className={view === 'thread' ? 'active' : ''} onClick={() => setView('thread')}>Discussion</button>
          <button className={view === 'moderate' ? 'active' : ''} onClick={() => setView('moderate')}>Moderation</button>
        </nav>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {showAuth && !user && <AuthForm onCancel={() => setShowAuth(false)} onDone={(u) => { setUser(u); setShowAuth(false); }} />}

      {view === 'moderate' && user?.role === 'admin' ? (
        <Moderation comments={comments} act={act} />
      ) : (
        <main>
          {user ? (
            <Composer
              submitLabel="Post comment"
              placeholder="Add to the discussion"
              onSubmit={(text) => act(() => api('/comments', { method: 'POST', body: { text } }))}
            />
          ) : (
            <p className="prompt">
              <button className="link" onClick={() => setShowAuth(true)}>Sign in</button> to join the discussion.
            </p>
          )}
          {top.length === 0 && <p className="empty">No comments yet. Start the discussion.</p>}
          {top.map((c) => (
            <Comment key={c.id} c={c} replies={repliesOf(c.id)} user={user} act={act} needAuth={() => setShowAuth(true)} />
          ))}
        </main>
      )}
    </div>
  );
}
