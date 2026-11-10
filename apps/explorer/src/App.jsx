// The app: routes, live updates from disk, the change ribbon, the theme and the global keys.
import { useEffect, useRef, useState } from 'react';
import { api, AppContext, diffMarks, invalidate, loadSeen, marksByDossier, saveSeen, shortTime, useData, useRoute } from './lib.js';
import { Header_, Help, LiveRegion, Palette, Ribbon } from './Shell.jsx';
import { Failed, Loading } from './bits.jsx';
import { Board } from './Board.jsx';
import { DossierView } from './BehaviorView.jsx';

const THEME_KEY = 'dossier-explorer:theme';
const readTheme = () => { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; } };

export function App() {
  const route = useRoute();
  const [version, setVersion] = useState(0);
  const [live, setLive] = useState('connecting');
  const [files, setFiles] = useState([]);
  const [changes, setChanges] = useState([]);
  const [since, setSince] = useState(null);
  const [message, setMessage] = useState('');
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [theme, setThemeState] = useState(readTheme);
  const [osDark, setOsDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const { data: root, error } = useData(api.root, version);
  const prev = useRef(null);

  const announce = text => { setMessage(''); requestAnimationFrame(() => setMessage(text)); };

  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onopen = () => setLive('live');
    es.onerror = () => setLive('offline');
    es.addEventListener('change', e => {
      const d = JSON.parse(e.data);
      invalidate();
      setFiles(f => [...new Set([...f, ...d.paths])].slice(-40));
      setVersion(v => v + 1);
    });
    return () => es.close();
  }, []);

  // The ribbon: what changed while the page was open, and on first load, since the last visit.
  useEffect(() => {
    if (!root) return;
    const now = marksByDossier(root.dossiers);
    if (prev.current) {
      const d = diffMarks(prev.current, root.dossiers);
      if (d.length) { setChanges(c => [...c, ...d]); setSince(s => s || new Date().toISOString()); announce(`${d.length} mark${d.length === 1 ? '' : 's'} changed`); }
    } else {
      const seen = loadSeen(root.root);
      if (seen?.marks) { const d = diffMarks(seen.marks, root.dossiers); if (d.length) { setChanges(d); setSince(seen.at); } }
    }
    prev.current = now;
    saveSeen(root.root, { at: new Date().toISOString(), marks: now });
  }, [root]);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = e => setOsDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage may be unavailable */ }
  }, [theme]);
  const colorMode = theme === 'auto' ? (osDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const on = e => {
      const t = e.target;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { e.preventDefault(); setHelp(true); }
      else if (e.key === '[' || e.key === ']') { e.preventDefault(); dispatchEvent(new CustomEvent('explorer:step', { detail: e.key === ']' ? 1 : -1 })); }
      else if (['1', '2', '3'].includes(e.key) && !t.closest?.('.react-flow')) dispatchEvent(new CustomEvent('explorer:center', { detail: Number(e.key) }));
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);

  // A dossier goes by its id, the kebab-case name its folder, its links and its module share.
  const title = id => id;
  const crumbs = route.view === 'board' ? [{ label: 'Board' }]
    : route.view === 'composition' ? [{ label: 'Board', href: '#/' }, { label: title(route.id) }]
    : [{ label: 'Board', href: '#/' }, ...(route.params.from ? [{ label: title(route.params.from), href: `#/composition/${route.params.from}` }] : []), { label: title(route.id) }];

  return (
    <AppContext.Provider value={{ version, announce, root, changes, colorMode }}>
      <div className="app">
        <button type="button" className="skip" onClick={() => document.getElementById('main')?.focus()}>Skip to content</button>
        <Header_ crumbs={crumbs} live={live} theme={theme} setTheme={setThemeState} onPalette={() => setPalette(true)} onHelp={() => setHelp(true)} />
        <Ribbon changes={changes} files={files} since={since ? `since ${shortTime(since)}` : ''} onDismiss={() => { setChanges([]); setFiles([]); setSince(null); }} />
        <main id="main" className="main" tabIndex={-1}>
          {error ? <Failed error={error} />
            : !root ? <Loading what="the dossiers" />
            : route.view === 'part' ? <DossierView key={`part:${route.id}`} kind="part" id={route.id} params={route.params} />
            : route.view === 'composition' ? <DossierView key={`composition:${route.id}`} kind="composition" id={route.id} params={route.params} />
            : <Board />}
        </main>
        <Palette isOpen={palette} onOpenChange={setPalette} />
        <Help isOpen={help} onOpenChange={setHelp} />
        <LiveRegion message={message} />
      </div>
    </AppContext.Provider>
  );
}
