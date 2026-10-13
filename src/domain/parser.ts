import type { AffixRule, Build, Item, Slot } from './models';

export const canonical = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
export function normalizeOcr(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[’‘]/g, "'")
    .replace(/[–−]/g, '-')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
const slots: [RegExp, Slot][] = [
  [/\b(?:offhand|off-hand|focus|shield|totem)\b/i, 'offhand'],
  [/\b(?:helm|helmet)\b/i, 'helm'],
  [/\b(?:chest|chest armor)\b/i, 'chest'],
  [/\bgloves\b/i, 'gloves'],
  [/\b(?:pants|legs)\b/i, 'pants'],
  [/\bboots\b/i, 'boots'],
  [/\bamulet\b/i, 'amulet'],
  [/\bring\b/i, 'ring'],
  [/\bcharm\b/i, 'charm'],
  [/\bseal\b/i, 'seal'],
  [/\b(?:weapon|sword|staff|wand|dagger|bow|crossbow|axe|mace|scythe|polearm)\b/i, 'weapon'],
];
export function catalogue(builds: (Build | null)[]): AffixRule[] {
  const entries = new Map<string, AffixRule>();
  for (const b of builds)
    for (const r of b?.affixes ?? [])
      entries.set(r.id, {
        ...r,
        aliases: [...new Set([...(entries.get(r.id)?.aliases ?? []), ...r.aliases])],
      });
  return [...entries.values()];
}
export function parseItem(
  raw: string,
  rules: AffixRule[],
  ocrConfidence = 100,
  confirmed = false,
): Item {
  const normalized = normalizeOcr(raw);
  const lines = normalized
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  const descriptorIndex = lines.findIndex(
    (x) =>
      /\b(common|magic|rare|legendary|unique|mythic)\b/i.test(x) &&
      slots.some(([rx]) => rx.test(x)),
  );
  const descriptor = lines[descriptorIndex] ?? '';
  const rarity = /mythic/i.test(descriptor)
    ? 'mythic'
    : /unique/i.test(descriptor)
      ? 'unique'
      : /legendary/i.test(descriptor)
        ? 'legendary'
        : /rare/i.test(descriptor)
          ? 'rare'
          : /magic/i.test(descriptor)
            ? 'magic'
            : /common/i.test(descriptor)
              ? 'common'
              : 'unknown';
  const slot = slots.find(([rx]) => rx.test(descriptor))?.[1] ?? 'unknown';
  const power = normalized.match(/(?:Item Power\s*:?\s*(\d+)|(\d+)\s*Item Power)/i);
  const affixes: Item['affixes'] = [],
    unknownLines: string[] = [],
    aspects: string[] = [],
    tempering: string[] = [];
  let masterworking: string | undefined;
  const name = descriptorIndex > 0 ? lines[descriptorIndex - 1] : (lines[0] ?? 'Unrecognized item');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      i === descriptorIndex ||
      line === name ||
      /item power|required level|durability|sell value|account bound|armor$|damage per second|sockets?|attacks per second/i.test(
        line,
      )
    )
      continue;
    if (/^aspect\s*:/i.test(line)) {
      aspects.push(line.replace(/^aspect\s*:\s*/i, ''));
      continue;
    }
    if (/^unique (?:power|effect)\s*:/i.test(line)) {
      aspects.push(line.replace(/^unique (?:power|effect)\s*:\s*/i, ''));
      continue;
    }
    if (/^tempered?\s*:/i.test(line)) {
      tempering.push(line.replace(/^tempered?\s*:\s*/i, ''));
      continue;
    }
    if (/^masterwork/i.test(line)) {
      masterworking = line;
      continue;
    }
    const cleaned = line
      .replace(/[★*◆•]/g, '')
      .replace(/\bGreater Affix\b/gi, '')
      .trim();
    const num = cleaned.match(/^\+?(-?\d+(?:[.,]\d+)?)\s*(%?)/);
    const label = canonical(
      cleaned.replace(/^\+?-?\d+(?:[.,]\d+)?\s*%?\s*/, '').replace(/\s*\[[^\]]*\]\s*$/, ''),
    );
    const match = rules.filter((r) => [r.label, ...r.aliases].some((a) => canonical(a) === label));
    if (match.length === 1 && !affixes.some((a) => a.id === match[0].id)) {
      affixes.push({
        id: match[0].id,
        label: match[0].label,
        value: num ? Number(num[1].replace(',', '.')) : undefined,
        unit: num?.[2] === '%' ? 'percent' : /ranks? to/i.test(cleaned) ? 'ranks' : 'flat',
        greater: /[★*]|Greater Affix/i.test(line),
        raw: line,
      });
    } else unknownLines.push(line);
  }
  const structural =
    (name ? 15 : 0) +
    (slot !== 'unknown' ? 25 : 0) +
    (rarity !== 'unknown' ? 15 : 0) +
    (affixes.length || aspects.length ? 30 : 0) +
    (power ? 15 : 0);
  const confidence = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.min(ocrConfidence, structural) -
          (unknownLines.length ? Math.min(30, unknownLines.length * 8) : 0),
      ),
    ),
  );
  return {
    name,
    rarity,
    slot,
    power: power ? Number(power[1] ?? power[2]) : undefined,
    affixes,
    aspects,
    unknownLines,
    tempering,
    masterworking,
    confidence: confirmed ? 100 : confidence,
    confirmed,
    raw: normalized,
  };
}
