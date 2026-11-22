import React, { useState } from 'react';
import { ChevronLeft, ShieldCheck, Sprout, CloudRain, Eye, Leaf, ExternalLink } from 'lucide-react';
import { SUPPORTED_CROPS } from '../data/supportedCrops';

type CropId = typeof SUPPORTED_CROPS[number]['id'];

const GUIDES: Record<CropId, { intro: string; risks: string[]; actions: string[]; checks: string[] }> = {
  beans: {
    intro: 'Start with healthy planting seed and inspect the crop regularly, especially as the plants grow and form pods.',
    risks: ['Angular leaf spot', 'Anthracnose', 'Bean rust', 'Common bacterial blight'],
    actions: [
      'Use clean, good-quality seed from a trusted source.',
      'Choose varieties recommended for your area.',
      'Follow locally recommended spacing so the crop is not overcrowded.',
      'Keep the field and its edges under observation; manage weeds and volunteer plants.',
      'Avoid working through wet plants when you can, and clean tools before moving between fields.',
      'Ask an extension officer to check unusual symptoms before choosing a treatment.'
    ],
    checks: ['Look for new leaf spots, yellowing or unusual patterns.', 'Check stems and pods as well as leaves.', 'Note whether symptoms are spreading to nearby plants.']
  },
  maize: {
    intro: 'Healthy seed, good field management and early scouting help reduce avoidable crop-health problems.',
    risks: ['Maize streak disease', 'Grey leaf spot', 'Common rust', 'Maize lethal necrosis'],
    actions: [
      'Plant clean, quality seed and use varieties recommended for your area.',
      'Plant at the locally recommended time and spacing.',
      'Scout the field regularly from the seedling stage; inspect leaves and growing points.',
      'Keep weeds and volunteer maize plants managed around the field.',
      'Maintain good field drainage and avoid injuring plants during weeding.',
      'Get suspicious streaking, mottling or rapid wilting checked by an extension officer.'
    ],
    checks: ['Inspect young leaves for streaks or unusual mottling.', 'Look for leaf spots or rust-like marks.', 'Check whether symptoms are appearing across one area or the whole field.']
  },
  coffee: {
    intro: 'Coffee prevention depends on healthy planting material, good field structure and regular inspection.',
    risks: ['Coffee leaf rust', 'Coffee berry disease', 'Coffee wilt disease', 'Black coffee twig borer'],
    actions: [
      'Get planting material from a recognised, reliable nursery.',
      'Use recommended spacing and prune/manage the canopy to avoid an overgrown, crowded field.',
      'Inspect leaves, berries and branches regularly for unusual marks or drying.',
      'Remove and safely manage affected plant parts following local extension guidance.',
      'Maintain soil fertility and moisture with locally recommended practices.',
      'Ask UCDA or an agricultural extension officer to verify suspected disease or pest problems.'
    ],
    checks: ['Check both sides of leaves for yellow-orange powdery patches.', 'Inspect developing berries for dark, sunken marks.', 'Look for unusual branch or twig drying.']
  },
  banana: {
    intro: 'Clean planting material, field hygiene and frequent inspection are important for keeping banana plants healthy.',
    risks: ['Banana bacterial wilt', 'Black Sigatoka', 'Fusarium wilt'],
    actions: [
      'Plant healthy suckers or planting material from a trusted source.',
      'Inspect plants regularly, including leaves, stems and bunches.',
      'Clean soil and plant debris from tools, and follow local guidance for tool hygiene between mats.',
      'Keep the mat well managed and remove excess unwanted growth using recommended practices.',
      'Do not move suspicious planting material from an affected field to another field.',
      'Report suspected banana bacterial wilt promptly to an extension officer.'
    ],
    checks: ['Look for unusual yellowing or wilting.', 'Check bunches and male buds for unusual drying or rotting.', 'Watch for leaf streaks or spots that spread.']
  },
  tomato: {
    intro: 'Tomatoes need clean seedlings, good airflow and frequent checks because problems can spread quickly in a crop.',
    risks: ['Early blight', 'Late blight', 'Bacterial wilt', 'Tomato leaf mould'],
    actions: [
      'Start with healthy seedlings from a trusted nursery.',
      'Use locally recommended spacing and support plants where appropriate to improve airflow.',
      'Keep the crop well drained; avoid leaving water standing around plants.',
      'Inspect leaves, stems and fruit regularly, including the lower leaves.',
      'Remove crop residues and manage weeds around the plot.',
      'Do not reuse suspect seedlings or move soil from a problem area without local advice.'
    ],
    checks: ['Look for spreading dark or brown leaf patches.', 'Check for sudden wilting even when soil is moist.', 'Inspect the underside of leaves and developing fruit.']
  },
  potato: {
    intro: 'Healthy seed tubers, field hygiene and regular scouting are key parts of potato disease prevention.',
    risks: ['Late blight', 'Early blight', 'Bacterial wilt'],
    actions: [
      'Plant healthy, disease-free seed tubers from a trusted source.',
      'Use varieties and planting practices recommended for your area.',
      'Maintain recommended spacing and earth up as advised by local extension guidance.',
      'Keep the field well drained and avoid moving soil or plant material from suspect areas.',
      'Inspect leaves and stems frequently, especially during wet weather.',
      'Ask an extension officer to verify suspected blight or wilt before treatment.'
    ],
    checks: ['Look for dark, spreading leaf patches.', 'Check stems for dark lesions or collapse.', 'Notice whether wilting is isolated or spreading through the field.']
  }
};

