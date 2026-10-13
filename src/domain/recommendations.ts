import type { Build, Item } from './models';
import { canonical } from './parser';
export type Verdict =
  'UPGRADE CANDIDATE' | 'KEEP' | 'STASH FOR ENDGAME' | 'SALVAGE / SELL CANDIDATE' | 'NEEDS REVIEW';
export interface Match {
  label: string;
  kind: 'affix' | 'aspect' | 'unique';
  primary: boolean;
  detail: string;
}
export interface Recommendation {
  verdict: Verdict;
  headline: string;
  reasons: string[];
  activeMatches: Match[];
  futureMatches: Match[];
  cautions: string[];
}
export function matchBuild(item: Item, build: Build | null): Match[] {
  if (!build) return [];
  const matches: Match[] = [];
  for (const rule of build.affixes) {
    if (rule.slots.length && !rule.slots.includes(item.slot)) continue;
    const affix = item.affixes.find((a) => a.id === rule.id);
    if (!affix) continue;
    const quality =
      rule.minimum === undefined
        ? 'Matches a supplied priority'
        : affix.value === undefined || (rule.unit && rule.unit !== affix.unit)
          ? 'Value or unit needs review'
          : (
                rule.direction === 'higher'
                  ? affix.value >= rule.minimum
                  : affix.value <= rule.minimum
              )
            ? 'Meets your target value'
            : 'Below your target value';
    matches.push({
      label: rule.label,
      kind: 'affix',
      primary: rule.priority === 'primary',
      detail: quality,
    });
  }
  for (const power of build.aspects)
    if (item.aspects.some((a) => canonical(a) === canonical(power)))
      matches.push({
        label: power,
        kind: 'aspect',
        primary: true,
        detail: 'Matches a supplied legendary power',
      });
  for (const unique of build.uniques)
    if (['unique', 'mythic'].includes(item.rarity) && canonical(unique) === canonical(item.name))
      matches.push({
        label: unique,
        kind: 'unique',
        primary: true,
        detail: 'Named dependency in this build',
      });
  return matches;
}
export function evaluate(
  item: Item,
  active: Build | null,
  future: Build | null,
  equipped?: Item,
): Recommendation {
  const activeMatches = matchBuild(item, active),
    futureMatches = matchBuild(item, future);
  const cautions = ['This compares supplied priorities; it does not simulate damage.'];
  if (!equipped) cautions.push('No equipped item is recorded for this slot.');
  if (item.unknownLines.length)
    cautions.push(`${item.unknownLines.length} tooltip line(s) are unrecognized.`);
  const result = (verdict: Verdict, headline: string, reasons: string[]): Recommendation => ({
    verdict,
    headline,
    reasons,
    activeMatches,
    futureMatches,
    cautions,
  });
  if (
    !active ||
    !future ||
    item.slot === 'unknown' ||
    item.rarity === 'unknown' ||
    (!item.confirmed && item.confidence < 75)
  )
    return result('NEEDS REVIEW', 'Verify before deciding', [
      'Recognition or build data is incomplete. Review the tooltip and load both builds.',
    ]);
  const activeUseful = activeMatches.some((m) => m.primary),
    futureUseful = futureMatches.some((m) => m.primary);
  if (activeUseful) {
    let improved = false;
    if (
      equipped?.slot === item.slot &&
      equipped.confidence >= 75 &&
      !equipped.unknownLines.length &&
      !item.unknownLines.length
    ) {
      const current = matchBuild(equipped, active);
      const primary = active.affixes.filter(
        (r) => r.priority === 'primary' && (!r.slots.length || r.slots.includes(item.slot)),
      );
      const comparable = primary.filter(
        (r) =>
          item.affixes.some((a) => a.id === r.id) && equipped.affixes.some((a) => a.id === r.id),
      );
      const deltas = comparable.map((r) => {
        const a = item.affixes.find((a) => a.id === r.id)!,
          b = equipped.affixes.find((a) => a.id === r.id)!;
        return a.value === undefined || b.value === undefined || a.unit !== b.unit
          ? null
          : (a.value - b.value) * (r.direction === 'higher' ? 1 : -1);
      });
      improved =
        comparable.length === primary.length &&
        primary.length > 0 &&
        deltas.every((d) => d !== null && d >= 0) &&
        deltas.some((d) => d !== null && d > 0) &&
        current
          .filter((m) => m.kind !== 'affix')
          .every((m) => activeMatches.some((n) => canonical(n.label) === canonical(m.label)));
    }
    return result(
      improved ? 'UPGRADE CANDIDATE' : 'KEEP',
      improved ? 'A stronger match for your priorities' : 'Useful for your active build',
      activeMatches.map((m) => `${m.label}: ${m.detail.toLowerCase()}.`),
    );
  }
  if (futureUseful)
    return result(
      'STASH FOR ENDGAME',
      'Keep it for your next chapter',
      futureMatches.map(
        (m) => `${m.label} is a priority in ${future.name}: ${m.detail.toLowerCase()}.`,
      ),
    );
  if (activeMatches.length || futureMatches.length)
    return result('KEEP', 'A secondary priority is present', [
      'This item matches a secondary priority in one of your builds. Review its roll and other uses.',
    ]);
  if (
    item.unknownLines.length ||
    ['unique', 'mythic'].includes(item.rarity) ||
    active.coverage !== 'complete' ||
    future.coverage !== 'complete'
  )
    return result('NEEDS REVIEW', 'No match in the available data', [
      'No supplied priority matched. Partial builds, unique items or unknown text can hide value.',
    ]);
  return result('SALVAGE / SELL CANDIDATE', 'No configured priority matched', [
    'Both builds are marked complete and all parsed lines are known. No value was identified for either build. Check other uses before selling or salvaging.',
  ]);
}
