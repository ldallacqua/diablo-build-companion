import { describe, expect, it } from 'vitest';
import {
  resourceAsset,
  starterAssets,
  upgradeStarterTheme,
  applyStarterTheme,
} from '../../src/services/gameAssets';
import { skillArtworkId } from '../../src/services/gameSkillIcons';
import type { GameLibrary, GameResource } from '../../src/shared/gameAssets';

const resource = (key: string): GameResource => ({
  key,
  name: 'Original fixture',
  sno: 1,
  width: 8,
  height: 8,
  filename: 'a'.repeat(64) + '.png',
  checksum: 'a'.repeat(64),
});
const library: GameLibrary = {
  schemaVersion: 1,
  build: 'test',
  extractedAt: '2026-10-13T00:00:00.000Z',
  skipped: [],
  resources: [
    '0.369421',
    '125986.2159923079',
    '125986.2522874592',
    '87142.1281178120',
    '87142.4147712587',
  ].map(resource),
};
describe('private theme recipe upgrades', () => {
  it('replaces the broken preset while preserving manual assets and customized theme bindings', () => {
    const generic = resourceAsset('texture.icon.generic', resource('357858.3274051761'), 'test');
    const oldButton = resourceAsset('texture.button', resource('125986.621170354'), 'test');
    const customButton = resourceAsset('texture.button.primary', resource('99.10'), 'test');
    const manual = {
      ...resourceAsset('class.sorcerer', resource('99.11'), 'test'),
      resourceKey: undefined,
      gameBuild: undefined,
    };
    const result = upgradeStarterTheme([generic, oldButton, customButton, manual], library);
    expect(result).toContainEqual(manual);
    expect(result).toContainEqual(customButton);
    expect(result.find((a) => a.id === 'texture.button')?.resourceKey).toBe('125986.2159923079');
    expect(result.some((a) => a.id === 'texture.icon.generic')).toBe(false);
    expect(upgradeStarterTheme(result, library)).toBe(result);
  });
  it('resolves verified skills by class and exact normalized name without guessing unknown skills', () => {
    expect(skillArtworkId('Sorcerer', 'Chain Lightning')).toBe('skill.sorcerer.chainlightning');
    expect(skillArtworkId('Sorcerer', 'Spark')).toBe('skill.sorcerer.spark');
    expect(skillArtworkId('Barbarian', 'Spark')).toBeUndefined();
    expect(skillArtworkId('Sorcerer', 'Some lightning thing')).toBeUndefined();
    expect(
      starterAssets(library)
        .filter((a) => a.id.startsWith('skill.'))
        .map((a) => a.id),
    ).toEqual(['skill.sorcerer.chainlightning', 'skill.sorcerer.spark']);
  });
  it('keeps manually assigned skill artwork when the theme is reapplied', () => {
    const assigned = resourceAsset('skill.sorcerer.spark', resource('77.88'), 'test');
    expect(applyStarterTheme([assigned], library).find((a) => a.id === assigned.id)).toEqual(
      assigned,
    );
  });
});