export default function DiseasePrevention({ onBack }: { onBack: () => void }) {
  const [cropId, setCropId] = useState<CropId>('maize');
  const crop = SUPPORTED_CROPS.find(item => item.id === cropId)!;
  const guide = GUIDES[cropId];

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back to crop health" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8eee2] text-[#28583d]"><ChevronLeft className="h-5 w-5" /></button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7b916e]">CROP CARE · PREVENTION</p>
          <h2 className="text-xl font-bold text-[#24392b]">Disease prevention</h2>
        </div>
      </div>

      <div className="rounded-3xl bg-[#174432] p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><ShieldCheck className="h-5 w-5 text-[#e5d6a8]" /></span>
          <div><p className="font-semibold">Protect your crops early</p><p className="mt-0.5 text-xs text-white/70">Practical prevention guidance for your crop.</p></div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/80">Choose what you grow to see common health threats and everyday steps that can help reduce disease risk.</p>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#718074]">Choose your crop</p>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_CROPS.map(item => <button key={item.id} onClick={() => setCropId(item.id)} className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-center transition ${cropId === item.id ? 'bg-[#e7eddf] ring-2 ring-[#527a55]' : 'bg-white ring-1 ring-[#e6e9df]'}`}>
            <span className="text-xl">{item.emoji}</span><span className="text-xs font-semibold text-[#263b2d]">{item.name}</span>
          </button>)}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e6e9df]">
        <div className="flex items-center gap-3"><span className="text-3xl">{crop.emoji}</span><div><p className="text-xs text-[#829084]">PREVENTION GUIDE</p><h3 className="text-lg font-semibold text-[#24392b]">{crop.name}</h3></div></div>
        <p className="mt-3 text-sm leading-relaxed text-[#718074]">{guide.intro}</p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e6e9df]">
        <div className="flex items-center gap-2"><Leaf className="h-4 w-4 text-[#477653]"/><h3 className="text-sm font-semibold text-[#24392b]">Common diseases to know</h3></div>
        <div className="mt-3 flex flex-wrap gap-2">{guide.risks.map(risk => <span key={risk} className="rounded-full bg-[#f1f4ed] px-3 py-1.5 text-xs font-medium text-[#47614d]">{risk}</span>)}</div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#879087]">These are examples of known crop diseases, not a report that they are currently present on your farm.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e6e9df]">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#477653]"/><h3 className="text-sm font-semibold text-[#24392b]">Prevention steps</h3></div>
        <ol className="mt-3 space-y-3">{guide.actions.map((action, index) => <li key={action} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e7eddf] text-[11px] font-bold text-[#315640]">{index + 1}</span><span className="pt-0.5 text-sm leading-relaxed text-[#52645a]">{action}</span></li>)}</ol>
      </div>

      <div className="rounded-2xl bg-[#f5ebd2] p-4">
        <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-[#8b6531]"/><h3 className="text-sm font-semibold text-[#5c4828]">What to inspect</h3></div>
        <ul className="mt-3 space-y-2">{guide.checks.map(check => <li key={check} className="flex gap-2 text-sm leading-relaxed text-[#6f624d]"><span>•</span><span>{check}</span></li>)}</ul>
      </div>

      <div className="rounded-2xl border border-[#e6e9df] bg-white p-4">
        <div className="flex items-center gap-2"><CloudRain className="h-4 w-4 text-[#477653]"/><h3 className="text-sm font-semibold text-[#24392b]">When you notice symptoms</h3></div>
        <p className="mt-2 text-sm leading-relaxed text-[#718074]">Take a clear photo, note when the symptoms started and whether they are spreading, then use Crop health check. If symptoms spread quickly or many plants are affected, contact an agricultural extension officer for confirmation.</p>
      </div>

      <div className="rounded-2xl bg-[#f4f6f0] p-4">
        <p className="text-xs font-semibold text-[#52645a]">Agricultural references</p>
        <a href="https://www.agriculture.go.ug/department-of-crop-protection/" target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-between gap-2 text-sm font-medium text-[#315640]">MAAIF Department of Crop Protection <ExternalLink className="h-3.5 w-3.5 shrink-0"/></a>
        <a href="https://www.agriculture.go.ug/pest-control-knowledge/" target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-between gap-2 text-sm font-medium text-[#315640]">MAAIF / CABI crop pest knowledge <ExternalLink className="h-3.5 w-3.5 shrink-0"/></a>
        <a href="https://www.agriculture.go.ug/2019/04/16/farmers-advisory-from-the-ministry-of-agriculture-animal-industry-and-fisheries/" target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-between gap-2 text-sm font-medium text-[#315640]">MAAIF farmers' advisory <ExternalLink className="h-3.5 w-3.5 shrink-0"/></a>
        <p className="mt-3 text-[11px] leading-relaxed text-[#879087]">Guidance is general. Local variety, season and field conditions matter. Confirm disease symptoms with a qualified local adviser before applying any treatment.</p>
      </div>
    </section>
  );
}
