import { Archive, ScanLine, ExternalLink, Minimize2, X, ShieldQuestion } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useApp } from '../app/store';
import { evaluate } from '../domain/recommendations';
import { Badge, Logo } from '../components/ui';
import { FrameOrnaments } from '../components/gameTheme';
export function Overlay() {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (card.current)
        void window.sanctum?.resizeOverlay(
          Math.max(190, Math.min(650, Math.ceil(card.current.getBoundingClientRect().height + 10))),
        );
    });
    if (card.current) observer.observe(card.current);
    return () => observer.disconnect();
  }, []);
  const { state, busy } = useApp();
  const item = state.lastItem;
  const rec = item
    ? evaluate(
        item,
        state.builds[state.active],
        state.builds[state.active === 'leveling' ? 'endgame' : 'leveling'],
        state.equipped[item.slot],
      )
    : null;
  return (
    <div ref={card} className={`overlay ${state.settings.compact ? 'compact' : ''}`}>
      <FrameOrnaments />
      <header className="overlay-drag">
        <Logo />
        <span>SANCTUM</span>
        <span className="overlay-buttons">
          <button aria-label="Open companion" onClick={() => void window.sanctum?.showMain()}>
            <ExternalLink size={13} />
          </button>
          <button aria-label="Hide overlay" onClick={() => void window.sanctum?.toggleOverlay()}>
            <X size={15} />
          </button>
        </span>
      </header>
      <div className="overlay-content">
        <div className="overlay-verdict-icon">
          {busy ? (
            <ScanLine className="pulse" />
          ) : rec?.verdict === 'STASH FOR ENDGAME' ? (
            <Archive />
          ) : rec?.verdict === 'NEEDS REVIEW' ? (
            <ShieldQuestion />
          ) : (
            <Minimize2 />
          )}
        </div>
        <div>
          <Badge tone={rec?.verdict === 'NEEDS REVIEW' ? 'amber' : 'gold'}>
            {busy ? 'READING TOOLTIP' : (rec?.verdict ?? 'READY TO ADVISE')}
          </Badge>
          <h2>{item?.name ?? 'A clearer view of your gear'}</h2>
          <p>{rec?.headline ?? 'Hover over a tooltip and use your capture shortcut.'}</p>
        </div>
      </div>
      {!state.settings.compact && (
        <div className="overlay-explanation">
          {rec?.reasons.slice(0, 2).map((r, i) => (
            <p key={i}>{r}</p>
          ))}
          <div className="overlay-bottom">
            <span>{state.builds[state.active]?.name ?? 'Configure your builds'}</span>
            <span>
              {item?.confirmed
                ? 'Confirmed'
                : item
                  ? `${item.confidence}% confidence`
                  : 'Local processing'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
