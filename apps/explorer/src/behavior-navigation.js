// Navigation uses the report's identities. It does not infer evidence or standing.
const DOSSIER = /^(parts|compositions)\/([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/;
export function dossierHref(dossier, params = {}) {
  const match = DOSSIER.exec(dossier || '');
  if (!match) return null;
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''));
  return `#/${match[1] === 'parts' ? 'part' : 'composition'}/${match[2]}${query.size ? `?${query}` : ''}`;
}
export const behaviorHref = (dossier, behavior, claim) => dossierHref(dossier, { behavior, claim });
export const evidenceHref = evidence => dossierHref(evidence.dossier, { view: 'model', tab: 'evidence', entry: evidence.entry });
export function targetHref(target) {
  if (!target || target.kind === 'knowledge') return null;
  const part = target.dossier?.startsWith('parts/');
  if (target.kind === 'passage') return dossierHref(target.dossier, { view: 'model', sel: target.id, tab: part ? 'detail' : 'properties' });
  if (target.kind === 'cell') return dossierHref(target.dossier, { view: 'model', tab: 'cells', cell: `${target.property}:${target.scenario}`, scenario: target.scenario });
  if (target.kind === 'walk') return dossierHref(target.dossier, { view: 'model', sel: target.id, tab: part ? 'play' : 'walks', play: part ? `walk:${target.id}:0` : null, scenario: target.scenario });
  return null;
}
export function unassociatedHref(item, dossier) {
  if (item.kind === 'scenario') return dossierHref(dossier, { view: 'model', scenario: item.scenario, tab: 'cells' });
  return targetHref({ ...item, dossier, ...(item.kind === 'cell' ? { property: item.id } : {}) });
}
// A target in a few characters: the dossier is named only when it is another one, such as a member.
export function targetLabel(target, dossier) {
  if (target.kind === 'knowledge') return target.ref;
  const id = target.kind === 'cell' ? target.property : target.kind === 'answer' ? target.check : target.id;
  const scenario = target.kind === 'answer' ? target.question.scenario : target.scenario;
  const where = target.dossier === dossier ? '' : `${target.dossier.split('/')[1]} `;
  return `${where}${id}${scenario ? ` × ${scenario}` : ''}`;
}

// A README may list its behaviors in reading order, for a reader of the file. The page lists the
// behaviors once, in its outline, so that list leaves the orientation, with a line that only
// introduces it, and the words after each link become the behavior's subtitle.
const LIST_ITEM = /^\s*(?:[-*]|\d+\.)\s+/;
export function splitOrientation(text, dossier, order = []) {
  const lines = String(text || '').split(/\r?\n/), out = [], blurbs = {};
  const behaviorOf = href => {
    let url;
    try { url = new URL(href, `https://dossier.invalid/${dossier}/README.md`); } catch { return null; }
    const match = /^\/((?:parts|compositions)\/[^/]+)\/behaviors\/([^/]+)\.md$/.exec(decodeURIComponent(url.pathname));
    return match && match[1] === dossier && order.includes(match[2]) ? match[2] : null;
  };
  for (let i = 0; i < lines.length; i++) {
    if (!LIST_ITEM.test(lines[i])) { out.push(lines[i]); continue; }
    let end = i;
    while (end < lines.length && LIST_ITEM.test(lines[end])) end++;
    const items = lines.slice(i, end).map(line => /^\s*(?:[-*]|\d+\.)\s+\[[^\]]+\]\(([^)]+)\)(.*)$/.exec(line));
    const ids = items.map(item => item && behaviorOf(item[1]));
    if (ids.every(Boolean)) {
      items.forEach((item, k) => { const words = item[2].replace(/^\s*[:—–-]\s*/, '').trim().replace(/\.$/, ''); if (words) blurbs[ids[k]] = words; });
      let last = out.length - 1;
      while (last >= 0 && !out[last].trim()) last--;
      if (last >= 0 && /:\s*$/.test(out[last]) && (last === 0 || !out[last - 1].trim())) out.length = last;
    } else out.push(...lines.slice(i, end));
    i = end - 1;
  }
  return { text: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), blurbs };
}
export function documentHref(href, source) {
  if (/^https?:\/\//.test(href)) return href;
  if (/^[a-z]+:/i.test(href) || href.startsWith('//')) return null;
  let url;
  try { url = new URL(href, `https://dossier.invalid/${source}`); } catch { return null; }
  const path = decodeURIComponent(url.pathname).slice(1);
  const match = /^(parts|compositions)\/([^/]+)\/(.*)$/.exec(path);
  if (!match) return path === 'index.md' ? '#/' : null;
  const dossier = `${match[1]}/${match[2]}`, file = match[3];
  const behavior = /^behaviors\/([^/]+)\.md$/.exec(file);
  if (behavior) return behaviorHref(dossier, behavior[1]);
  if (file === 'README.md') return dossierHref(dossier);
  if (file.startsWith('reviews/')) return dossierHref(dossier, { review: file });
  if (file.startsWith('evidence/')) return dossierHref(dossier, { view: 'model', tab: 'evidence', entry: file.slice(9).replace(/\.(json|md)$/, '') });
  if (file === 'doubts.md') return dossierHref(dossier, { view: 'model', tab: 'play' });
  if (['prose.md', 'wiring.md', 'ledger.md'].includes(file)) return dossierHref(dossier, { view: 'model', tab: file === 'ledger.md' ? 'evidence' : match[1] === 'parts' ? 'detail' : 'properties' });
  return null;
}
