import { useState } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  Sparkles,
  Compass,
  GitBranch,
  Settings2,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import { StoreProvider, useApp } from './store';
import { AssetIcon, Badge, Button, Logo, FocusScope } from '../components/ui';
import { Dashboard } from '../features/dashboard';
import { Advisor } from '../features/advisor';
import { Builds } from '../features/builds';
import { Skills, Paragon } from '../features/progression';
import { Settings } from '../features/settings';
import { Overlay } from '../features/overlay';
import { withExamples } from '../data/examples';
import { messages, type Page } from '../shared/i18n';
import { GameTheme } from '../components/gameTheme';
const pages: { id: Page; icon: typeof ScanLine }[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'advisor', icon: ScanLine },
  { id: 'skills', icon: Sparkles },
  { id: 'paragon', icon: Compass },
  { id: 'builds', icon: GitBranch },
  { id: 'settings', icon: Settings2 },
];
function Workspace() {
  const { state, ready, error, message, update } = useApp();
  const [page, setPage] = useState<Page>('dashboard');
  const isOverlay = window.location.hash === '#overlay';
  if (!ready)
    return (
      <div className="loading-screen">
        <Logo />
        <p>Opening your Sanctum…</p>
      </div>
    );
  if (isOverlay) {
    document.documentElement.classList.add('overlay-html');
    document.title = 'Sanctum Overlay';
    document.body.classList.add('overlay-body');
    return (
      <>
        <GameTheme />
        <Overlay />
      </>
    );
  }
  const labels = messages[state.settings.language];
  return (
    <div className="app-shell">
      <GameTheme />
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div>
            <strong>SANCTUM</strong>
            <small>DIABLO IV COMPANION</small>
          </div>
        </div>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {pages.map(({ id, icon: Icon }) => (
            <button
              key={id}
              aria-current={page === id ? 'page' : undefined}
              className={page === id ? 'active' : ''}
              onClick={() => setPage(id)}
            >
              <Icon size={18} />
              {labels[id]}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="overlay-toggle"
            onClick={() => {
              if (window.sanctum) void window.sanctum.toggleOverlay();
              else message('Use the Windows app to open the overlay.');
            }}
          >
            <Layers size={17} />
            <span>Open overlay</span>
            <ArrowRight size={14} />
          </button>
          <div className="character-mini">
            <AssetIcon
              id={`class.${state.builds[state.active]?.class.toLowerCase() ?? 'unknown'}`}
            />
            <div>
              <strong>{state.character.name}</strong>
              <small>
                {state.builds[state.active]?.class ?? 'No build'} · Level {state.character.level}
              </small>
            </div>
          </div>
          <small className="version">v0.2.0 · Independent companion</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <span className="slash">/</span>
            <b>{labels[page]}</b>
          </div>
          <div>
            <span className="status-dot" />
            <span>On this device</span>
            <Badge tone="gold">{state.builds[state.active]?.class ?? 'LOCAL FIRST'}</Badge>
          </div>
        </header>
        <main>
          {page === 'dashboard' ? (
            <Dashboard navigate={setPage} />
          ) : page === 'advisor' ? (
            <Advisor />
          ) : page === 'skills' ? (
            <Skills />
          ) : page === 'paragon' ? (
            <Paragon />
          ) : page === 'builds' ? (
            <Builds />
          ) : (
            <Settings />
          )}
        </main>
        <footer className="app-footer">
          <span>Independent tool. Not affiliated with or approved by Blizzard Entertainment.</span>
          <span>SANCTUM · YOUR BUILD, IN FOCUS</span>
        </footer>
      </div>
      {error && (
        <div className="toast" role="alert">
          <p>{error}</p>
          <button aria-label="Dismiss message" onClick={() => message('')}>
            <X size={17} />
          </button>
        </div>
      )}
      {!state.onboarded && (
        <FocusScope className="modal-backdrop onboarding-backdrop">
          <section
            className="modal onboarding"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <div className="onboard-art" />
            <Logo />
            <span className="eyebrow">WELCOME TO SANCTUM</span>
            <h1 id="welcome-title">
              Your build.
              <br />
              Your next chapter.
            </h1>
            <p>
              A local companion for thoughtful gear decisions and a clearer path from leveling to
              endgame.
            </p>
            <div className="onboarding-points">
              <span>
                <ScanLine size={17} />
                Screenshot item advisor
              </span>
              <span>
                <GitBranch size={17} />
                Two builds, one journey
              </span>
              <span>
                <Compass size={17} />
                Progress at your pace
              </span>
            </div>
            <Button variant="primary" onClick={() => update(withExamples(state))}>
              Explore with example builds
              <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" onClick={() => update((s) => ({ ...s, onboarded: true }))}>
              Start with my own builds
            </Button>
            <small>
              The examples are synthetic and illustrative. Replace them with your current guide
              before making game decisions. In-game compatibility is unverified; use the standalone
              companion if needed.
            </small>
          </section>
        </FocusScope>
      )}
    </div>
  );
}
export function App() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  );
}
