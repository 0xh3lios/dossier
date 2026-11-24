// The app: the top bar with its lenses, the spine, the page the address names, live updates from disk,
// the change ribbon, the theme and the global keys.
import { useEffect, useRef, useState } from 'react';
import { api, AppContext, diffMarks, focusSibling, hrefFor, invalidate, lensHref, lensOf, loadSeen, marksByDossier, parseHash, ROOT, saveSeen, setParams, shortTime, useApp, useData, useNarrow, useRoute } from './lib.js';
import { Help, LiveRegion, Palette, Ribbon, TopBar } from './Shell.jsx';
import { Failed, Loading, ViewBoundary } from './bits.jsx';
import { DossierView } from './BehaviorView.jsx';
import { DossierRead, NodeRead } from './Read.jsx';
import { AttentionPage } from './Attention.jsx';
import { Board } from './Board.jsx';
import { Spine } from './Spine.jsx';

const THEME_KEY = 'dossier-explorer:theme';
const readTheme = () => { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; } };

// Where a dossier sits in the spine: the first of the places the server gives it, the order its
// breadcrumbs take too, so a component holding it whole comes before a selection. A dossier the map does
// not place is itself the place.
function hereOf(root, route) {
  if (route.view === 'node') return route.id;
  const ref = `${route.view}s/${route.id}`, first = root?.places?.[ref]?.[0];
  return first ? first.node ?? ROOT : ref;
}

