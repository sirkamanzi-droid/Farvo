import { District } from '../types';

export const DISTRICTS: District[] = [
  {
    id: 'kampala',
    name: 'Kampala',
    region: 'Central',
    latitude: 0.3476,
    longitude: 32.5825,
    mainCrops: ['Vegetables', 'Cassava', 'Sweet Potatoes', 'Poultry'],
    description: 'The capital city. Agriculture here is mainly peri-urban, specializing in high-demand vegetable gardens, root tubers, and poultry farming.'
  },
  {
    id: 'wakiso',
    name: 'Wakiso',
    region: 'Central',
    latitude: 0.3986,
    longitude: 32.4862,
    mainCrops: ['Matooke (Bananas)', 'Coffee', 'Cassava', 'Sweet Potatoes', 'Vegetables'],
    description: 'Surrounding Kampala, Wakiso is highly productive in staple food crop cultivation, especially Matooke, alongside robust Robusta coffee production.'
  },
  {
    id: 'mukono',
    name: 'Mukono',
    region: 'Central',
    latitude: 0.3542,
    longitude: 32.7522,
    mainCrops: ['Coffee', 'Vanilla', 'Cocoa', 'Tea', 'Cassava'],
    description: 'Known for high rainfall, Mukono is a major producer of commercial cash crops, particularly high-value vanilla orchids and Robusta coffee.'
  },
  {
    id: 'masaka',
    name: 'Masaka',
    region: 'Central',
    latitude: -0.3400,
    longitude: 31.7400,
    mainCrops: ['Coffee', 'Matooke (Bananas)', 'Pineapples', 'Beans', 'Maize'],
    description: 'A historical coffee hub. Famous for extensive Robusta coffee plantations and rich pineapple orchards nestled on gentle slopes.'
  },
  {
    id: 'kalangala',
    name: 'Kalangala (Ssese Islands)',
    region: 'Central',
    latitude: -0.3667,
    longitude: 32.2833,
    mainCrops: ['Oil Palm', 'Cassava', 'Sweet Potatoes', 'Fisheries'],
    description: 'An archipelago in Lake Victoria. It is the premier hub for commercial oil palm plantations in Uganda, benefitting from stable equatorial lake climates.'
  },
  {
    id: 'jinja',
    name: 'Jinja',
    region: 'Eastern',
    latitude: 0.4244,
    longitude: 33.2042,
    mainCrops: ['Sugarcane', 'Maize', 'Beans', 'Cassava', 'Sweet Potatoes'],
    description: 'Located at the source of the Nile, Jinja has vast sugarcane plantations feeding local mills, combined with major maize cultivation.'
  },
  {
    id: 'mbale',
    name: 'Mbale',
    region: 'Eastern',
    latitude: 1.0789,
    longitude: 34.1794,
    mainCrops: ['Arabica Coffee', 'Matooke (Bananas)', 'Beans', 'Maize', 'Onions'],
    description: 'Nestled on the lower slopes of Mount Elgon. Highly regarded for premium Arabica coffee, grown under shade beside Matooke groves.'
  },
  {
    id: 'soroti',
    name: 'Soroti',
    region: 'Eastern',
    latitude: 1.7146,
    longitude: 33.6111,
    mainCrops: ['Millet', 'Sorghum', 'Groundnuts', 'Cassava', 'Citrus fruits'],
    description: 'Characterized by sandy-clay soils. Excel in drought-resistant cereals like finger millet, sorghum, citrus fruits, and high-quality groundnuts.'
  },
  {
    id: 'kapchorwa',
    name: 'Kapchorwa',
    region: 'Eastern',
    latitude: 1.4011,
    longitude: 34.4503,
    mainCrops: ['Arabica Coffee', 'Maize', 'Barley', 'Wheat', 'Irish Potatoes'],
    description: 'High-altitude district on Mount Elgon. Famous for wheat and barley farms that supply commercial breweries, as well as high-grade Arabica coffee.'
  },
  {
    id: 'tororo',
    name: 'Tororo',
    region: 'Eastern',
    latitude: 0.6903,
    longitude: 34.1811,
    mainCrops: ['Millet', 'Cassava', 'Cotton', 'Maize', 'Groundnuts'],
    description: 'A key eastern agricultural node producing high quantities of staple finger millet and cassava, alongside smallholder cotton farming.'
  },
  {
    id: 'gulu',
    name: 'Gulu',
    region: 'Northern',
    latitude: 2.7747,
    longitude: 32.2990,
    mainCrops: ['Simsim (Sesame)', 'Sunflower', 'Maize', 'Cotton', 'Cassava', 'Sorghum'],
    description: 'A major agricultural hub in the north. Famous for high-quality Simsim (sesame) seeds and oilseed sunflowers, enjoying a distinct dry season.'
  },
  {
    id: 'lira',
    name: 'Lira',
    region: 'Northern',
    latitude: 2.2499,
    longitude: 32.9000,
    mainCrops: ['Sunflower', 'Soybeans', 'Beans', 'Cassava', 'Pigeon Peas'],
    description: 'The capital of Uganda\'s oilseed sub-sector. Lira leads in sunflower oil mill processing and large-scale soybean and pigeon pea production.'
  },
  {
    id: 'arua',
    name: 'Arua',
    region: 'Northern',
    latitude: 3.0303,
    longitude: 30.9111,
    mainCrops: ['Tobacco', 'Cassava', 'Simsim (Sesame)', 'Coffee', 'Groundnuts'],
    description: 'In the West Nile sub-region. Highly active in tobacco growing, alongside extensive cassava fields and growing Robusta coffee acreage.'
  },
  {
    id: 'kitgum',
    name: 'Kitgum',
    region: 'Northern',
    latitude: 3.2783,
    longitude: 32.8867,
    mainCrops: ['Cotton', 'Groundnuts', 'Simsim (Sesame)', 'Sorghum', 'Millet'],
    description: 'Near the northern border. Kitgum experiences high heat, making it perfect for cotton, drought-resilient sorghum, and groundnuts.'
  },
  {
    id: 'moroto',
    name: 'Moroto',
    region: 'Northern',
    latitude: 2.5311,
    longitude: 34.6667,
    mainCrops: ['Sorghum', 'Millet', 'Livestock Feed', 'Maize'],
    description: 'Located in the semi-arid Karamoja sub-region. Agriculture focuses heavily on nomadic pastoralism and drought-proof sorghum cultivation.'
  },
  {
    id: 'kotido',
    name: 'Kotido',
    region: 'Northern',
    latitude: 2.9803,
    longitude: 34.1331,
    mainCrops: ['Sorghum', 'Millet', 'Cowpeas', 'Livestock Feed'],
    description: 'Deep in Karamoja. Relies on seasonal rains for quick-maturing sorghum and cowpeas, integrated with pastoral livestock husbandry.'
  },
  {
    id: 'mbarara',
    name: 'Mbarara',
    region: 'Western',
    latitude: -0.6072,
    longitude: 30.6545,
    mainCrops: ['Matooke (Bananas)', 'Dairy Cattle', 'Coffee', 'Beans'],
    description: 'The "land of milk and honey." Mbarara is Uganda\'s primary dairy hub and a top-tier supplier of fresh Matooke (cooking bananas).'
  },
{
  id: 'rukungiri',
  name: 'Rukungiri',
  region: 'Western',
  latitude: -0.8411,
  longitude: 29.9419,
  mainCrops: ['Coffee', 'Matooke (Bananas)', 'Beans', 'Maize'],
  description: 'A fertile highland district famous for coffee, bananas, and mixed crop farming. Rukungiri benefits from favorable rainfall and productive agricultural land.'
  },
  {
    id: 'kabale',
    name: 'Kabale',
    region: 'Western',
    latitude: -1.2504,
    longitude: 29.9886,
    mainCrops: ['Irish Potatoes', 'Tea', 'Sorghum', 'Sweets Peas', 'Vegetables'],
    description: 'The "Switzerland of Africa" with terraced hills. Highly productive cold-climate zone specializing in Irish potatoes, tea, and cabbage.'
  },
  {
    id: 'kasese',
    name: 'Kasese',
    region: 'Western',
    latitude: 0.1833,
    longitude: 30.0833,
    mainCrops: ['Cotton', 'Maize', 'Coffee', 'Vanilla', 'Beans'],
    description: 'Flanking the Rwenzori Mountains. Experiences diverse microclimates supporting cotton in plains and coffee/vanilla on mountain foothills.'
  },
  {
    id: 'fort_portal',
    name: 'Fort Portal (Kabarole)',
    region: 'Western',
    latitude: 0.6564,
    longitude: 30.2727,
    mainCrops: ['Tea', 'Matooke (Bananas)', 'Coffee', 'Irish Potatoes', 'Avocados'],
    description: 'Surrounded by crater lakes, with rich volcanic soils. Fort Portal is home to massive rolling green tea estates and extensive banana groves.'
  },
  {
    id: 'kisoro',
    name: 'Kisoro',
    region: 'Western',
    latitude: -1.2853,
    longitude: 29.6923,
    mainCrops: ['Irish Potatoes', 'Beans', 'Tea', 'Pyrethrum', 'Maize'],
    description: 'In the extreme southwest under Mount Muhabura. The volcanic soils produce exceptional Irish potatoes and high-grade climbing beans.'
  },
  {
    id: 'ntugamo',
    name: 'Ntugamo',
    region: 'Western',
    latitude: 0.88,
    longitude: 30.26528,
    mainCrops: ['Cocoa Beans', 'Vanilla', 'Coffee', 'Palm Oil', 'Bananas'],
    description: 'Nestled on the western side of the Rwenzoris bordering DRC. It produces over 70% of Uganda\'s exported cocoa beans due to its warm, humid forest climate.'
  },
  {
    id: 'masindi',
    name: 'Masindi',
    region: 'Western',
    latitude: 1.6744,
    longitude: 31.7155,
    mainCrops: ['Maize', 'Sugarcane', 'Tobacco', 'Cassava', 'Coffee'],
    description: 'A highly commercial farming district, leading in national grain output (maize) and sprawling sugarcane outgrower schemes.'
  },
  {
    id: 'hoima',
    name: 'Hoima',
    region: 'Western',
    latitude: 1.4331,
    longitude: 31.3533,
    mainCrops: ['Tobacco', 'Tea', 'Rice', 'Maize', 'Cassava'],
    description: 'Located in the Albertine region. Produces significant cash crop tobacco and tea, alongside growing upland rice and cassava.'
  }
];

export const MAJOR_CROPS = [
  'Maize',
  'Matooke (Bananas)',
  'Coffee',
  'Beans',
  'Cassava',
  'Sweet Potatoes',
  'Sorghum',
  'Millet',
  'Irish Potatoes',
  'Tea',
  'Cocoa Beans',
  'Simsim (Sesame)',
  'Sunflower',
  'Vanilla',
  'Vegetables'
];
