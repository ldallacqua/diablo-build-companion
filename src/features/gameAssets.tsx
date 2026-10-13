import { useEffect, useState } from 'react';
import { FolderOpen, Download, Palette, Search, X } from 'lucide-react';
import { useApp } from '../app/store';
import { Badge, Button, Panel } from '../components/ui';
import type { GameInspection, GameLibrary, GameResource } from '../shared/gameAssets';
import { resourceAsset, starterAssets, starterBindings } from '../services/gameAssets';

function ResourceImage({ resource }: { resource: GameResource }) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void window.sanctum?.readGameResource(resource.key).then((src) => {
      if (active) setImage(src);
    });
    return () => {
      active = false;
    };
  }, [resource.key, resource.checksum]);
  return image ? (
    <img src={image} alt="" loading="lazy" />
  ) : (
    <span className="muted">Unavailable</span>
  );
}
export function GameAssetLibrary() {
  const { state, update, message } = useApp();
  const [library, setLibrary] = useState<GameLibrary | null>(null),
    [inspection, setInspection] = useState<GameInspection | null>(null),
    [progress, setProgress] = useState(''),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<GameResource | null>(null),
    [role, setRole] = useState('texture.panel.frame'),
    [extraAtlas, setExtraAtlas] = useState('');
  useEffect(() => {
    void window.sanctum
      ?.gameLibrary()
      .then(setLibrary)
      .catch((e) => message(String(e)));
    return window.sanctum?.onGameProgress(setProgress);
  }, []);
  async function inspect() {
    if (!window.sanctum) {
      message('Game archive extraction requires the Windows application.');
      return;
    }
    setBusy(true);
    try {
      setInspection(await window.sanctum.inspectGame());
    } catch (error) {
      message(String(error));
    } finally {
      setBusy(false);
    }
  }
  async function extract(names?: string[]) {
    if (!window.sanctum) return;
    setBusy(true);
    try {
      const result = await window.sanctum.extractGame(names);
      setLibrary(result);
      setPage(0);
      update((s) => ({
        ...s,
        assets: s.assets.filter((a) => !a.gameBuild || a.gameBuild === result.build),
      }));
    } catch (error) {
      message(String(error));
    } finally {
      setBusy(false);
      setProgress('');
    }
  }
  function applyTheme() {
    if (!library) return;
    const assets = starterAssets(library);
    if (!assets.some((a) => a.id === 'texture.panel.frame')) {
      message('Extract the core UI pack before applying its theme.');
      return;
    }
    const ids = new Set(assets.map((a) => a.id));
    update((s) => ({
      ...s,
      assets: [
        ...s.assets.filter((a) => !ids.has(a.id) && !a.id.startsWith('texture.corner.')),
        ...assets,
      ],
      settings: { ...s.settings, gameTheme: true },
    }));
  }
  function assign() {
    if (!library || !selected) return;
    try {
      const asset = resourceAsset(role, selected, library.build);
      update((s) => ({ ...s, assets: [...s.assets.filter((a) => a.id !== asset.id), asset] }));
      setSelected(null);
    } catch {
      message('Use a semantic ID such as texture.panel.frame, class.sorcerer or skill.spark-1.');
    }
  }
  const matches =
    library?.resources.filter(
      (r) =>
        (r.handle !== undefined || r.derived) &&
        r.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const visible = matches.slice(page * 24, page * 24 + 24);
  return (
    <Panel
      className="game-library"
      eyebrow="YOUR INSTALLED GAME"
      title="Diablo IV asset library"
      action={<FolderOpen size={20} />}
    >
      <p>
        Read UI artwork from your installed Steam copy. Extracted borders, corners and icons stay in
        your private cache.
      </p>
      <div className="actions">
        <Button onClick={() => void inspect()} disabled={busy}>
          <FolderOpen size={15} />
          Choose game folder
        </Button>
        <Button onClick={() => void extract()} disabled={busy || !inspection}>
          <Download size={15} />
          Extract core UI pack
        </Button>
        <Button variant="primary" onClick={applyTheme} disabled={busy || !library}>
          <Palette size={15} />
          Use Diablo IV theme
        </Button>
      </div>
      {busy && (
        <div className="game-progress" role="status">
          <span className="status-dot" />
          {progress || 'Opening local game archives…'}
          <Button variant="ghost" onClick={() => void window.sanctum?.cancelGameExtraction()}>
            <X size={13} />
            Cancel
          </Button>
        </div>
      )}
      {inspection && (
        <p className="game-library-status">
          <Badge tone="gold">Build {inspection.build}</Badge>{' '}
          {inspection.textures.length.toLocaleString()} UI atlases found
        </p>
      )}
      {inspection && (
        <details className="game-extra">
          <summary>Extract another UI atlas</summary>
          <div className="actions">
            <select
              aria-label="Additional UI atlas"
              value={extraAtlas}
              onChange={(e) => setExtraAtlas(e.target.value)}
            >
              <option value="">Choose an atlas…</option>
              {inspection.textures.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} · {t.frames} sprites
                </option>
              ))}
            </select>
            <Button disabled={busy || !extraAtlas} onClick={() => void extract([extraAtlas])}>
              Extract selected atlas
            </Button>
          </div>
        </details>
      )}
      {library && (
        <>
          <div className="game-library-toolbar">
            <span>
              {library.resources.length.toLocaleString()} cached images · build {library.build}
            </span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={state.settings.gameTheme}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, gameTheme: e.target.checked },
                  }))
                }
              />
              Game artwork enabled
            </label>
          </div>
          <label className="game-search">
            <Search size={15} />
            <input
              aria-label="Search extracted game art"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Find frames, buttons, class skills or inventory icons…"
            />
          </label>
          {selected && (
            <div className="game-assignment">
              <div className="game-selected">
                <ResourceImage resource={selected} />
              </div>
              <div>
                <strong>{selected.name}</strong>
                <p>
                  {selected.width} × {selected.height} ·{' '}
                  {selected.derived
                    ? 'assembled from original frame pieces'
                    : 'original atlas sprite'}
                </p>
                <label>
                  Assign image to
                  <input
                    aria-label="Game asset semantic ID"
                    list="game-asset-roles"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </label>
                <datalist id="game-asset-roles">
                  {Object.keys(starterBindings).map((id) => (
                    <option key={id} value={id} />
                  ))}
                  {['tl', 'tr', 'bl', 'br'].map((corner) => (
                    <option key={corner} value={`texture.corner.${corner}`} />
                  ))}
                  <option value="skill.spark-1" />
                  <option value="class.sorcerer" />
                  <option value="item.ring" />
                </datalist>
                <div className="actions">
                  <Button variant="primary" onClick={assign}>
                    Assign selected image
                  </Button>
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="game-resource-grid">
            {visible.map((r) => (
              <button
                className="game-resource"
                key={r.key}
                onClick={() => setSelected(r)}
                aria-label={`Select ${r.name}`}
              >
                <span className="game-resource-image">
                  <ResourceImage resource={r} />
                </span>
                <strong>{r.name.split(' / ')[0].replace(/^2DUI_?/, '')}</strong>
                <small>
                  {r.derived ? 'Assembled' : r.handle} · {r.width} × {r.height}
                </small>
              </button>
            ))}
          </div>
          <div className="game-pagination">
            <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>
              {matches.length ? page + 1 : 0} / {Math.ceil(matches.length / 24)}
            </span>
            <Button
              disabled={(page + 1) * 24 >= matches.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
          {library.skipped.length > 0 && (
            <details className="game-extra">
              <summary>{library.skipped.length} resources were skipped</summary>
              {library.skipped.map((r, i) => (
                <p key={i}>
                  <strong>{r.name}</strong> — {r.reason}
                </p>
              ))}
            </details>
          )}
        </>
      )}
      {!library && (
        <div className="game-library-empty">
          <span>01 · Choose installation</span>
          <span>02 · Extract original sprites</span>
          <span>03 · Apply theme or assign icons</span>
        </div>
      )}
      <small className="muted">
        Steam static archives are supported. Encrypted or unavailable entries are skipped. Game
        artwork stays in your local cache and is excluded from this project's commits, installers
        and build exports. Theme composition follows Sanctum’s layout.
      </small>
    </Panel>
  );
}
