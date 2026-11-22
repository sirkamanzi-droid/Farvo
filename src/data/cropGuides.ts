import type { KnowledgeSource } from './knowledgeSources';

export type CropLesson = {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  sourceIds: string[];
};

type CropGuide = Record<string, CropLesson>;

const lesson = (title: string, summary: string, sections: CropLesson['sections'], sourceIds: string[] = ['naro-good-practices','naro-repository']) => ({title,summary,sections,sourceIds});

export const CROP_GUIDES: Record<string, CropGuide> = {
  beans: {
    'getting-started': lesson('Growing beans in Uganda','Plan a healthy bean crop from seed choice to safe storage.',[
      {heading:'Choose a suitable variety',body:'Use certified or quality-declared seed of a variety recommended for your area. Ask a local extension worker or recognised seed supplier about maturity period, growth habit, disease tolerance and market preference. Avoid seed that is mixed, shrivelled, mouldy or visibly damaged.'},
      {heading:'Plan the season and field',body:'Beans grow best where the soil drains well. Avoid fields that remain waterlogged. Plan planting so the crop establishes when moisture is available, while avoiding a harvest period likely to be persistently wet. Rotate with non-legume crops rather than planting beans repeatedly on the same plot.'},
      {heading:'Keep a simple farm record',body:'Record the variety, seed source, planting date, field location, major field activities, pest or disease observations, harvest quantity and storage losses. These notes help compare seasons and identify what worked.'}
    ],['maaif-acdp-guides','maaif-crop-publications','naro-good-practices']),
    'land-preparation': lesson('Preparing land for beans','Prepare a clean, well-drained seedbed without unnecessary soil disturbance.',[
      {heading:'Select and assess the field',body:'Choose a field with good drainage and adequate sunlight. Check the field after rain: standing water or compacted areas can cause poor establishment and root problems. Do not burn crop residues; manage healthy residues appropriately and remove or safely dispose of heavily diseased material.'},
      {heading:'Prepare the seedbed',body:'Clear weeds before planting and break large clods enough to create a workable seedbed. Avoid working very wet soil because it can compact. On sloping land, keep soil covered and use suitable erosion-control measures such as contour-aligned planting where advised locally.'},
      {heading:'Plan rotation',body:'Rotate beans with cereals or other suitable non-legume crops. Rotation helps break some pest and disease cycles and supports better field management. Do not assume rotation alone will control every soil-borne problem.'}
    ],['maaif-acdp-guides','naro-good-practices']),
    planting: lesson('Bean seed and planting','Use healthy seed and establish an even stand.',[
      {heading:'Seed selection',body:'Buy seed from a trusted, recognised supplier and check the label, variety name, lot information and validity. Use varieties suited to the local agro-ecological zone and intended use. Do not plant grain beans as seed unless their quality and germination are known.'},
      {heading:'Planting',body:'Plant into moist soil at the locally recommended onset of rains. Use the spacing and seed rate recommended for the selected variety and its growth habit; bush and climbing beans may require different arrangements. Place seed at a consistent depth in moist soil and cover gently.'},
      {heading:'After planting',body:'Check emergence and identify gaps early. If replanting is needed, use the same variety and do it promptly so plants develop evenly. Avoid repeated replanting long after the crop has established.'}
    ],['maaif-acdp-guides','naro-good-practices']),
    'crop-care': lesson('Managing a bean crop','Regular field checks protect plant growth and yield.',[
      {heading:'Weed management',body:'Keep the crop free from strong weed competition, especially while plants are small. Weed when the soil is not excessively wet and avoid damaging bean roots. Mulch can help conserve moisture where it is appropriate and does not create excessive disease-favouring humidity.'},
      {heading:'Water and field condition',body:'Beans need moisture for establishment, flowering and pod filling, but prolonged waterlogging is harmful. Maintain drainage and observe plants during dry spells. Avoid overhead watering late in the day where it keeps foliage wet for long periods.'},
      {heading:'Inspect the crop',body:'Walk through the field regularly. Look at both sides of leaves, stems, flowers and pods. Note patches, leaf colour changes, holes, webbing, wilting or rotting, and compare affected plants with healthy ones.'}
    ],['naro-good-practices','maaif-acdp-guides']),
    'pests-diseases': lesson('Bean pest and disease prevention','Use prevention, monitoring and verified diagnosis together.',[
      {heading:'Prevent disease spread',body:'Start with healthy seed, rotate crops, use varieties with locally recognised resistance where available, maintain suitable spacing and drainage, and remove volunteer bean plants. Avoid moving wet plant material from affected areas into healthy fields.'},
      {heading:'Scout for common problems',body:'Inspect for aphids, bean fly, foliage-feeding insects, pod borers and signs of fungal or bacterial disease. Symptoms can look alike, so record where they occur and how they develop. Do not identify a disease from one symptom alone.'},
      {heading:'Respond safely',body:'Confirm the problem with a trained extension worker or reliable diagnostic service before choosing a control. If a crop protection product is recommended, follow its approved label and local regulations exactly; do not mix products or invent application rates.'}
    ],['maaif-acdp-guides','naro-good-practices']),
    'soil-nutrients': lesson('Soil health and nutrients for beans','Manage soil fertility using field history and reliable recommendations.',[
      {heading:'Understand the soil',body:'Beans perform poorly in compacted, strongly acidic or waterlogged soils. A soil test is the best way to understand pH and nutrient status. Omulimi soil estimates are mapped estimates, not a replacement for a laboratory test.'},
      {heading:'Build soil organic matter',body:'Where suitable, return healthy crop residues, use compost or well-decomposed manure, and maintain soil cover. Use only mature, safe organic materials and avoid applying contaminated or fresh manure directly onto edible crop parts.'},
      {heading:'Use fertiliser responsibly',body:'Beans can obtain some nitrogen through root nodules when effective rhizobia are present, but nodulation and other nutrient needs depend on soil conditions. Use a locally recommended fertiliser plan based on soil testing or extension advice; do not apply nitrogen or other nutrients blindly.'}
    ],['naro-good-practices','maaif-acdp-guides']),
    harvest: lesson('Harvesting and storing beans','Harvest at the right maturity and keep grain dry and clean.',[
      {heading:'Harvest maturity',body:'Harvest when most pods have reached maturity and begun drying, before excessive shattering or weather damage. Harvest timing may differ by variety and whether beans are being picked green or harvested dry.'},
      {heading:'Drying and threshing',body:'Dry harvested plants or pods on a clean tarpaulin or raised clean surface, not directly on bare soil. Thresh carefully to avoid breaking grain. Remove stones, damaged seeds and foreign matter.'},
      {heading:'Safe storage',body:'Dry grain thoroughly before storage. Store in clean, dry, pest-resistant containers or suitable hermetic bags used according to their instructions. Keep stores off damp floors, inspect regularly and never mix new grain with old infested grain.'}
    ],['maaif-crop-publications','naro-repository'])
  },
  maize: {
    'getting-started': lesson('Growing maize in Uganda','Plan maize production around the right seed, field, season and market.',[
      {heading:'Select the seed',body:'Choose certified seed suited to your district, altitude, rainfall pattern, maturity window and intended market. Consider disease tolerance and whether the variety is open-pollinated or hybrid. Hybrid seed generally needs to be purchased again for the next crop to retain its expected performance.'},
      {heading:'Plan the season',body:'Match variety maturity to the reliable growing period. Avoid planting simply because the first shower has fallen; check that soil moisture is sufficient for establishment and follow local seasonal advice. Plan drying and storage before harvest.'},
      {heading:'Field history',body:'Record previous crops, weed problems, fall armyworm or other pest pressure, fertiliser history and yields. Rotate crops where possible and avoid continuous maize where it increases pest, disease or soil fertility problems.'}
    ],['maaif-acdp-guides','maaif-crop-publications','naro-good-practices']),
    'land-preparation': lesson('Preparing land for maize','Create a suitable seedbed and protect the soil.',[
      {heading:'Choose the field',body:'Use a field with adequate sunlight and drainage. Avoid waterlogged areas and manage steep slopes to reduce erosion. Where possible, rotate maize with legumes and keep soil covered between crops.'},
      {heading:'Prepare the field',body:'Control existing weeds before planting and prepare a seedbed that allows good seed-soil contact. Avoid cultivating when soil is very wet, which can cause compaction. Retain healthy residues as mulch where they do not harbour serious pests or disease.'},
      {heading:'Plan layout',body:'Arrange rows to allow weeding, scouting and harvesting. On sloping ground, use locally recommended soil and water conservation practices. Do not clear natural vegetation on steep or fragile land just to expand maize.'}
    ],['maaif-acdp-guides','naro-good-practices']),
    planting: lesson('Maize seed and planting','Establish a uniform crop using quality seed and recommended spacing.',[
      {heading:'Seed quality',body:'Buy sealed, labelled seed from a recognised supplier. Check variety, lot number, germination information and expiry or validity details. Do not use seed that is mouldy, damaged or of uncertain origin.'},
      {heading:'Planting time and spacing',body:'Plant when there is adequate soil moisture for germination and the season is suitable for the selected maturity class. Follow the seed supplier or local extension recommendation for row spacing, plant spacing, seed depth and number of seeds per station; these vary with variety and production system.'},
      {heading:'Early establishment',body:'Check emergence after planting. Identify gaps, poor germination, cut seedlings or uneven growth early. Replant only while it can still produce a reasonably uniform crop, and investigate the cause before repeating the same mistake.'}
    ],['maaif-acdp-guides','naro-good-practices']),
    'crop-care': lesson('Managing a maize crop','Protect the crop through timely weeding, scouting and moisture management.',[
      {heading:'Weed control',body:'Keep maize free from weed competition, especially during early growth. Weed or use locally approved weed-control methods at the correct crop stage. Avoid herbicide use without confirming the product is registered for the crop and following its label.'},
      {heading:'Nutrition and moisture',body:'Maize needs balanced nutrients and adequate moisture, particularly around rapid growth, tasselling, silking and grain filling. Split nutrient applications only according to local recommendations for the product and soil; do not place fertiliser in direct contact with seed.'},
      {heading:'Field scouting',body:'Inspect the crop at least weekly and more often when pest pressure is high. Check the whorl, stems, leaves and ears. Record damaged plants, egg masses, larvae, unusual symptoms and the affected area.'}
    ],['naro-good-practices','maaif-acdp-guides']),
    'pests-diseases': lesson('Maize pest and disease management','Recognise problems early and use integrated prevention.',[
      {heading:'Fall armyworm monitoring',body:'Look for windowing, ragged leaf damage, fresh frass in the whorl and caterpillars. Check several parts of the field because damage may be patchy. Similar damage can have other causes, so inspect the plant before deciding.'},
      {heading:'Preventive practices',body:'Plant at an appropriate time, use quality seed, rotate crops where possible, manage volunteer maize and weeds that host pests, and keep the field under regular observation. Encourage natural enemies and avoid unnecessary broad-spectrum spraying.'},
      {heading:'Make a verified response',body:'Use integrated pest management: assess pest presence and crop stage, consult extension guidance, and select only locally approved control options when needed. Follow the product label, protective precautions, pre-harvest interval and environmental safeguards.'}
    ],['naro-good-practices','maaif-acdp-guides']),
    'soil-nutrients': lesson('Soil fertility for maize','Base nutrient decisions on soil condition and crop needs.',[
      {heading:'Soil testing',body:'Test soil where possible to understand pH and nutrient status. Soil colour or a photograph cannot reliably establish nutrient levels. Mapped soil data can guide a first assessment but should be treated as an estimate.'},
      {heading:'Organic matter',body:'Use compost, well-decomposed manure, cover crops and residue retention where suitable. Avoid burning residues and reduce erosion with ground cover and contour measures.'},
      {heading:'Fertiliser decisions',body:'Maize commonly responds to balanced nutrient management, but the correct fertiliser type, timing and quantity depend on soil tests, yield target, variety and local recommendations. Keep fertiliser away from direct seed contact and store it safely.'}
    ],['naro-good-practices','maaif-crop-publications']),
    harvest: lesson('Harvesting and storing maize','Dry grain properly to reduce mould, aflatoxin and storage losses.',[
      {heading:'Harvest maturity',body:'Harvest when ears and husks have dried sufficiently and grain has reached physiological maturity. Do not leave mature maize in the field unnecessarily where rain, pests, birds or theft may cause losses.'},
      {heading:'Drying and sorting',body:'Dry cobs or shelled grain on clean tarpaulins or raised drying surfaces. Protect grain from rain, animals and contamination. Remove mouldy, discoloured, insect-damaged or otherwise unsafe grain; do not mix it with good grain.'},
      {heading:'Storage and food safety',body:'Dry maize to a safe storage moisture level using a reliable moisture meter or local extension guidance. Store in clean, dry, pest-resistant facilities. Prevent leaks and condensation. Mouldy grain may contain aflatoxins and should not be eaten or fed to animals.'}
    ],['maaif-crop-publications','naro-good-practices'])
  },
  coffee: {
    'getting-started': lesson('Starting a coffee enterprise','Choose the coffee type and plan a long-term, well-managed garden.',[
      {heading:'Choose the right coffee',body:'Uganda grows Robusta and Arabica in different agro-ecological conditions. Select the type and variety recommended for your altitude, rainfall, soils and district. Obtain planting material from a recognised nursery or source.'},
      {heading:'Plan the garden',body:'Coffee is a long-term crop. Plan spacing, shade where appropriate, access paths, water management, mulch supply, labour and the market before planting. Keep records of planting material and garden blocks.'},
      {heading:'Healthy planting material',body:'Buy vigorous, true-to-type seedlings from a trusted nursery. Avoid seedlings with damaged roots, pests, disease symptoms or poor growth. Ask about the variety and source before purchase.'}
    ],['maaif-strategic-guides','naro-good-practices','naro-repository']),
    'land-preparation': lesson('Preparing a coffee garden','Prepare planting positions and conserve soil moisture.',[
      {heading:'Site selection',body:'Select a site suitable for the coffee type and with good drainage. Avoid sites prone to flooding or severe erosion. Arabica and Robusta have different climatic and altitude requirements; confirm suitability with local extension staff.'},
      {heading:'Layout and holes',body:'Mark rows and planting positions using spacing recommended for the selected variety and production system. Prepare planting holes ahead of planting and keep topsoil separate from subsoil where local guidance recommends it.'},
      {heading:'Soil conservation',body:'Maintain ground cover, mulch appropriately, use contour measures on slopes and avoid leaving soil bare. Establish shade trees only where suitable for the coffee system and manage them to avoid excessive competition.'}
    ],['maaif-strategic-guides','naro-good-practices']),
    planting: lesson('Coffee seedlings and planting','Establish vigorous seedlings carefully at the start of a suitable rainy period.',[
      {heading:'Seedling selection',body:'Choose healthy, hardened seedlings with strong stems and well-developed roots. Check for root deformation, pests, leaf disease and signs of stress. Buy planting material of a known variety from a recognised nursery.'},
      {heading:'Planting',body:'Plant when soil moisture is reliable and the field is ready. Remove the container carefully without breaking the root ball, set the seedling upright at the recommended depth and firm soil gently around it. Avoid burying the stem collar.'},
      {heading:'Early care',body:'Replace dead seedlings early, mulch while keeping mulch away from direct stem contact, and protect young plants from livestock, drought and weeds. Provide temporary shade or wind protection where locally recommended.'}
    ],['maaif-strategic-guides','naro-repository']),
    'crop-care': lesson('Managing a coffee garden','Pruning, mulching, nutrition and regular observation sustain productive trees.',[
      {heading:'Weed and mulch management',body:'Keep the area around young coffee plants free from strong weed competition. Apply organic mulch where appropriate, leaving a clear space around stems to reduce collar rot and pest harbourage. Maintain ground cover between rows.'},
      {heading:'Pruning and canopy care',body:'Train and prune according to whether the garden is Robusta or Arabica and the selected production system. Remove dead, diseased and unproductive wood with clean tools. Do not remove too much healthy canopy at once; follow local crop-specific guidance.'},
      {heading:'Water and shade',body:'Protect soil moisture with mulch and ground cover. Manage shade so it supports the crop without creating excessive competition or a persistently humid canopy. Inspect trees regularly for poor growth, dieback and unusual leaf or berry symptoms.'}
    ],['naro-good-practices','maaif-strategic-guides']),
    'pests-diseases': lesson('Coffee pest and disease prevention','Keep the garden clean, scout regularly and confirm problems before treatment.',[
      {heading:'Regular scouting',body:'Inspect leaves, stems, branches, flowers and berries. Look for dieback, holes, wilting, damaged berries, unusual spots and insect activity. Note which trees are affected and whether the problem is spreading.'},
      {heading:'Prevention',body:'Use healthy planting material, maintain appropriate shade and spacing, prune with clean tools, remove severely affected material as advised, and avoid moving infested plant material between gardens. Keep the garden accessible for inspection.'},
      {heading:'Important coffee problems',body:'Coffee wilt disease, coffee berry disease, leaf rust and insect pests require different responses. A visual symptom alone may not confirm the cause. Seek diagnosis from a coffee extension worker or research service before removing trees or applying crop protection products.'}
    ],['naro-repository','naro-good-practices','maaif-strategic-guides']),
    'soil-nutrients': lesson('Coffee soil and nutrition','Maintain soil structure and use nutrient recommendations suited to the coffee type.',[
      {heading:'Soil condition',body:'Coffee needs a well-drained soil with good structure and organic matter. Soil testing helps assess pH and nutrients. Do not rely on leaf colour or soil appearance alone to diagnose a nutrient deficiency.'},
      {heading:'Organic matter and erosion',body:'Use suitable mulch, compost and well-decomposed manure. Keep soil covered, manage runoff and avoid cultivating deeply around shallow coffee roots. Maintain contour barriers on sloping sites where recommended.'},
      {heading:'Fertiliser programme',body:'Nutrient demand changes with tree age, crop load, soil and coffee type. Follow a locally recommended programme based on soil or leaf analysis where available. Apply products according to their label and avoid fertiliser touching the trunk.'}
    ],['naro-good-practices','maaif-strategic-guides']),
    harvest: lesson('Coffee harvesting and post-harvest','Harvest ripe cherries and process them cleanly to protect quality.',[
      {heading:'Selective picking',body:'Pick ripe cherries at the stage recommended for the intended processing method. Avoid mixing green, overripe, dry and diseased cherries with sound ripe fruit. Frequent selective harvesting improves consistency.'},
      {heading:'Handling and processing',body:'Keep harvested cherries clean and shaded while transporting them for processing. Use clean equipment and water where wet processing is practised. Remove defective cherries and follow the correct method for the coffee type and buyer.'},
      {heading:'Drying and storage',body:'Dry parchment or dried cherries evenly on clean raised beds or tarpaulins, protect them from rain and contamination, and turn them regularly. Store only when adequately dry in clean, dry, well-ventilated conditions.'}
    ],['maaif-strategic-guides','naro-repository'])
  },
  banana: {
    'getting-started': lesson('Starting a banana/Matooke garden','Plan a healthy matooke plantation with clean planting material and good water management.',[
      {heading:'Choose a suitable site',body:'Bananas need reliable moisture, fertile soil and good drainage. Avoid sites that flood or remain waterlogged. Consider access to the garden, household use, market and the labour needed for regular desuckering and sanitation.'},
      {heading:'Select planting material',body:'Use healthy tissue-culture plantlets or clean, vigorous suckers from a reliable source. Avoid suckers from gardens with banana bacterial wilt or other serious disease problems. Confirm the variety and intended use.'},
      {heading:'Plan the garden',body:'Plan spacing, paths, water flow, mulch supply and a staggered planting or harvesting schedule. Keep records of variety, planting date, bunches harvested and major disease events.'}
    ],['naro-repository','naro-books']),
    'land-preparation': lesson('Preparing land for bananas','Prepare a well-drained field and protect soil organic matter.',[
      {heading:'Field selection',body:'Choose deep, fertile soil with good drainage and access to moisture. Avoid swampy areas and sites with severe erosion. Check whether the field has a history of banana bacterial wilt or nematode problems.'},
      {heading:'Prepare planting stations',body:'Mark planting stations using spacing recommended for the banana variety and production system. Prepare holes and mix topsoil with suitable well-decomposed organic matter where locally advised. Do not use fresh manure against young roots.'},
      {heading:'Water and soil conservation',body:'Plan drainage channels that safely guide excess water without causing erosion. Retain mulch and ground cover. On slopes, use contour-aligned measures and avoid exposing large areas of bare soil.'}
    ],['naro-repository','naro-books']),
    planting: lesson('Banana planting material and establishment','Plant clean material carefully and establish a strong mat.',[
      {heading:'Clean planting material',body:'Use tissue-culture plantlets from a trusted supplier or healthy suckers selected from disease-free gardens. Reject material with weevil damage, nematode symptoms, rotting or suspicious wilting.'},
      {heading:'Planting',body:'Plant at the start of a reliable rainy period or when irrigation/moisture is available. Set the plant upright at the recommended depth, firm soil around roots and water if needed. Follow locally recommended spacing for the cultivar and management system.'},
      {heading:'Early establishment',body:'Mulch to conserve moisture but keep mulch away from direct contact with the plant base. Replace dead plants early. Protect young plants from livestock and weed competition.'}
    ],['naro-repository','naro-books']),
    'crop-care': lesson('Managing a banana mat','Maintain the right number of followers and keep the garden clean.',[
      {heading:'Desuckering',body:'Maintain a mother plant, a follower and a healthy successor where this system is recommended. Remove unwanted suckers regularly using a clean tool. The appropriate number depends on cultivar, spacing and management system.'},
      {heading:'Mulching and feeding',body:'Use suitable organic mulch and well-decomposed manure or compost where available. Keep mulch from touching the pseudostem. Maintain soil cover and avoid damaging shallow roots during weeding.'},
      {heading:'Support and sanitation',body:'Remove dead leaves and manage the canopy without stripping healthy leaves needed for bunch filling. Support heavy bunches where lodging is a risk. Clean tools between mats when disease spread is a concern.'}
    ],['naro-repository','naro-books']),
    'pests-diseases': lesson('Banana pest and disease prevention','Clean planting material and garden hygiene are essential.',[
      {heading:'Banana bacterial wilt',body:'Watch for premature yellowing, wilting, fruit ripening changes and bacterial ooze. These signs need urgent confirmation. Remove male buds using a forked stick after the last hand forms where this is part of local bacterial-wilt prevention guidance; avoid sharing contaminated tools.'},
      {heading:'Weevils and nematodes',body:'Inspect planting material and corms for weevil tunnels or damage. Use clean planting material and manage residues and old corms appropriately. Root damage and toppling can have multiple causes, so confirm before treatment.'},
      {heading:'Prevent spread',body:'Do not move suckers from affected gardens. Disinfect or clean tools between mats using locally approved procedures. Report suspected serious outbreaks to local agricultural extension staff and follow their containment advice.'}
    ],['naro-repository','naro-books']),
    'soil-nutrients': lesson('Banana soil fertility and nutrition','Build organic matter and maintain balanced nutrition.',[
      {heading:'Soil health',body:'Bananas remove substantial nutrients as bunches are harvested. Maintain organic matter with suitable mulch, compost and well-decomposed manure. Avoid burning residues and protect soil from erosion.'},
      {heading:'Nutrient symptoms',body:'Yellowing, weak growth and poor bunch development can result from nutrient shortage, drought, waterlogging, pests or disease. Do not diagnose a nutrient deficiency from one symptom. Soil or leaf analysis can help.'},
      {heading:'Fertiliser use',body:'Use a fertiliser recommendation suited to banana type, soil test, plant age and local conditions. Apply safely in the recommended zone and timing; keep fertiliser away from direct stem contact and follow product label instructions.'}
    ],['naro-repository','naro-books']),
    harvest: lesson('Banana harvesting and handling','Harvest bunches at the right maturity and prevent bruising.',[
      {heading:'Harvest maturity',body:'Harvest at the maturity stage required for household use or the target market. Bunch shape, finger fullness and days after flowering can help, but indicators differ by cultivar and market distance. Seek local guidance for the variety.'},
      {heading:'Careful handling',body:'Support the bunch during cutting to prevent it falling and bruising. Use clean tools and avoid dragging bunches on the ground. Keep harvested fruit shaded and transport in a way that prevents compression.'},
      {heading:'Post-harvest',body:'Sort damaged or diseased fingers, keep produce clean and ventilated, and use suitable packaging. Handle matooke carefully to reduce bruising and losses during transport and marketing.'}
    ],['naro-repository','naro-books'])
  },
  tomato: {
    'getting-started': lesson('Planning a tomato crop','Tomatoes need careful variety choice, drainage, scouting and handling.',[
      {heading:'Choose a variety',body:'Select a variety suited to your location, season, market and production system. Consider growth habit, maturity, fruit type, disease tolerance and whether the crop is for fresh market or processing. Buy seed from a trusted supplier.'},
      {heading:'Plan production',body:'Tomatoes are sensitive to waterlogging and several pests and diseases. Plan a well-drained site, reliable water, nursery space, staking or support where needed, and a way to manage crop residues after harvest.'},
      {heading:'Rotate crops',body:'Avoid planting tomatoes repeatedly in the same field or after related solanaceous crops such as potato, pepper or eggplant where disease pressure is high. Rotate with unrelated crops and follow local advice.'}
    ],['naro-repository','naro-books']),
    'land-preparation': lesson('Preparing land for tomatoes','Prepare a fertile, well-drained field and plan irrigation.',[
      {heading:'Site and drainage',body:'Choose a sunny field with good drainage. Raised beds or ridges may help where drainage is slow, according to local practice. Avoid fields with a recent history of severe bacterial wilt or persistent soil-borne disease.'},
      {heading:'Soil preparation',body:'Remove weeds and prepare a fine, workable seedbed without compacting wet soil. Incorporate suitable, fully decomposed organic matter based on local advice. Do not use fresh manure in direct contact with roots.'},
      {heading:'Water planning',body:'Plan a reliable water source and a method that delivers water near the root zone without keeping foliage wet for long periods. Ensure runoff does not move contaminated soil from affected areas into clean plots.'}
    ],['naro-repository','naro-books']),
    planting: lesson('Tomato nursery and transplanting','Raise healthy seedlings and transplant them with minimal stress.',[
      {heading:'Raise seedlings',body:'Use clean trays or a well-prepared nursery bed and a clean growing medium. Sow quality seed at the recommended depth, avoid overcrowding and provide gentle watering. Protect seedlings from heavy rain, pests and excessive heat.'},
      {heading:'Harden seedlings',body:'Before transplanting, gradually expose seedlings to field conditions while maintaining adequate moisture. Select sturdy, healthy seedlings without spots, distortion or pest damage. Do not transplant weak or diseased seedlings.'},
      {heading:'Transplanting',body:'Transplant during a cool part of the day when the soil is moist. Handle seedlings by the root ball, water them in and follow spacing recommended for the variety and support system. Replace failed plants early.'}
    ],['naro-repository','naro-books']),
    'crop-care': lesson('Managing tomato plants','Consistent water, support, weed control and scouting improve crop quality.',[
      {heading:'Water management',body:'Maintain even soil moisture. Irregular watering can contribute to fruit cracking and blossom-end rot, while waterlogging encourages root disease. Water near the soil surface and avoid unnecessary wetting of leaves.'},
      {heading:'Support and canopy',body:'Stake or trellis plants where the variety and system require it. Tie stems loosely and use clean supports. Pruning practices differ by variety and production system; avoid removing too much healthy foliage.'},
      {heading:'Weeding and observation',body:'Control weeds before they compete strongly. Inspect leaves, stems, flowers and fruit frequently for pests, spots, wilting and fruit damage. Record the first appearance and spread of symptoms.'}
    ],['naro-repository','naro-books']),
    'pests-diseases': lesson('Tomato pest and disease prevention','Use clean seedlings, crop rotation and frequent scouting.',[
      {heading:'Common problems to watch',body:'Tomatoes can be affected by bacterial wilt, early and late blights, leaf spots, viruses, whiteflies, aphids, leafminers, fruit borers and mites. Symptoms overlap, so examine the whole plant and field pattern before deciding what is present.'},
      {heading:'Prevention',body:'Use clean seed and seedlings, rotate away from related crops, manage weeds that host pests, avoid waterlogging, use suitable spacing and remove infected material as advised. Keep tools, trays and stakes clean.'},
      {heading:'Safe management',body:'Confirm the pest or disease with an extension worker or reliable diagnostic service. Use integrated pest management and only locally registered products when necessary. Follow label directions, protective measures and pre-harvest intervals.'}
    ],['naro-repository','naro-books']),
    'soil-nutrients': lesson('Tomato soil and nutrition','Balanced nutrition and steady moisture support healthy fruit development.',[
      {heading:'Soil testing',body:'Tomatoes respond poorly to some soil constraints, including unsuitable pH, compaction and poor drainage. Test soil where possible before planting. Do not use a photograph as a substitute for pH or nutrient testing.'},
      {heading:'Organic matter',body:'Add suitable compost or well-decomposed manure before planting where recommended. Maintain mulch to reduce moisture swings and soil splash, while keeping the plant collar clear.'},
      {heading:'Fertiliser management',body:'Tomatoes need balanced nutrients, but excess nitrogen can produce leafy growth at the expense of fruiting and may worsen some pest problems. Base fertiliser choice and timing on soil analysis and local crop recommendations.'}
    ],['naro-repository','naro-books']),
    harvest: lesson('Tomato harvesting and storage','Pick carefully at the maturity stage required by the market.',[
      {heading:'Picking stage',body:'Harvest fruit at the colour stage suited to local sale, transport distance and intended use. Pick regularly to avoid overripe fruit and reduce field losses. Handle fruit gently to prevent bruising.'},
      {heading:'Sorting and packing',body:'Sort by maturity, size and quality. Remove cracked, rotten, diseased or badly damaged fruit. Use clean, ventilated crates rather than overfilled sacks that crush tomatoes.'},
      {heading:'Storage and transport',body:'Keep produce shaded and cool, avoid direct sun and minimise delays. Do not wash fruit with unsafe water. Use clean packaging and avoid stacking loads in ways that cause compression.'}
    ],['naro-repository','naro-books'])
  },
  potato: {
    'getting-started': lesson('Planning an Irish potato crop','Start with clean seed tubers, rotation and a well-drained field.',[
      {heading:'Choose seed tubers',body:'Use certified or quality-declared seed tubers from a trusted source. Select varieties suited to your altitude, rainfall, market and disease pressure. Avoid seed tubers that are rotten, badly bruised or show suspicious disease symptoms.'},
      {heading:'Plan the field',body:'Choose a well-drained field and avoid planting potatoes repeatedly in the same plot. Rotate with unrelated crops and plan for hilling, weed management, disease scouting and careful harvesting.'},
      {heading:'Know the crop cycle',body:'Varieties differ in maturity and disease tolerance. Use supplier and local extension information to estimate crop duration and plan planting and harvest around the local season.'}
    ],['naro-good-practices','naro-repository']),
    'land-preparation': lesson('Preparing land for Irish potatoes','Create loose, well-drained soil suitable for tuber development.',[
      {heading:'Field selection',body:'Select a sunny field with loose, well-drained soil. Avoid waterlogged plots and fields with a recent history of severe bacterial wilt or other persistent potato diseases. Check field history before planting.'},
      {heading:'Seedbed preparation',body:'Prepare soil to allow tuber expansion and good drainage. Remove volunteer potato plants and manage crop residues responsibly. On sloping land, use erosion-control practices recommended for the area.'},
      {heading:'Ridges and layout',body:'Prepare rows or ridges according to local recommendations for the variety and production system. Good ridge structure supports tuber development and makes hilling and harvesting easier.'}
    ],['naro-good-practices','naro-repository']),
    planting: lesson('Potato seed and planting','Plant healthy, sprouted seed tubers at the recommended stage and spacing.',[
      {heading:'Seed preparation',body:'Use healthy seed tubers of suitable size and physiological age. Chitting or pre-sprouting may be recommended for some seed systems; follow supplier guidance and avoid damaging sprouts. Do not plant tubers with rot or suspicious lesions.'},
      {heading:'Planting',body:'Plant when soil moisture is suitable and drainage is good. Follow locally recommended row and within-row spacing, planting depth and seed rate for the variety. Avoid cutting seed tubers unless the recommended system specifically permits it and hygiene is assured.'},
      {heading:'Emergence',body:'Check emergence and gaps. Investigate rotting, poor sprouting, waterlogging or pest damage before replanting. Maintain even crop establishment where possible.'}
    ],['naro-good-practices','naro-repository']),
    'crop-care': lesson('Managing an Irish potato crop','Hilling, weed control and water management protect developing tubers.',[
      {heading:'Weed control',body:'Control weeds early before they compete with potato plants. Avoid damaging shallow roots and stolons during weeding. Use only crop-appropriate and locally approved weed-control methods.'},
      {heading:'Hilling and earthing up',body:'Hill soil around plants at the locally recommended growth stage to cover developing tubers, support stems and reduce greening. Avoid exposing tubers to sunlight during field operations.'},
      {heading:'Water and scouting',body:'Maintain adequate moisture without waterlogging. Inspect leaves and stems regularly for blight symptoms, wilting, insect damage and uneven growth. Pay attention during cool, wet conditions that can favour late blight.'}
    ],['naro-good-practices','naro-repository']),
    'pests-diseases': lesson('Potato pest and disease prevention','Use clean seed, rotation and early blight monitoring.',[
      {heading:'Late blight awareness',body:'Late blight can spread rapidly in cool, wet conditions. Watch for expanding dark lesions and signs of disease on leaf undersides, stems and tubers. Similar symptoms may have other causes; seek confirmation quickly.'},
      {heading:'Other problems',body:'Potatoes may be affected by bacterial wilt, viruses, early blight, aphids, cutworms, tuber moth and nematodes. Use healthy seed, remove volunteer plants, rotate crops and avoid moving contaminated soil or tubers between fields.'},
      {heading:'Integrated response',body:'Scout frequently and obtain a reliable diagnosis. Use resistant varieties where available, cultural controls and only locally registered crop protection products when needed. Follow label directions, protective measures and pre-harvest intervals.'}
    ],['naro-good-practices','naro-repository']),
    'soil-nutrients': lesson('Potato soil and nutrient management','Use soil testing and careful fertility management for healthy tubers.',[
      {heading:'Soil condition',body:'Potatoes need loose, well-drained soil. Compaction, waterlogging and unsuitable pH can reduce crop performance and increase disease risks. Test soil where possible and use local advice to interpret results.'},
      {heading:'Organic matter',body:'Use well-decomposed organic matter and maintain soil structure. Avoid fresh manure and contaminated materials. Rotate crops and protect soil from erosion.'},
      {heading:'Fertiliser decisions',body:'Potatoes have significant nutrient needs, but the correct nutrient balance and timing depend on soil test, variety, crop duration and local conditions. Avoid guessing fertiliser rates or applying fertiliser in direct contact with seed tubers.'}
    ],['naro-good-practices','naro-repository']),
    harvest: lesson('Harvesting and storing Irish potatoes','Harvest mature tubers carefully and protect them from light and damage.',[
      {heading:'Harvest maturity',body:'Harvest when the crop has reached the maturity stage recommended for the variety and market. Skin set is important for storage: tubers should not rub or peel easily. Reduce irrigation before harvest only according to local guidance and field conditions.'},
      {heading:'Digging and sorting',body:'Dig carefully to minimise cuts and bruises. Keep tubers shaded and sort out rotten, green, severely damaged or diseased tubers. Do not leave harvested potatoes exposed to direct sunlight.'},
      {heading:'Curing and storage',body:'Allow sound tubers to dry and cure under suitable shaded, ventilated conditions before longer storage. Store in a cool, dark, well-ventilated place. Protect from light to prevent greening and do not store diseased tubers with healthy stock.'}
    ],['naro-good-practices','naro-repository'])
  }
};

export function getCropLesson(cropId: string, topicId: string): CropLesson | undefined {
  return CROP_GUIDES[cropId]?.[topicId];
}

export function getSourcesForLesson(lessonData: CropLesson, sources: KnowledgeSource[]) {
  return sources.filter(source => lessonData.sourceIds.includes(source.id));
}
