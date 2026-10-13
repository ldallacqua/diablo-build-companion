import { useEffect, useRef, useState } from 'react';
import {
  ScanLine,
  Upload,
  CircleDot,
  Sparkles,
  Pencil,
  Check,
  Swords,
  Archive,
  ShieldQuestion,
} from 'lucide-react';
import { useApp } from '../app/store';
import { catalogue, parseItem } from '../domain/parser';
import { evaluate } from '../domain/recommendations';
import { exampleTooltip } from '../data/examples';
import { AssetIcon, Badge, Button, Empty, Panel } from '../components/ui';
export function Advisor() {
  const { state, update, busy, preview, timing, capture, scanImage, message } = useApp();
  const [raw, setRaw] = useState(state.lastItem?.raw ?? ''),
    [editing, setEditing] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setRaw(state.lastItem?.raw ?? '');
  }, [state.lastItem]);
  const item = state.lastItem,
    active = state.builds[state.active],
    future = state.builds[state.active === 'leveling' ? 'endgame' : 'leveling'];
  const rec = item ? evaluate(item, active, future, state.equipped[item.slot]) : null;
  const safe = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      message(String(e));
    }
  };
  function confirm() {
    update((s) => ({
      ...s,
      lastItem: parseItem(raw, catalogue(Object.values(s.builds)), 100, true),
    }));
    setEditing(false);
  }
  const stash = rec?.verdict === 'STASH FOR ENDGAME';
  return (
    <div className="page advisor">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEE THE VALUE BEYOND THE DROP</span>
          <h1>Item advisor</h1>
          <p>A thoughtful second opinion, grounded in both of your builds.</p>
        </div>
        <div className="actions">
          <Button onClick={() => file.current?.click()} disabled={busy}>
            <Upload size={16} />
            Upload screenshot
          </Button>
          <Button variant="primary" onClick={() => void safe(capture)} disabled={busy}>
            <ScanLine size={16} />
            {busy ? 'Reading tooltip…' : 'Capture in 3 seconds'}
          </Button>
        </div>
      </div>
      <input
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Item screenshot"
        className="sr-only"
        onChange={(e) => {
          const image = e.target.files?.[0];
          if (!image) return;
          if (image.size > 20 * 1024 * 1024) {
            message('Use an image smaller than 20 MB.');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => void safe(() => scanImage(String(reader.result)));
          reader.readAsDataURL(image);
          e.target.value = '';
        }}
      />
      {busy && (
        <div className="scan-status" role="status">
          <span className="spinner" />
          Reading on this device. Keep the tooltip steady during capture.
        </div>
      )}
      <div className="advisor-grid">
        <Panel
          title="Recognized item"
          eyebrow="TOOLTIP INSPECTION"
          className="item-panel"
          action={
            item && (
              <Badge tone={item.confidence >= 85 ? 'green' : 'amber'}>
                {item.confirmed ? 'User confirmed' : `${item.confidence}% recognition`}
              </Badge>
            )
          }
        >
          {item ? (
            <>
              <div className={`item-heading rarity-${item.rarity}`}>
                <AssetIcon id={`item.${item.slot}`} icon={CircleDot} />
                <div>
                  <span className="eyebrow">
                    {item.rarity} · {item.slot}
                  </span>
                  <h2>{item.name}</h2>
                  <p>{item.power ? `${item.power} Item Power` : 'Item power unrecognized'}</p>
                </div>
              </div>
              <div className="divider" />
              <span className="eyebrow">RECOGNIZED AFFIXES</span>
              <ul className="affix-list">
                {item.affixes.map((a) => (
                  <li key={a.id}>
                    <span className={`affix-marker ${a.greater ? 'greater' : ''}`}>
                      {a.greater ? <Sparkles size={13} /> : <CircleDot size={8} />}
                    </span>
                    <span>
                      {a.value !== undefined ? (
                        <b>
                          +{a.value}
                          {a.unit === 'percent' ? '%' : ''}{' '}
                        </b>
                      ) : null}
                      {a.label}
                    </span>
                    {rec?.futureMatches.some((m) => m.label === a.label) && (
                      <Badge tone="gold">Future build</Badge>
                    )}
                  </li>
                ))}
              </ul>
              {item.aspects.length > 0 && (
                <div className="power-box">
                  <Sparkles size={17} />
                  <div>
                    <span className="eyebrow">POWER REFERENCE</span>
                    {item.aspects.map((a) => (
                      <p key={a}>{a}</p>
                    ))}
                  </div>
                </div>
              )}
              {item.tempering.map((t) => (
                <p key={t} className="quiet-note">
                  Tempering: {t}
                </p>
              ))}
              {item.masterworking && <p className="quiet-note">{item.masterworking}</p>}
              {item.unknownLines.length > 0 && (
                <div className="unknown-box">
                  <b>Unrecognized text</b>
                  {item.unknownLines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                  <small>These lines are preserved for review.</small>
                </div>
              )}
              <div className="item-footer">
                <Button onClick={() => setEditing(!editing)}>
                  <Pencil size={14} />
                  Review or correct
                </Button>
                <Button
                  disabled={item.slot === 'unknown' || item.confidence < 75}
                  onClick={() =>
                    update((s) => ({ ...s, equipped: { ...s.equipped, [item.slot]: item } }))
                  }
                >
                  <Swords size={14} />
                  Record as equipped
                </Button>
              </div>
              {timing > 0 && (
                <small className="muted">
                  OCR finished in {(timing / 1000).toFixed(2)} s · image kept in memory
                </small>
              )}
            </>
          ) : (
            <Empty icon={ScanLine} title="What did you find?">
              Upload an item screenshot, capture the configured region, or enter tooltip text below.
            </Empty>
          )}
          {preview && (
            <details className="preview">
              <summary>View captured image</summary>
              <img src={preview} alt="Tooltip screenshot used for the current scan" />
            </details>
          )}
        </Panel>
        <div className="advisor-right">
          <Panel
            title="The verdict"
            eyebrow="YOUR TWO-BUILD PERSPECTIVE"
            className={`verdict-panel ${stash ? 'stash' : ''}`}
          >
            {rec ? (
              <>
                <div className="verdict-icon">
                  {stash ? (
                    <Archive size={27} />
                  ) : rec.verdict === 'NEEDS REVIEW' ? (
                    <ShieldQuestion size={27} />
                  ) : (
                    <Check size={27} />
                  )}
                </div>
                <Badge tone={rec.verdict === 'NEEDS REVIEW' ? 'amber' : stash ? 'gold' : 'green'}>
                  {rec.verdict}
                </Badge>
                <h2>{rec.headline}</h2>
                <ul className="reason-list">
                  {rec.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                <div className="verdict-builds">
                  <div>
                    <span className="eyebrow">ACTIVE BUILD</span>
                    <strong>{active?.name ?? 'No build'}</strong>
                    <small>{rec.activeMatches.length} priorities matched</small>
                  </div>
                  <div>
                    <span className="eyebrow">OTHER BUILD</span>
                    <strong>{future?.name ?? 'No build'}</strong>
                    <small>{rec.futureMatches.length} priorities matched</small>
                  </div>
                </div>
                <div className="cautions">
                  {rec.cautions.map((c) => (
                    <p key={c}>
                      <CircleDot size={11} />
                      {c}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <Empty icon={Sparkles} title="A decision with a reason">
                The advisor explains each match and keeps uncertainty visible.
              </Empty>
            )}
          </Panel>
          <div className="advisor-tip">
            <ShieldQuestion size={19} />
            <p>
              Recognition confidence combines OCR quality and parser coverage. Confirm corrections
              before making a decision.
            </p>
          </div>
        </div>
      </div>
      <Panel
        title={editing ? 'Correct tooltip text' : 'Manual tooltip input'}
        eyebrow="YOU HAVE THE FINAL SAY"
        className="correction"
      >
        <p>
          One line each: item name, rarity and slot, item power, then affixes. Use “Aspect: name” to
          identify a power. All other text stays available for review.
        </p>
        <textarea
          aria-label="Tooltip text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'ITEM NAME\nLegendary Ring\n800 Item Power\n+10% Critical Strike Chance'}
        />
        <div className="actions">
          <Button variant="primary" disabled={!raw.trim()} onClick={confirm}>
            <Check size={15} />
            Confirm corrected text
          </Button>
          <Button
            onClick={() => {
              setRaw(exampleTooltip);
              setEditing(true);
            }}
          >
            Load synthetic example
          </Button>
        </div>
      </Panel>
    </div>
  );
}
