export type SupportedDiseaseCrop =
  | 'maize'
  | 'beans'
  | 'coffee'
  | 'banana'
  | 'tomato'
  | 'potato'
  | 'cassava'
  | 'rice';

const CROP_ALIASES: Record<SupportedDiseaseCrop, string[]> = {
  maize: ['maize', 'corn'],
  beans: ['beans', 'bean', 'common bean'],
  coffee: ['coffee'],
  banana: ['banana', 'plantain'],
  tomato: ['tomato'],
  potato: ['potato', 'irish potato'],
  cassava: ['cassava', 'manioc', 'yuca'],
  rice: ['rice'],
};

// These are crop/host names, not disease names. Matching is deliberately
// performed across the whole provider label because provider wording varies.
const OTHER_HOST_ALIASES = ['eggplant', 'aubergine'];

function includesWholePhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`, 'i').test(text);
}

export function findMismatchedDiseaseHost(
  selectedCrop: SupportedDiseaseCrop,
  providerLabel: string,
): string | null {
  const label = providerLabel.toLowerCase().replace(/\\s+/g, ' ').trim();
  if (!label) return null;

  for (const host of OTHER_HOST_ALIASES) {
    if (includesWholePhrase(label, host)) return host;
  }

  for (const [crop, aliases] of Object.entries(CROP_ALIASES) as [SupportedDiseaseCrop, string[]][]) {
    if (crop === selectedCrop) continue;
    for (const alias of aliases) {
      if (includesWholePhrase(label, alias)) return alias;
    }
  }

  return null;
}

export function isGenericDiseaseLabel(name: unknown, description: unknown): boolean {
  const label = `${typeof name === 'string' ? name : ''} ${typeof description === 'string' ? description : ''}`
    .toLowerCase()
    .replace(/\\s+/g, ' ')
    .trim();

  return !label ||
    label.includes('zzxxzz') ||
    /\\bunclassified\\b|\\bunknown (?:parasitic )?pathogen\\b|\\bviruses?\\b|\\bfungi?\\b|\\bbacteria?\\b|\\bpests?\\b/.test(label);
}
