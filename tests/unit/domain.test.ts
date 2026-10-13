import { describe, it, expect } from 'vitest';
import { freshState, BuildSchema } from '../../src/domain/models';
import { parseItem, normalizeOcr, catalogue } from '../../src/domain/parser';
import { evaluate } from '../../src/domain/recommendations';
import { nextSkill, nextParagon, readiness, transition } from '../../src/domain/progression';
import {
  levelingExample as leveling,
  endgameExample as endgame,
  exampleTooltip,
  withExamples,
} from '../../src/data/examples';
import { resolveAsset, fallbackAsset } from '../../src/services/assets';
const rules = catalogue([leveling, endgame]);
describe('tooltip recognition', () => {
  it('normalizes punctuation without inventing uncertain characters', () =>
    expect(normalizeOcr(' A\r\n  +1O%   Attack Speed – “x” ')).toBe('A\n +1O% Attack Speed - "x"'));
  it('parses name, slot, power, decimal rolls and a named power', () => {
    const i = parseItem(exampleTooltip, rules, 95);
    expect(i).toMatchObject({
      name: 'RING OF THE TEMPEST',
      rarity: 'unique',
      slot: 'ring',
      power: 800,
      confidence: 95,
    });
    expect(i.affixes[0]).toMatchObject({
      id: 'critical-strike-chance',
      value: 10.5,
      unit: 'percent',
    });
    expect(i.aspects).toEqual(['Stormweaver']);
  });
  it('recognizes exact aliases and greater affixes', () => {
    const i = parseItem('NEW RING\nLegendary Ring\n800 Item Power\n★ +10% Crit Chance', rules);
    expect(i.affixes[0]).toMatchObject({ id: 'critical-strike-chance', greater: true });
  });
  it('does not mistake an unknown attribute for a fuzzy match', () => {
    const i = parseItem(
      'NEW RING\nLegendary Ring\n800 Item Power\n+10% Critical Strike Damage',
      rules,
    );
    expect(i.affixes).toHaveLength(0);
    expect(i.unknownLines).toContain('+10% Critical Strike Damage');
  });
  it('retains tempering and masterworking text', () => {
    const i = parseItem(exampleTooltip + '\nTempered: custom roll\nMasterworking: 3', rules);
    expect(i.tempering).toEqual(['custom roll']);
    expect(i.masterworking).toBe('Masterworking: 3');
  });
  it('reduces confidence for incomplete descriptors', () =>
    expect(parseItem('ring?\n+10% Attack Speed', rules).confidence).toBeLessThan(75));
  it('keeps ambiguous catalogue labels unresolved', () => {
    const ambiguous = [...rules, { ...rules[0], id: 'other' }];
    expect(parseItem('THING\nRare Ring\n+10 Intelligence', ambiguous).affixes).toHaveLength(0);
  });
});
describe('explainable recommendation rules', () => {
  it('stashes a future-build unique and explains why', () => {
    const rec = evaluate(parseItem(exampleTooltip, rules), leveling, endgame);
    expect(rec.verdict).toBe('STASH FOR ENDGAME');
    expect(rec.futureMatches.some((m) => m.kind === 'unique')).toBe(true);
    expect(rec.reasons.join(' ')).toContain('Stormbound');
  });
  it('updates immediately after switching active builds', () =>
    expect(evaluate(parseItem(exampleTooltip, rules), endgame, leveling).verdict).toBe('KEEP'));
  it('requests review at low OCR confidence', () =>
    expect(evaluate(parseItem(exampleTooltip, rules, 40), leveling, endgame).verdict).toBe(
      'NEEDS REVIEW',
    ));
  it('accepts explicit user correction but still refuses an unknown slot', () =>
    expect(
      evaluate(parseItem('THING\n+10% Attack Speed', rules, 100, true), leveling, endgame).verdict,
    ).toBe('NEEDS REVIEW'));
  it('never recommends discarding unmatched uniques or partial build items', () => {
    const i = parseItem('OTHER ITEM\nUnique Ring\n800 Item Power', rules, 100, true);
    expect(
      evaluate(i, { ...leveling, coverage: 'complete' }, { ...endgame, coverage: 'complete' })
        .verdict,
    ).toBe('NEEDS REVIEW');
    expect(evaluate({ ...i, rarity: 'rare' }, leveling, endgame).verdict).toBe('NEEDS REVIEW');
  });
  it('only suggests salvage with complete builds and no unknown text', () => {
    const a = { ...leveling, coverage: 'complete' as const, affixes: [] },
      b = { ...endgame, coverage: 'complete' as const, affixes: [], uniques: [], aspects: [] };
    const i = parseItem('PLAIN ITEM\nRare Ring\n800 Item Power', rules, 100, true);
    expect(evaluate(i, a, b).verdict).toBe('SALVAGE / SELL CANDIDATE');
    expect(evaluate({ ...i, unknownLines: ['Unreadable power'] }, a, b).verdict).toBe(
      'NEEDS REVIEW',
    );
  });
  it('uses equipped comparable rolls before suggesting an upgrade', () => {
    const current = parseItem(
      'RING\nLegendary Ring\n800 Item Power\n+8% Critical Strike Chance\n+10% Attack Speed',
      rules,
      100,
      true,
    );
    const better = parseItem(
      'RING\nLegendary Ring\n800 Item Power\n+10% Critical Strike Chance\n+12% Attack Speed',
      rules,
      100,
      true,
    );
    expect(evaluate(better, endgame, leveling, current).verdict).toBe('UPGRADE CANDIDATE');
    expect(evaluate(better, endgame, leveling).verdict).toBe('KEEP');
    expect(
      evaluate({ ...better, unknownLines: ['An unknown tradeoff'] }, endgame, leveling, current)
        .verdict,
    ).toBe('KEEP');
  });
  it('does not compare incompatible affix units', () => {
    const current = parseItem(
      'RING\nLegendary Ring\n800 Item Power\n+8% Critical Strike Chance\n+10% Attack Speed',
      rules,
      100,
      true,
    );
    const next = {
      ...current,
      affixes: current.affixes.map((a) => ({ ...a, value: 50, unit: 'flat' as const })),
    };
    expect(evaluate(next, endgame, leveling, current).verdict).toBe('KEEP');
  });
  it('respects slot-specific priorities', () => {
    const i = parseItem(
      'BOOTS\nLegendary Boots\n800 Item Power\n+10% Critical Strike Chance',
      rules,
      100,
      true,
    );
    expect(evaluate(i, leveling, endgame).futureMatches).toHaveLength(0);
  });
});
describe('manual progression and transition', () => {
  it('takes the next supplied skill and board', () => {
    expect(nextSkill(leveling, ['spark-1'])?.id).toBe('spark-2');
    expect(nextParagon(endgame, ['board-1'])?.id).toBe('board-2');
    expect(nextSkill(null, [])).toBeUndefined();
  });
  it('does not transition based exclusively on level', () => {
    const s = withExamples(freshState());
    s.character.level = 70;
    expect(readiness(s).ready).toBe(false);
    expect(() => transition(s, 'accept')).toThrow();
  });
  it('requires all blocking conditions and persists deliberate transitions', () => {
    const s = withExamples(freshState());
    s.character.level = 70;
    s.ownedAspects = ['Stormweaver'];
    s.manualRequirements = ['example-endgame:review'];
    expect(readiness(s).ready).toBe(true);
    const next = transition(s, 'accept');
    expect(next.active).toBe('endgame');
    expect(transition(next, 'return').active).toBe('leveling');
    expect(transition(s, 'postpone').transition).toBe('postponed');
  });
  it('does not infer readiness without prerequisites', () => {
    const s = withExamples(freshState());
    s.builds.endgame = { ...endgame, prerequisites: [] };
    expect(readiness(s).ready).toBe(false);
  });
  it('validates numeric and named prerequisites and distinct IDs', () => {
    expect(() =>
      BuildSchema.parse({
        ...endgame,
        prerequisites: [{ id: 'x', label: 'level', kind: 'level' }],
      }),
    ).toThrow();
    expect(() =>
      BuildSchema.parse({ ...endgame, skills: [endgame.skills[0], endgame.skills[0]] }),
    ).toThrow();
  });
});
describe('asset fallback', () => {
  const asset = {
    id: 'skill.spark',
    category: 'skill',
    filename: 'a.png',
    checksum: '123',
    source: 'me',
    license: 'MIT',
    compatiblePatch: '3.2.1',
  };
  it('selects a compatible asset and safely falls back when absent', () => {
    expect(resolveAsset('skill.spark', [asset], '3.2.1')).toEqual(asset);
    expect(resolveAsset('skill.spark', [asset], '3.0')).toBeUndefined();
    expect(fallbackAsset('skill.spark')).toBe('spark');
    expect(fallbackAsset('paragon.unknown')).toBe('diamond');
  });
});
