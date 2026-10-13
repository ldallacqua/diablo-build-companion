import { Check, ChevronRight, Compass, Sparkles, CircleDot } from 'lucide-react';
import { useApp } from '../app/store';
import { nextSkill } from '../domain/progression';
import { AssetIcon, Badge, Button, CheckRow, Empty, Meter, Panel } from '../components/ui';
export function Skills() {
  const { state, update } = useApp();
  const build = state.builds[state.active],
    done = state.skillProgress[build?.id ?? ''] ?? [],
    next = nextSkill(build, done);
  const toggle = (id: string) => {
    if (!build) return;
    update((s) => ({
      ...s,
      skillProgress: {
        ...s.skillProgress,
        [build.id]: done.includes(id) ? done.filter((x) => x !== id) : [...done, id],
      },
    }));
  };
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A POINT WITH PURPOSE</span>
          <h1>Skill progression</h1>
          <p>Follow the allocation sequence supplied in {build?.name ?? 'your build'}.</p>
        </div>
        <Badge tone="gold">{state.active} plan</Badge>
      </div>
      <div className="progression-layout">
        <Panel
          eyebrow="YOUR NEXT ALLOCATION"
          title={next?.name ?? 'Your skill path'}
          className="next-skill"
        >
          {next ? (
            <>
              <AssetIcon id={`skill.${next.id}`} icon={Sparkles} />
              <h3>Rank {next.rank}</h3>
              {next.upgrade && <p>{next.upgrade}</p>}
              <p>{next.reason}</p>
              <Button variant="primary" onClick={() => toggle(next.id)}>
                <Check size={15} />
                Mark allocated
              </Button>
            </>
          ) : (
            <Empty
              icon={Sparkles}
              title={build?.skills.length ? 'Sequence complete' : 'No allocations supplied'}
            >
              Add the ordered skills from your guide in Builds.
            </Empty>
          )}
          <div className="divider" />
          <span className="eyebrow">PLAN PROGRESS</span>
          <h3>
            {done.filter((id) => build?.skills.some((s) => s.id === id)).length} /{' '}
            {build?.skills.length ?? 0} allocations
          </h3>
          <Meter
            value={build?.skills.length ? (done.length / build.skills.length) * 100 : 0}
            label="Skill allocations"
          />
          <small className="muted">
            Recorded manually. The app does not allocate points in game.
          </small>
        </Panel>
        <Panel title="The allocation path" eyebrow="YOUR SUPPLIED SEQUENCE">
          <div className="skill-path">
            {build?.skills.length ? (
              build.skills.map((skill, i) => (
                <div
                  key={skill.id}
                  className={`skill-step ${done.includes(skill.id) ? 'complete' : ''} ${next?.id === skill.id ? 'current' : ''}`}
                >
                  <span className="step-number">
                    {done.includes(skill.id) ? <Check size={15} /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <AssetIcon id={`skill.${skill.id}`} icon={Sparkles} />
                  <div>
                    <h3>{skill.name}</h3>
                    <p>
                      Rank {skill.rank}
                      {skill.upgrade ? ` · ${skill.upgrade}` : ''}
                    </p>
                  </div>
                  <button
                    aria-label={`${done.includes(skill.id) ? 'Undo' : 'Allocate'} ${skill.name} rank ${skill.rank}`}
                    className="icon-button"
                    onClick={() => toggle(skill.id)}
                  >
                    {done.includes(skill.id) ? <Check size={17} /> : <ChevronRight size={17} />}
                  </button>
                </div>
              ))
            ) : (
              <Empty icon={Sparkles} title="A plan starts with your guide">
                Import or enter a skill sequence. No allocations are generated automatically.
              </Empty>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
export function Paragon() {
  const { state, update } = useApp();
  const build = state.builds[state.active],
    done = state.paragonProgress[build?.id ?? ''] ?? [];
  const toggle = (id: string) => {
    if (!build) return;
    update((s) => ({
      ...s,
      paragonProgress: {
        ...s.paragonProgress,
        [build.id]: done.includes(id) ? done.filter((x) => x !== id) : [...done, id],
      },
    }));
  };
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE PATH BEYOND</span>
          <h1>Paragon milestones</h1>
          <p>Board order, glyph priorities and objectives from your imported plan.</p>
        </div>
        <Badge tone="gold">{state.active} plan</Badge>
      </div>
      <Panel className="paragon-summary">
        <Compass size={35} />
        <div>
          <span className="eyebrow">RECORDED PROGRESSION</span>
          <h2>{state.character.paragon} Paragon points</h2>
          <p>
            {done.length} of {build?.paragon.length ?? 0} milestones complete
          </p>
        </div>
        <label>
          Paragon points
          <input
            type="number"
            min={0}
            max={10000}
            value={state.character.paragon}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isInteger(value) && value >= 0 && value <= 10000)
                update((s) => ({ ...s, character: { ...s.character, paragon: value } }));
            }}
          />
        </label>
      </Panel>
      {build?.paragon.length ? (
        <div className="board-grid">
          {build.paragon.map((milestone, i) => (
            <Panel
              key={milestone.id}
              className={`board-card ${done.includes(milestone.id) ? 'complete' : ''}`}
              eyebrow={`BOARD ${String(i + 1).padStart(2, '0')}`}
              title={milestone.board}
              action={
                done.includes(milestone.id) ? (
                  <Badge tone="green">Complete</Badge>
                ) : (
                  <CircleDot size={18} />
                )
              }
            >
              <div className="glyph-medallion">
                <AssetIcon id={`paragon.${milestone.id}`} icon={Compass} />
              </div>
              <h3>{milestone.glyph ?? 'No glyph supplied'}</h3>
              <p>{milestone.objective}</p>
              <CheckRow
                checked={done.includes(milestone.id)}
                label="Milestone completed"
                onChange={() => toggle(milestone.id)}
              />
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty icon={Compass} title="Your Paragon path is waiting">
            Add board and glyph milestones from a reliable guide using the build JSON editor.
          </Empty>
        </Panel>
      )}
      <div className="quiet-note">
        <CircleDot size={14} />
        Milestones follow your plan. Node routing and board connectivity are not supplied by this
        MVP.
      </div>
    </div>
  );
}
