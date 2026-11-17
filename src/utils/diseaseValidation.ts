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

const OTHER_HOST_ALIASES = ['eggplant', 'aubergine'];

function includesWholePhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  return new RegExp('(?:^|[^a-z])' + escaped + '(?:$|[^a-z])', 'i').test(text);
}

export function findMismatchedDiseaseHost(
  selectedCrop: SupportedDiseaseCrop,
  providerLabel: string,
): string | null {
  const label = providerLabel.toLowerCase().replace(/\s+/g, ' ').trim();
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
  const nameText = typeof name === 'string' ? name.toLowerCase().trim() : '';
  const descriptionText = typeof description === 'string' ? description.toLowerCase().trim() : '';
  const genericOnly = /^(?:unclassified|unknown (?:parasitic )?pathogen|virus|viruses|fungus|fungi|bacterium|bacteria|pest|pests)$/;

  return (!nameText && !descriptionText) ||
    nameText === 'zzxxzz' ||
    genericOnly.test(nameText) ||
    genericOnly.test(descriptionText);
}


const CROP_SPECIES: Record<SupportedDiseaseCrop, string[]> = {
  maize: ['zea mays'],
  beans: ['phaseolus vulgaris'],
  coffee: ['coffea arabica'],
  banana: ['musa × paradisiaca', 'musa x paradisiaca', 'musa acuminata', 'musa balbisiana'],
  tomato: ['solanum lycopersicum'],
  potato: ['solanum tuberosum'],
  cassava: ['manihot esculenta'],
  rice: ['oryza sativa'],
};

/** Accept only a leading species match for the crop selected by the farmer. */
export function matchesSelectedCropPlant(
  selectedCrop: SupportedDiseaseCrop,
  scientificName: unknown,
): boolean {
  if (typeof scientificName !== 'string') return false;
  const candidate = scientificName.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!candidate) return false;
  return CROP_SPECIES[selectedCrop].some(
    (species) => candidate === species || candidate.startsWith(`${species} `),
  );
}
