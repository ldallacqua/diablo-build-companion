import { useRef, useState } from 'react';
import { ArrowRight, Check, Download, GitBranch, Pencil, Upload, ExternalLink } from 'lucide-react';
import { useApp } from '../app/store';
import { Button, Badge, Panel, CheckRow, FocusScope } from '../components/ui';
import { readiness, transition } from '../domain/progression';
import { canonical } from '../domain/parser';
import { attachBuild, emptyBuild, jsonImporter, maxrollReference } from '../services/importers';
import { BuildSchema, type Build } from '../domain/models';
export function exportJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Editor({ build, onClose }: { build: Build; onClose: () => void }) {
  const { state, update, message } = useApp();
  const [name, setName] = useState(build.name),
    [cls, setCls] = useState(build.class),
    [source, setSource] = useState(build.sourceUrl ?? ''),
    [priorities, setPriorities] = useState(
      build.affixes.map((a) => `${a.priority}: ${a.label}`).join('\n'),
    ),
    [skills, setSkills] = useState(
      build.skills
        .map((s) => `${s.name} | ${s.rank}${s.upgrade ? ` | ${s.upgrade}` : ''}`)
        .join('\n'),
    ),
    [json, setJson] = useState(JSON.stringify(build, null, 2));
  function save(advanced = false) {
    try {
      const value = advanced
        ? jsonImporter.import(json)
        : BuildSchema.parse({
            ...build,
            name,
            class: cls,
            sourceUrl: source ? maxrollReference(source) : undefined,
            updatedAt: new Date().toISOString(),
            affixes: priorities
              .split('\n')
              .filter((x) => x.trim())
              .map((line) => {
                const match = line.match(/^(primary|secondary):\s*(.+)$/i);
                const label = match?.[2] ?? line.trim();
                const old = build.affixes.find((a) => canonical(a.label) === canonical(label));
                return {
                  ...old,
                  id: old?.id ?? canonical(label).replace(/ /g, '-'),
                  label,
                  priority: match?.[1].toLowerCase() ?? 'primary',
                };
              }),
            skills: skills
              .split('\n')
              .filter((x) => x.trim())
              .map((line, i) => {
                const [skill, rank, upgrade] = line.split('|').map((s) => s.trim());
                const old = build.skills.find((s) => s.name === skill && s.rank === Number(rank));
                return {
                  id: old?.id ?? `${canonical(skill).replace(/ /g, '-')}-${rank}-${i}`,
                  name: skill,
                  rank: Number(rank),
                  upgrade: upgrade || undefined,
                };
              }),
          });
      update(attachBuild(state, value));
      onClose();
    } catch (e) {
      message(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <FocusScope className="modal-backdrop" onEscape={onClose}>
      <section
        className="modal editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <span className="eyebrow">BUILD WORKSHOP</span>
        <h2 id="editor-title">Edit {build.stage} build</h2>
        <div className="form-grid">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Character class
            <input value={cls} onChange={(e) => setCls(e.target.value)} />
          </label>
        </div>
        <label>
          Maxroll reference URL (optional)
          <input
            placeholder="https://maxroll.gg/d4/…"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Affix priorities
            <textarea
              value={priorities}
              onChange={(e) => setPriorities(e.target.value)}
              placeholder={'primary: Critical Strike Chance\nsecondary: Maximum Life'}
            />
            <small>One exact affix label per line. Prefix primary: or secondary:.</small>
          </label>
          <label>
            Ordered skill allocations
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={'Spark | 1\nSpark | 2\nChain Lightning | 1'}
            />
            <small>Skill name | target rank | optional upgrade.</small>
          </label>
        </div>
        <div className="actions">
          <Button variant="primary" onClick={() => save()}>
            Save build
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
        <details className="advanced">
          <summary>Full JSON editor: boards, dependencies, roll targets & metadata</summary>
          <p>
            Validate and save this version separately. See the sample export for the versioned
            schema.
          </p>
          <textarea
            aria-label="Build JSON"
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
          <Button onClick={() => save(true)}>Validate & save JSON</Button>
        </details>
      </section>
    </FocusScope>
  );
}
export function Builds() {
  const { state, update, message } = useApp();
  const [editing, setEditing] = useState<Build | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const gate = readiness(state);
  const action = (name: 'accept' | 'postpone' | 'return') => {
    try {
      update(transition(state, name));
    } catch (e) {
      message(String(e));
    }
  };
  function toggleRequirement(id: string) {
    const req = gate.checks.find((r) => r.id === id);
    if (!req) return;
    if (req.kind === 'level' || req.kind === 'skillCount' || req.kind === 'paragonCount') return;
    update((s) => {
      const key =
        req.kind === 'unique'
          ? 'ownedUniques'
          : req.kind === 'aspect'
            ? 'ownedAspects'
            : 'manualRequirements';
      const target = req.kind === 'manual' ? `${s.builds.endgame!.id}:${id}` : req.target!;
      return {
        ...s,
        [key]: s[key].includes(target) ? s[key].filter((x) => x !== target) : [...s[key], target],
      };
    });
  }
  return (
    <div className="page builds">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ONE JOURNEY. TWO CHAPTERS.</span>
          <h1>Builds & transition</h1>
          <p>Keep your current priorities and future ambitions together.</p>
        </div>
        <Button onClick={() => input.current?.click()}>
          <Upload size={15} />
          Import build JSON
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Build JSON file"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            if (f.size > 1024 * 1024) throw new Error('Build JSON must be smaller than 1 MB.');
            update(attachBuild(state, jsonImporter.import(await f.text())));
          } catch (error) {
            message(String(error));
          }
          e.target.value = '';
        }}
      />
      <div className="build-pair">
        {(['leveling', 'endgame'] as const).map((stage) => {
          const b = state.builds[stage];
          return (
            <Panel
              key={stage}
              eyebrow={`${stage.toUpperCase()} BUILD`}
              title={b?.name ?? `Your ${stage} build`}
              className={state.active === stage ? 'active-build' : ''}
              action={
                <Badge tone={state.active === stage ? 'green' : 'muted'}>
                  {state.active === stage ? 'Active' : 'Planned'}
                </Badge>
              }
            >
              <div className="build-meta">
                <b>{b?.class ?? 'No class selected'}</b>
                <span>
                  {b?.season ?? 'Unspecified'} · {b?.patch ?? 'Unverified'}
                </span>
              </div>
              <div className="divider" />
              <span className="eyebrow">GEAR PRIORITIES</span>
              <div className="priority-chips">
                {b?.affixes.map((a) => (
                  <Badge key={a.id} tone={a.priority === 'primary' ? 'gold' : 'muted'}>
                    {a.label}
                  </Badge>
                )) ?? <p>Add priorities from your guide.</p>}
              </div>
              <div className="build-detail">
                <span>Legendary powers</span>
                <strong>{b?.aspects.join(', ') || 'Not supplied'}</strong>
              </div>
              <div className="build-detail">
                <span>Unique dependencies</span>
                <strong>{b?.uniques.join(', ') || 'Not supplied'}</strong>
              </div>
              <div className="build-detail">
                <span>Skill / Paragon steps</span>
                <strong>
                  {b?.skills.length ?? 0} / {b?.paragon.length ?? 0}
                </strong>
              </div>
              <div className="build-detail">
                <span>Tempering</span>
                <strong>{b?.tempering.join(' · ') || 'Not supplied'}</strong>
              </div>
              <div className="build-detail">
                <span>Masterworking</span>
                <strong>{b?.masterworking.join(' · ') || 'Not supplied'}</strong>
              </div>
              <p className="attribution">
                {b?.attribution ?? 'User-provided builds remain on this device.'}
                {b?.updatedAt && (
                  <span>
                    Updated {b.updatedAt.slice(0, 10)} · {b.coverage} coverage
                  </span>
                )}
              </p>
              <div className="actions">
                <Button onClick={() => setEditing(b ?? emptyBuild(stage))}>
                  <Pencil size={14} />
                  Edit {stage} build
                </Button>
                {b && (
                  <Button variant="ghost" onClick={() => exportJson(`${stage}-build`, b)}>
                    <Download size={14} />
                    JSON
                  </Button>
                )}
              </div>
              {b?.sourceUrl && (
                <button
                  className="source-link"
                  onClick={() => {
                    if (window.sanctum)
                      void window.sanctum.openLink(b.sourceUrl!).catch((e) => message(String(e)));
                  }}
                >
                  <ExternalLink size={12} />
                  Open Maxroll reference
                </button>
              )}
            </Panel>
          );
        })}
      </div>
      <Panel
        eyebrow="ENDGAME READINESS"
        title={
          state.active === 'endgame'
            ? 'Your endgame chapter is active'
            : gate.ready
              ? 'Your next chapter is ready'
              : 'Prepare the transition'
        }
        className="transition-panel"
        action={<GitBranch size={23} />}
      >
        <div className="transition-layout">
          <div>
            <p>
              Readiness follows your configured prerequisites. Confirm ownership and manual steps;
              update level and progression as you play.
            </p>
            <label className="inline-input">
              Character level
              <input
                aria-label="Character level"
                type="number"
                min={1}
                max={1000}
                value={state.character.level}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 1 && Number.isInteger(value))
                    update((s) => ({
                      ...s,
                      character: { ...s.character, level: Math.min(value, 1000) },
                    }));
                }}
              />
            </label>
            <div className="actions">
              {state.active === 'endgame' ? (
                <Button onClick={() => action('return')}>Return to leveling</Button>
              ) : (
                <>
                  <Button variant="primary" disabled={!gate.ready} onClick={() => action('accept')}>
                    Accept endgame transition
                    <ArrowRight size={15} />
                  </Button>
                  <Button onClick={() => action('postpone')}>Postpone</Button>
                </>
              )}
            </div>
            {state.transition === 'postponed' && (
              <small className="muted">
                Transition postponed. You can accept when the required conditions are met.
              </small>
            )}
          </div>
          <div className="requirements">
            {gate.checks.length ? (
              gate.checks.map((r) => (
                <CheckRow
                  key={r.id}
                  checked={r.met}
                  label={r.label}
                  detail={`${r.required ? 'Required' : 'Optional'}${['level', 'skillCount', 'paragonCount'].includes(r.kind) ? ' · updated from recorded progression' : ' · click to confirm'}`}
                  onChange={() => toggleRequirement(r.id)}
                />
              ))
            ) : (
              <p>
                No prerequisites supplied. Add explicit conditions in the full JSON editor before
                transitioning.
              </p>
            )}
          </div>
        </div>
      </Panel>
      <div className="import-note">
        <Check size={18} />
        <div>
          <h3>Bring your guide. Keep its attribution.</h3>
          <p>
            Maxroll URLs are saved as references. Automated retrieval is unavailable in this version
            because a permitted interface was not verified. Copy your priorities into the editor or
            import your own structured JSON. Guide text and assets are never redistributed.
          </p>
        </div>
      </div>
      {editing && <Editor build={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