export function App() {
  const route = useRoute();
  const lens = lensOf(route);
  const [version, setVersion] = useState(0);
  const [live, setLive] = useState('connecting');
  const [files, setFiles] = useState([]);
  const [changes, setChanges] = useState([]);
  const [since, setSince] = useState(null);
  const [message, setMessage] = useState('');
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [spine, setSpine] = useState(false);
  const [theme, setThemeState] = useState(readTheme);
  const [osDark, setOsDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const narrow = useNarrow('(max-width: 900px)');
  // The first question waits for the event stream to open. The server computes verify's analysis on that
  // question and answers nothing else meanwhile, about forty seconds on a large root, so a stream asked
  // for beside it waited as long and the page read "connecting" until then. A stream that cannot open
  // holds nothing back for long.
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    const es = new EventSource('/api/events');
    const wait = setTimeout(() => setAsking(true), 1500);
    es.onopen = () => { setLive('live'); setAsking(true); };
    es.onerror = () => { setLive('offline'); setAsking(true); };
    es.addEventListener('change', e => {
      const d = JSON.parse(e.data);
      invalidate();
      setFiles(f => [...new Set([...f, ...d.paths])].slice(-40));
      setVersion(v => v + 1);
    });
    return () => { clearTimeout(wait); es.close(); };
  }, []);
  const { data: root, error } = useData(asking ? api.root : null, version);
  const { data: top } = useData(root ? api.node(ROOT) : null, version);
  const prev = useRef(null);

  const announce = text => { setMessage(''); requestAnimationFrame(() => setMessage(text)); };

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
  useEffect(() => { setSpine(false); }, [route.view, route.id]);

  useEffect(() => {
    const on = e => {
      const t = e.target;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const r = parseHash(), dossier = r.view === 'part' || r.view === 'composition', l = lensOf(r);
      if (e.key === '?') { e.preventDefault(); setHelp(true); }
      else if (e.key === '[' || e.key === ']') { e.preventDefault(); dispatchEvent(new CustomEvent('explorer:step', { detail: e.key === ']' ? 1 : -1 })); }
      else if (['1', '2', '3'].includes(e.key) && !t.closest?.('.react-flow')) dispatchEvent(new CustomEvent('explorer:center', { detail: Number(e.key) }));
      // The lenses: r Read, a Attention, w Workbench; h the root, in the lens the reader is in.
      else if (['r', 'a', 'w'].includes(e.key)) { e.preventDefault(); location.hash = lensHref(r, { r: 'read', a: 'attention', w: 'work' }[e.key]).slice(1); }
      else if (e.key === 'h') { e.preventDefault(); location.hash = hrefFor({ view: 'node', params: l === 'read' ? {} : { lens: l } }).slice(1); }
      // In the Workbench, b a dossier's claims and m its chart or system.
      else if (e.key === 'b' && dossier && r.params.view === 'model') { e.preventDefault(); setParams({ view: null, lens: 'work' }, { push: true }); }
      else if (e.key === 'm' && dossier && r.params.view !== 'model') { e.preventDefault(); setParams({ view: 'model', lens: null }, { push: true }); }
      else if ((e.key === 'j' || e.key === 'k') && !t.closest?.('.react-flow') && focusSibling('[data-nav]', e.key === 'j' ? 1 : -1)) e.preventDefault();
      else if (e.key === 'Escape' && l === 'read' && (r.params.claim || r.params.behavior) && !document.querySelector('[role="dialog"]')) { e.preventDefault(); setParams({ claim: null, behavior: null, dossier: null }); }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);

  const dossier = route.view === 'part' || route.view === 'composition';
  const page = error ? <Failed error={error} />
    : !root ? <Loading what="the dossiers" />
    : lens === 'attention' ? <AttentionPage key={`a:${route.view}:${route.id}`} route={route} />
    : lens === 'work' ? (dossier ? <Workbench route={route} /> : <Board key={`w:${route.id}`} route={route} />)
    : dossier ? <DossierRead key={`r:${route.view}:${route.id}`} route={route} /> : <NodeRead key={`r:${route.id}`} route={route} />;
  return (
    <AppContext.Provider value={{ version, announce, root, changes, colorMode, narrow }}>
      <div className="app">
        <button type="button" className="skip" onClick={() => document.getElementById('main')?.focus()}>Skip to content</button>
        <TopBar title={root?.title || 'Dossiers'} lens={lens} route={route} total={top?.attention?.total} live={live} theme={theme} setTheme={setThemeState}
          onPalette={() => setPalette(true)} onHelp={() => setHelp(true)} onMap={() => setSpine(s => !s)} narrow={narrow} />
        <Ribbon changes={changes} files={files} since={since ? `since ${shortTime(since)}` : ''} onDismiss={() => { setChanges([]); setFiles([]); setSince(null); }} />
        <div className={`frame${narrow ? ' is-narrow' : ''}${spine ? ' spine-open' : ''}`}>
          {root && <Spine root={root} route={route} lens={lens} here={hereOf(root, route)} onNavigate={() => setSpine(false)} />}
          {narrow && spine && <button type="button" className="scrim" aria-label="Close the map" onClick={() => setSpine(false)} />}
          <main id="main" className="main" tabIndex={-1}><ViewBoundary at={`${hrefFor(route)} ${version}`}>{page}</ViewBoundary></main>
        </div>
        <Palette isOpen={palette} onOpenChange={setPalette} />
        <Help isOpen={help} onOpenChange={setHelp} />
        <LiveRegion message={message} />
      </div>
    </AppContext.Provider>
  );
}

// A dossier in the Workbench: its claims in full, with every mapping, run, review and record, and its chart
// or its system: the prose beside the statechart, the grid and the walks, or the members, wiring and cells.
function Workbench({ route }) {
  const { root } = useApp();
  const model = route.params.view === 'model';
  const d = root?.dossiers.find(x => x.kind === route.view && x.id === route.id);
  const other = route.view === 'part' ? 'Chart' : 'System';
  return <div className="wb">
    <div className="wb-bar">
      <b>{d?.title || route.id}</b><span className="mono muted">{route.id}</span>
      <nav className="wb-tabs" aria-label="Workbench views">
        <a className={model ? '' : 'is-on'} aria-current={model ? undefined : 'page'} href={hrefFor({ view: route.view, id: route.id, params: { lens: 'work', from: route.params.from } })}>Claims</a>
        <a className={model ? 'is-on' : ''} aria-current={model ? 'page' : undefined} href={hrefFor({ view: route.view, id: route.id, params: { view: 'model', from: route.params.from } })}>{other}</a>
      </nav>
      <span className="top-gap" />
      <a className="small" href={hrefFor({ view: route.view, id: route.id })}>Read</a>
    </div>
    <div className="wb-body"><DossierView key={`${route.view}:${route.id}`} kind={route.view} id={route.id} params={route.params} /></div>
  </div>;
}
