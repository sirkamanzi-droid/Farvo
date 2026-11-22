export type KnowledgeSource = {
  id: string;
  title: string;
  institution: string;
  kind: 'manual catalogue' | 'learning resources';
  url: string;
  crops: string[];
  note: string;
};

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: 'maaif-crop-publications',
    title: 'Crop Sub-sector Publications',
    institution: 'Uganda Ministry of Agriculture, Animal Industry and Fisheries (MAAIF)',
    kind: 'manual catalogue',
    url: 'https://www.agriculture.go.ug/crop-sub-sector-publications/',
    crops: ['maize', 'beans'],
    note: 'Lists MAAIF maize and beans training manuals for extension workers. Confirm the edition and reuse terms before republishing content.',
  },
  {
    id: 'maaif-acdp-guides',
    title: 'ACDP Farmer Guides',
    institution: 'Uganda Ministry of Agriculture, Animal Industry and Fisheries (MAAIF)',
    kind: 'manual catalogue',
    url: 'https://www.agriculture.go.ug/acdp-farmer-guides/',
    crops: ['maize', 'beans'],
    note: 'Farmer-facing guides and training resources, including local-language material. Check each file for its applicable crop and permission terms.',
  },
  {
    id: 'maaif-strategic-guides',
    title: 'Strategic 12 Campaign Enterprise Manuals',
    institution: 'Uganda Ministry of Agriculture, Animal Industry and Fisheries (MAAIF)',
    kind: 'manual catalogue',
    url: 'https://www.agriculture.go.ug/strategic-12-campaign-enterprise-manuals/',
    crops: ['coffee', 'banana', 'beans', 'maize'],
    note: 'Includes coffee and beans resources and broader priority-commodity guidance. Review the individual manual before adapting it.',
  },
  {
    id: 'naro-repository',
    title: 'NARO Research Repository',
    institution: 'National Agricultural Research Organisation (NARO)',
    kind: 'manual catalogue',
    url: 'https://www.naroinfohub.naro.go.ug/repository',
    crops: ['banana', 'coffee', 'potato', 'maize', 'beans', 'tomato'],
    note: 'Search the catalogue for crop-specific production manuals, field guides and research publications. A catalogue listing is not a claim that every crop has a suitable farmer manual.',
  },
  {
    id: 'naro-good-practices',
    title: 'Good Agricultural Practices Library',
    institution: 'National Agricultural Research Organisation (NARO)',
    kind: 'manual catalogue',
    url: 'https://www.naroinfohub.naro.go.ug/Husbundry',
    crops: ['maize', 'beans', 'coffee', 'potato'],
    note: 'Includes good-practice resources for beans, maize, coffee and potato. Verify regional relevance, publication date and reuse conditions.',
  },
  {
    id: 'naro-learning-resources',
    title: 'NAROhub Learning Resources',
    institution: 'National Agricultural Research Organisation (NARO)',
    kind: 'learning resources',
    url: 'https://databank.naro.go.ug/resources.php',
    crops: ['maize', 'beans', 'coffee', 'banana', 'potato', 'tomato'],
    note: 'A catalogue of learning resources such as guides, videos and webinars. Video availability and offline-download permission must be checked individually.',
  },
  {
    id: 'naro-books',
    title: 'NARO Books and Manuals',
    institution: 'National Agricultural Research Organisation (NARO)',
    kind: 'manual catalogue',
    url: 'https://naro.go.ug/e-library/books-manuals/',
    crops: ['maize', 'beans', 'coffee', 'banana', 'potato', 'tomato'],
    note: 'Official catalogue for additional research publications and manuals. Search by crop and confirm that each resource is suitable for smallholder farmers.',
  },
];
