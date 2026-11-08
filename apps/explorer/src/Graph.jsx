// The canvas: React Flow with real DOM nodes, laid out and routed by ELK. Nodes are focusable;
// arrow keys move to the nearest node in that direction, Enter opens, Escape clears.
import { useCallback, useRef } from 'react';
import { BaseEdge, Background, BackgroundVariant, Controls, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { roundedPath } from './layout.js';

const HIDDEN = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0, pointerEvents: 'none' };
const Ports = () => (
  <>
    <Handle type="target" position={Position.Top} style={HIDDEN} isConnectable={false} />
    <Handle type="source" position={Position.Bottom} style={HIDDEN} isConnectable={false} />
  </>
);
const cx = (...names) => names.filter(Boolean).join(' ');
const flags = d => cx(d.selected && 'is-selected', d.hover && 'is-hover', d.current && 'is-current', d.visited && 'is-visited', d.faded && 'is-faded');

function StateNode({ data: d }) {
  return (
    <div className={cx('n n-state', d.compound && 'is-compound', d.final && 'is-final', flags(d))} data-family={d.family} style={{ width: d.w, height: d.h }}>
      <Ports />
      <div className="n-title">
        <span className="n-name">{d.name}</span>
        {d.aside && <span className="n-aside">{d.aside}</span>}
        {d.glyph && <span className="n-glyph" title={d.glyphTitle}>{d.glyph}</span>}
      </div>
      {(d.lines || []).map((line, i) => {
        const id = d.lineIds?.[i];
        return (
          <div key={i} className={cx('n-line', id && d.activeLines?.has(id) && 'is-active', id && d.selLine === id && 'is-selected')} data-family={d.lineFamilies?.[i]}
            onClick={e => { if (id) { e.stopPropagation(); d.onLine?.(id); } }}>{line}</div>
        );
      })}
    </div>
  );
}

function BoxNode({ data: d }) {
  return (
    <div className={cx('n', `n-${d.kind}`, flags(d))} data-family={d.family} data-mode={d.mode} style={{ width: d.w, height: d.h }}>
      <Ports />
      <div className="n-title"><span className="n-name">{d.name}</span>{d.aside && <span className="n-aside">{d.aside}</span>}</div>
      {(d.lines || []).map((line, i) => <div key={i} className={cx('n-sub', d.lineFamilies?.[i] && 'is-flag')} data-family={d.lineFamilies?.[i]}>{line}</div>)}
    </div>
  );
}

const InitNode = () => <div className="n-init"><Ports /></div>;

function RoutedEdge({ id, data: d, markerEnd }) {
  const path = roundedPath(d.points || []);
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={14}
        className={cx('e-path', flags(d))} style={{ stroke: `var(--edge-${d.family || 'neutral'})`, strokeDasharray: d.dash }} />
      {d.label && (
        <EdgeLabelRenderer>
          <div className={cx('e-label nodrag nopan', flags(d))} data-family={d.family}
            style={{ transform: `translate(${d.label.x}px, ${d.label.y}px)`, minWidth: d.label.w }} onClick={() => d.onSelect?.()}>
            {d.label.text}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { state: StateNode, box: BoxNode, init: InitNode };
const edgeTypes = { routed: RoutedEdge };

export const arrowHead = family => ({ type: MarkerType.ArrowClosed, width: 14, height: 14, color: `var(--edge-${family || 'neutral'})` });

// The nearest node in the direction of an arrow key, from node centres.
function nearest(current, nodes, key) {
  const c = n => ({ x: n.position.x + (n.width || 0) / 2, y: n.position.y + (n.height || 0) / 2 });
  const o = c(current);
  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  let best = null, score = Infinity;
  for (const n of nodes) {
    if (n.id === current.id || n.type === 'init' || n.focusable === false) continue;
    const p = c(n), dx = p.x - o.x, dy = p.y - o.y;
    const ahead = key === 'ArrowRight' ? dx > 4 : key === 'ArrowLeft' ? dx < -4 : key === 'ArrowDown' ? dy > 4 : dy < -4;
    if (!ahead) continue;
    const s = (horizontal ? Math.abs(dx) : Math.abs(dy)) + 2 * (horizontal ? Math.abs(dy) : Math.abs(dx));
    if (s < score) { score = s; best = n; }
  }
  return best;
}

function Flow({ graphKey, nodes, edges, onSelect, onActivate, onHover, label, colorMode, bounds }) {
  const wrap = useRef(null);
  // Fit the whole layout, arrows and labels included, at no more than a little over full size.
  const fit = useCallback(instance => {
    const el = wrap.current;
    if (!el || !bounds?.width) { instance.fitView({ padding: 0.12, duration: 0, maxZoom: 1.1 }); return; }
    const W = el.clientWidth, H = el.clientHeight, pad = 28;
    const zoom = Math.max(0.2, Math.min(1.1, (W - 2 * pad) / bounds.width, (H - 2 * pad) / bounds.height));
    instance.setViewport({ x: (W - bounds.width * zoom) / 2, y: (H - bounds.height * zoom) / 2, zoom }, { duration: 0 });
  }, [bounds?.width, bounds?.height]);
  const onKeyDown = useCallback(e => {
    const el = document.activeElement?.closest?.('.react-flow__node');
    if (!el || !wrap.current?.contains(el)) return;
    const id = el.getAttribute('data-id');
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate ? onActivate(id) : onSelect?.(id, 'node'); return; }
    if (e.key === 'Escape') { onSelect?.(null); return; }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    e.stopPropagation();
    const current = nodes.find(n => n.id === id);
    const next = current && nearest(current, nodes, e.key);
    if (!next) return;
    wrap.current.querySelector(`.react-flow__node[data-id="${CSS.escape(next.id)}"]`)?.focus();
    onSelect?.(next.id, 'node');
  }, [nodes, onSelect, onActivate]);
  return (
    <div className="graph" ref={wrap} onKeyDownCapture={onKeyDown} role="group" aria-label={label}>
      <ReactFlow key={graphKey} nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} colorMode={colorMode}
        onNodeClick={(_, n) => onSelect?.(n.id, 'node')} onEdgeClick={(_, ed) => onSelect?.(ed.id, 'edge')}
        onNodeDoubleClick={(_, n) => onActivate?.(n.id)} onPaneClick={() => onSelect?.(null)}
        onNodeMouseEnter={(_, n) => onHover?.(n.id, 'node')} onNodeMouseLeave={() => onHover?.(null)}
        onEdgeMouseEnter={(_, ed) => onHover?.(ed.id, 'edge')} onEdgeMouseLeave={() => onHover?.(null)}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} nodesFocusable edgesFocusable={false}
        onInit={fit} minZoom={0.2} maxZoom={2.5} panOnScroll zoomOnScroll={false} zoomOnPinch>
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

export function Graph(props) {
  return <ReactFlowProvider><Flow {...props} /></ReactFlowProvider>;
}
