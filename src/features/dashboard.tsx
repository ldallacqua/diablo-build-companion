import {
  ArrowRight,
  ScanLine,
  Sparkles,
  CircleDot,
  GitBranch,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useApp } from '../app/store';
import { nextSkill, nextParagon, readiness } from '../domain/progression';
import { evaluate } from '../domain/recommendations';
import { AssetIcon, Badge, Button, Empty, LinkAction, Meter, Panel } from '../components/ui';
import type { Page } from '../shared/i18n';
export function Dashboard({ navigate }: { navigate: (page: Page) => void }) {
  const { state } = useApp();
  const build = state.builds[state.active],
    future = state.builds[state.active === 'leveling' ? 'endgame' : 'leveling'];
  const skill = nextSkill(build, state.skillProgress[build?.id ?? ''] ?? []),
    paragon = nextParagon(build, state.paragonProgress[build?.id ?? ''] ?? []),
    gate = readiness(state);
  const skillDone = state.skillProgress[build?.id ?? '']?.length ?? 0;
  const rec = state.lastItem
    ? evaluate(state.lastItem, build, future, state.equipped[state.lastItem.slot])
    : null;
  return (
    <div className="page dashboard">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR JOURNEY, IN FOCUS</span>
          <h1>Welcome back, {state.character.name}.</h1>
          <p>Every choice brings your build closer.</p>
        </div>
        <Badge tone="green">
          <span className="status-dot" />
          Local & offline
        </Badge>
      </div>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            {build?.class ?? 'YOUR CHARACTER'} · {state.active.toUpperCase()}
          </span>
          <h2>{build?.name ?? 'Begin your next chapter'}</h2>
          <p>
            {build
              ? 'Your plan for the path ahead. Track your progress and find the gear that belongs in it.'
              : 'Add a leveling build and an endgame build to create your personal progression plan.'}
          </p>
          <Button variant="primary" onClick={() => navigate(build ? 'advisor' : 'builds')}>
            {build ? <ScanLine size={16} /> : <GitBranch size={16} />}{' '}
            {build ? 'Evaluate an item' : 'Configure your builds'}
            <ArrowRight size={16} />
          </Button>
          <div className="hero-meta">
            <span>
              LEVEL <b>{state.character.level}</b>
            </span>
            <span>
              PARAGON <b>{state.character.paragon}</b>
            </span>
            <span>{build?.season ?? 'Season unspecified'}</span>
          </div>
        </div>
        <div className="hero-symbol">
          <Shield size={44} />
        </div>
      </section>
      {build?.patch === 'Unverified' && (
        <div className="quiet-note">
          <CircleDot size={14} />
          {build.attribution}. Verify details against your current patch.
        </div>
      )}
      <div className="objective-grid">
        <Panel
          eyebrow="NEXT SKILL POINT"
          title={skill?.name ?? 'Skill plan'}
          action={<Sparkles size={18} />}
        >
          <div className="objective-body">
            {skill ? (
              <>
                <AssetIcon id={`skill.${skill.id}`} icon={Sparkles} />
                <div>
                  <h3>
                    Rank {skill.rank}
                    {skill.upgrade ? ` · ${skill.upgrade}` : ''}
                  </h3>
                  <p>{skill.reason}</p>
                </div>
              </>
            ) : (
              <p>
                {build?.skills.length
                  ? 'Your supplied skill sequence is complete.'
                  : 'Add an ordered skill sequence in Builds.'}
              </p>
            )}
          </div>
          <Meter
            value={build?.skills.length ? (skillDone / build.skills.length) * 100 : 0}
            label="Skill sequence completion"
          />
          <LinkAction onClick={() => navigate('skills')}>View skill progression</LinkAction>
        </Panel>
        <Panel
          eyebrow="PARAGON OBJECTIVE"
          title={paragon?.board ?? 'The path beyond'}
          action={<CircleDot size={18} />}
        >
          <div className="objective-body">
            <AssetIcon id={`paragon.${paragon?.id ?? 'none'}`} />
            <div>
              <h3>{paragon?.glyph ?? 'Milestone guidance'}</h3>
              <p>{paragon?.objective ?? 'Add board and glyph milestones from your guide.'}</p>
            </div>
          </div>
          <LinkAction onClick={() => navigate('paragon')}>Explore milestones</LinkAction>
        </Panel>
        <Panel
          eyebrow="BUILD TRANSITION"
          title={
            state.active === 'endgame'
              ? 'Endgame active'
              : gate.ready
                ? 'Ready for endgame'
                : 'Preparing for endgame'
          }
          action={<GitBranch size={18} />}
        >
          <div className="transition-stat">
            <strong>
              {gate.checks.filter((x) => x.met).length}
              <em> / {gate.checks.length}</em>
            </strong>
            <p>configured conditions met</p>
          </div>
          <Meter
            value={
              gate.checks.length
                ? (gate.checks.filter((x) => x.met).length / gate.checks.length) * 100
                : 0
            }
            label="Transition readiness"
          />
          <LinkAction onClick={() => navigate('builds')}>Review your next build</LinkAction>
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          eyebrow="ITEM ADVISOR"
          title="Your last discovery"
          action={<LinkAction onClick={() => navigate('advisor')}>Open advisor</LinkAction>}
        >
          {state.lastItem && rec ? (
            <button className="last-item" onClick={() => navigate('advisor')}>
              <AssetIcon id={`item.${state.lastItem.slot}`} icon={CircleDot} />
              <div>
                <Badge tone={rec.verdict === 'NEEDS REVIEW' ? 'amber' : 'green'}>
                  {rec.verdict}
                </Badge>
                <h3>{state.lastItem.name}</h3>
                <p>{rec.headline}</p>
              </div>
              <ChevronRight size={20} />
            </button>
          ) : (
            <Empty
              icon={ScanLine}
              title="Great gear deserves a second look"
              action={<Button onClick={() => navigate('advisor')}>Scan your first item</Button>}
            >
              Capture a tooltip or upload a screenshot to compare it with both builds.
            </Empty>
          )}
        </Panel>
        <Panel eyebrow="YOUR WORKSPACE" title="Made for the way you play">
          <div className="workspace-note">
            <ScanLine />
            <div>
              <h3>One shortcut. A clearer decision.</h3>
              <p>Hover over an item, then press your capture shortcut.</p>
              <kbd>{state.settings.captureHotkey.replace('CommandOrControl', 'Ctrl')}</kbd>
            </div>
          </div>
          <div className="workspace-note">
            <Shield />
            <div>
              <h3>Your data stays with you.</h3>
              <p>
                Builds, item text and progress are stored on this device. Screenshots stay in
                memory.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
