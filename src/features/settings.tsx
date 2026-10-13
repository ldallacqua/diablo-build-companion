import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Monitor,
  Keyboard,
  Layers,
  ImagePlus,
  Shield,
  Trash2,
  Check,
} from 'lucide-react';
import { useApp } from '../app/store';
import { SettingsSchema, type Settings as SettingsType } from '../domain/models';
import { Badge, Button, Panel } from '../components/ui';
import { exportJson } from './builds';
import type { DisplayInfo } from '../shared/bridge';
import { decodeState } from '../services/storage';
export function Settings() {
  const backup = useRef<HTMLInputElement>(null);
  const { state, update, message } = useApp();
  const [draft, setDraft] = useState(state.settings),
    [displays, setDisplays] = useState<DisplayInfo[]>([]),
    [saved, setSaved] = useState(false),
    [assetId, setAssetId] = useState('class.sorcerer'),
    [license, setLicense] = useState(''),
    [source, setSource] = useState(''),
    [erase, setErase] = useState(false);
  useEffect(() => {
    if (window.sanctum)
      void window.sanctum
        .displays()
        .then(setDisplays)
        .catch((e) => message(String(e)));
  }, []);
  const change = (key: keyof SettingsType, value: unknown) => {
    setDraft((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };
  async function save() {
    try {
      const settings = SettingsSchema.parse(draft);
      if (settings.captureHotkey === settings.overlayHotkey)
        throw new Error('Capture and overlay shortcuts must differ.');
      const errors = await window.sanctum?.applySettings(settings);
      if (errors?.length) throw new Error(errors.join(' '));
      update((s) => ({ ...s, settings }));
      setSaved(true);
    } catch (e) {
      message(String(e));
    }
  }
  async function importAsset() {
    try {
      if (!window.sanctum) throw new Error('Asset importing requires the Windows app.');
      const asset = await window.sanctum.importAsset({
        id: assetId,
        category: assetId.split('.')[0],
        source,
        license,
        compatiblePatch: '*',
      });
      if (asset)
        update((s) => ({ ...s, assets: [...s.assets.filter((a) => a.id !== asset.id), asset] }));
    } catch (e) {
      message(String(e));
    }
  }
  return (
    <div className="page settings">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR COMPANION, YOUR WAY</span>
          <h1>Settings</h1>
          <p>Fine-tune your workspace and keep control of your data.</p>
        </div>
        <Button variant="primary" onClick={() => void save()}>
          <Check size={16} />
          {saved ? 'Settings saved' : 'Save settings'}
        </Button>
      </div>
      <div className="settings-grid">
        <Panel
          eyebrow="CAPTURE"
          title="A frame for your discoveries"
          action={<Monitor size={19} />}
        >
          <p className="muted">
            Coordinates are logical pixels relative to the selected display. The app captures one
            frame when requested.
          </p>
          <label>
            Display
            <select value={draft.displayId} onChange={(e) => change('displayId', e.target.value)}>
              <option value="">Primary display</option>
              {displays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.width} × {d.height} · {Math.round(d.scale * 100)}%
                </option>
              ))}
            </select>
          </label>
          <div className="region-grid">
            {(['x', 'y', 'width', 'height'] as const).map((key) => (
              <label key={key}>
                {key.toUpperCase()}
                <input
                  type="number"
                  min={key === 'x' || key === 'y' ? 0 : 40}
                  max={12000}
                  value={draft.region[key]}
                  onChange={(e) => {
                    setDraft((s) => ({
                      ...s,
                      region: { ...s.region, [key]: Number(e.target.value) },
                    }));
                    setSaved(false);
                  }}
                />
              </label>
            ))}
          </div>
          <div className="capture-diagram">
            <span className="capture-outline">
              <ScanMark />
              Your tooltip region
            </span>
          </div>
          <small className="muted">
            Borderless mode is the intended setup. Exclusive fullscreen and protected surfaces may
            return blank frames. Screenshot upload remains available.
          </small>
        </Panel>
        <Panel
          eyebrow="SHORTCUTS & OVERLAY"
          title="Close to the action"
          action={<Keyboard size={19} />}
        >
          <label>
            Capture shortcut
            <input
              value={draft.captureHotkey}
              onChange={(e) => change('captureHotkey', e.target.value)}
            />
          </label>
          <label>
            Show / hide overlay
            <input
              value={draft.overlayHotkey}
              onChange={(e) => change('overlayHotkey', e.target.value)}
            />
          </label>
          <label>
            Overlay opacity · {Math.round(draft.overlayOpacity * 100)}%
            <input
              type="range"
              min=".35"
              max="1"
              step=".01"
              value={draft.overlayOpacity}
              onChange={(e) => change('overlayOpacity', Number(e.target.value))}
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={draft.overlayEnabled}
              onChange={(e) => change('overlayEnabled', e.target.checked)}
            />
            Show scan results in overlay
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={draft.compact}
              onChange={(e) => change('compact', e.target.checked)}
            />
            Compact overlay
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={draft.clickThrough}
              onChange={(e) => change('clickThrough', e.target.checked)}
            />
            Click through overlay
          </label>
          <small className="muted">
            Use the hide shortcut to recover a click-through window. Drag the overlay header to
            position it.
          </small>
          <Button
            onClick={() => {
              if (window.sanctum) void window.sanctum.toggleOverlay();
              else message('Overlay requires the Windows application.');
            }}
          >
            <Layers size={15} />
            Show / hide overlay
          </Button>
        </Panel>
        <Panel eyebrow="PROFILE" title="Make it yours">
          <label>
            Character name
            <input
              value={state.character.name}
              maxLength={80}
              onChange={(e) =>
                update((s) => ({ ...s, character: { ...s.character, name: e.target.value } }))
              }
            />
          </label>
          <label>
            Navigation language
            <select value={draft.language} onChange={(e) => change('language', e.target.value)}>
              <option value="en">English</option>
              <option value="pt-BR">Português (Brasil) — navigation preview</option>
            </select>
          </label>
          <p className="muted">
            English tooltip recognition. Full Portuguese translation and OCR are planned.
          </p>
          <div className="privacy-note">
            <Shield size={20} />
            <p>
              No account, telemetry or cloud service. This version has no game memory access, game
              hooks or gameplay controls.
            </p>
          </div>
        </Panel>
        <Panel
          eyebrow="PERSONAL ASSET LIBRARY"
          title="A touch of your own"
          action={<ImagePlus size={19} />}
        >
          <p className="muted">
            Import PNG, JPEG or WebP images you are authorized to use. Game archive extraction is
            unavailable.
          </p>
          <label>
            Semantic asset ID
            <input
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="skill.spark-1"
            />
          </label>
          <div className="form-grid">
            <label>
              Source
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Original artwork by me"
              />
            </label>
            <label>
              License / permission
              <input
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                placeholder="I own this artwork"
              />
            </label>
          </div>
          <Button disabled={!source || !license} onClick={() => void importAsset()}>
            <ImagePlus size={15} />
            Choose & import image
          </Button>
          <div className="asset-library">
            {state.assets.map((a) => (
              <div key={a.id}>
                <Badge tone="gold">{a.id}</Badge>
                <small>{a.license}</small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel eyebrow="LOCAL DATA" title="Your data belongs to you" className="data-settings">
          <p>
            Export your complete workspace before clearing builds, progress, item text and private
            imported assets. Screenshots are never written to disk.
          </p>
          <div className="actions">
            <Button onClick={() => exportJson('sanctum-workspace', state)}>
              <Download size={15} />
              Export workspace
            </Button>
            <Button onClick={() => backup.current?.click()}>Import workspace</Button>
            <Button variant="danger" onClick={() => setErase(true)}>
              <Trash2 size={15} />
              Clear local data
            </Button>
          </div>
          <input
            ref={backup}
            type="file"
            className="sr-only"
            accept=".json,application/json"
            aria-label="Workspace backup"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 5 * 1024 * 1024)
                  throw new Error('Workspace backup must be smaller than 5 MB.');
                const value = decodeState(JSON.parse(await file.text()));
                const errors = await window.sanctum?.applySettings(value.settings);
                if (errors?.length) throw new Error(errors.join(' '));
                update(value);
                setDraft(value.settings);
              } catch (error) {
                message(String(error));
              }
              e.target.value = '';
            }}
          />
          {erase && (
            <div className="delete-confirm" role="alert">
              <p>Clear all Sanctum data on this device? This cannot be undone.</p>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    const fresh = window.sanctum ? await window.sanctum.clearData() : null;
                    if (fresh) update(fresh);
                    else {
                      localStorage.removeItem('sanctum.v2');
                      window.location.reload();
                    }
                    setErase(false);
                  } catch (e) {
                    message(String(e));
                  }
                }}
              >
                Confirm clear
              </Button>
              <Button onClick={() => setErase(false)}>Cancel</Button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
function ScanMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 2H2v4m12-4h4v4M2 14v4h4m8 0h4v-4M4 10h12" fill="none" stroke="currentColor" />
    </svg>
  );
}
