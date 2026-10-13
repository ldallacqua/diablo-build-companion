import type { AppState, Build } from './models';
import { canonical } from './parser';
export const nextSkill = (build: Build | null, done: string[]) =>
  build?.skills.find((s) => !done.includes(s.id));
export const nextParagon = (build: Build | null, done: string[]) =>
  build?.paragon.find((s) => !done.includes(s.id));
export function readiness(state: AppState) {
  const build = state.builds.endgame;
  const checks = (build?.prerequisites ?? []).map((p) => {
    let met = false;
    switch (p.kind) {
      case 'level':
        met = state.character.level >= (p.value ?? Infinity);
        break;
      case 'skillCount':
        met =
          (state.skillProgress[build!.id] ?? []).filter((id) =>
            build!.skills.some((s) => s.id === id),
          ).length >= (p.value ?? Infinity);
        break;
      case 'paragonCount':
        met =
          (state.paragonProgress[build!.id] ?? []).filter((id) =>
            build!.paragon.some((s) => s.id === id),
          ).length >= (p.value ?? Infinity);
        break;
      case 'unique':
        met = state.ownedUniques.some((u) => canonical(u) === canonical(p.target ?? ''));
        break;
      case 'aspect':
        met = state.ownedAspects.some((u) => canonical(u) === canonical(p.target ?? ''));
        break;
      case 'manual':
        met = state.manualRequirements.includes(`${build!.id}:${p.id}`);
        break;
    }
    return { ...p, met };
  });
  return {
    checks,
    ready: !!build && checks.length > 0 && checks.filter((p) => p.required).every((p) => p.met),
    missing: checks.filter((p) => p.required && !p.met),
  };
}
export function transition(state: AppState, action: 'accept' | 'postpone' | 'return'): AppState {
  if (action === 'accept' && !readiness(state).ready)
    throw new Error('Complete required transition conditions first.');
  if (action === 'accept') return { ...state, active: 'endgame', transition: 'endgame' };
  if (action === 'postpone') return { ...state, transition: 'postponed' };
  return { ...state, active: 'leveling', transition: 'leveling' };
}
