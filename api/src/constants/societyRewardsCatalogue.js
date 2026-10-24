// filepath: api/src/constants/societyRewardsCatalogue.js

/**
 * Server-owned Pilot Reward Catalogue for Approved Societies
 * Demonstration rewards only — no real financial, utility, or property tax commitments.
 */
const SOCIETY_REWARDS_CATALOGUE = [
  {
    id: 'DEMO-REWARD-10',
    name: 'Demo composting-kit voucher',
    description: 'Pilot voucher redeemable for 1 demonstration aerobin/starter composting culture for society premises.',
    pointsCost: 10,
    isActive: true,
    category: 'PILOT_EQUIPMENT',
    badge: '10 pts',
    fulfilmentInstructions: 'Present this voucher code to your BMC Ward Officer for demonstration verification and record fulfilment.',
    pilotDisclaimer: 'Demonstration / Pilot Reward only. Intended for GreenPoint Mumbai pilot evaluation. Does not represent external commercial procurement.'
  },
  {
    id: 'DEMO-REWARD-25',
    name: 'Demo Society Segregation Supplies Voucher',
    description: 'Pilot voucher for 1 bundle of colour-coded segregation bin signage and guidance posters for society wings.',
    pointsCost: 25,
    isActive: true,
    category: 'PILOT_SUPPLIES',
    badge: '25 pts',
    fulfilmentInstructions: 'Present this voucher code to your BMC Ward Officer during office hours for demonstration record fulfilment.',
    pilotDisclaimer: 'Demonstration / Pilot Reward only. Subject to BMC ward pilot availability.'
  },
  {
    id: 'DEMO-REWARD-50',
    name: 'Demo recognition certificate',
    description: 'Demonstration clean society recognition certificate acknowledging excellent segregation compliance in the pilot.',
    pointsCost: 50,
    isActive: true,
    category: 'PILOT_RECOGNITION',
    badge: '50 pts',
    fulfilmentInstructions: 'Processed directly by your Ward Officer upon verification of society compliance history.',
    pilotDisclaimer: 'Demonstration / Pilot Reward only. Issued for pilot milestone demonstration.'
  }
];

function getRewardById(id) {
  return SOCIETY_REWARDS_CATALOGUE.find(r => r.id === id);
}

module.exports = {
  SOCIETY_REWARDS_CATALOGUE,
  getRewardById
};
