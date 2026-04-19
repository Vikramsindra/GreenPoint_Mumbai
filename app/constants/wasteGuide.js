// filepath: app/constants/wasteGuide.js
export const WASTE_CATEGORIES = [
  {
    id: 'wet',
    name: 'Wet / Biodegradable',
    binLabel: 'Green bin',
    binColor: '#16a34a',
    icon: '🥬',
    examples: ['vegetable peels (sabzi waste)', 'cooked rice/roti (stale)', 'tea leaves/bags', 'banana/mango peels', 'pooja flower garlands', 'garden/leaf clippings'],
    commonMistakes: ['wrapping in plastic before disposal', 'putting coconut shells (slow to decompose — better as dry)'],
    tip: 'Home composting wet waste reduces landfill load by 60-70%.'
  },
  {
    id: 'dry',
    name: 'Dry / Recyclable',
    binLabel: 'Blue bin',
    binColor: '#2563eb',
    icon: '♻️',
    examples: ['newspapers/magazines', 'PET water bottles (rinsed clean)', 'cardboard (Swiggy/Amazon boxes flattened)', 'glass bottles/jars', 'metal tins (rinsed)', 'tetra pak juice cartons'],
    commonMistakes: ['putting oily/food-stained paper in dry bin', 'mixing broken glass with recyclables without wrapping'],
    tip: 'Ensure recyclables are empty and rinsed to prevent contamination.'
  },
  {
    id: 'hazardous',
    name: 'Domestic Hazardous',
    binLabel: 'Red bin',
    binColor: '#dc2626',
    icon: '⚠️',
    examples: ['expired medicines/tablets', 'AA/AAA batteries', 'CFL bulbs/tube lights', 'mosquito repellent liquid/refills', 'paint cans/thinner', 'pesticide containers'],
    commonMistakes: ['flushing medicines down the drain (contaminates water)', 'putting CFL bulbs in regular bins (mercury hazard)'],
    tip: 'Keep hazardous items separate for safe processing.'
  },
  {
    id: 'ewaste',
    name: 'E-Waste',
    binLabel: 'Black bin',
    binColor: '#1e293b',
    icon: '📱',
    examples: ['old mobile phones', 'USB/charging cables', 'earphones', 'broken pen drives', 'laptop batteries', 'electric bulb sockets/holders'],
    commonMistakes: ['giving e-waste to regular kabadiwala who cannot process it safely', 'mixing with dry recyclables'],
    tip: 'Dispose of e-waste only through authorised processing centres.'
  },
  {
    id: 'sanitary',
    name: 'Sanitary Waste',
    binLabel: 'Orange bin',
    binColor: '#ea580c',
    icon: '🩹',
    examples: ['sanitary napkins (wrapped in paper)', 'baby diapers (folded & wrapped)', 'wound bandages', 'used cotton swabs', 'face masks (used)', 'tissue paper (used)'],
    commonMistakes: ['mixing sanitary waste with wet food waste', 'putting unwrapped in bin (hygiene risk for collectors)'],
    tip: 'Wrap sanitary items separately and hand to BMC workers directly.'
  },
  {
    id: 'inert',
    name: 'Inert / Construction',
    binLabel: 'Grey bin',
    binColor: '#64748b',
    icon: '🧱',
    examples: ['broken floor tiles', 'brick/cement rubble', 'plaster debris', 'sand', 'empty cement bags', 'mirror/window glass shards'],
    commonMistakes: ['dumping in municipal bins (too heavy, damages vehicles)', 'throwing glass shards unwrapped (injury risk)'],
    tip: 'Contact BMC helpline for special bulk pickup of construction debris.'
  }
];
