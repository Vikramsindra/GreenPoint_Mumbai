// filepath: api/src/routes/awareness.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Campaign = require('../models/Campaign');
const QuizResult = require('../models/QuizResult');
const auth = require('../middleware/auth');
const pointsEngine = require('../services/pointsEngine');
const { validate } = require('../middleware/validate');

const WASTE_CATEGORIES = [
  {
    id: 'wet', name: 'Wet / Biodegradable', binLabel: 'Green bin', binColor: '#16a34a', icon: '🥬',
    examples: ['vegetable peels (sabzi waste)', 'cooked rice/roti (stale)', 'tea leaves/bags', 'banana/mango peels', 'pooja flower garlands', 'garden/leaf clippings'],
    commonMistakes: ['wrapping in plastic before disposal', 'putting coconut shells (slow to decompose — better as dry)'],
    tip: 'Home composting wet waste reduces landfill load by 60-70%.'
  },
  {
    id: 'dry', name: 'Dry / Recyclable', binLabel: 'Blue bin', binColor: '#2563eb', icon: '♻️',
    examples: ['newspapers/magazines', 'PET water bottles (rinsed clean)', 'cardboard (Swiggy/Amazon boxes flattened)', 'glass bottles/jars', 'metal tins (rinsed)', 'tetra pak juice cartons'],
    commonMistakes: ['putting oily/food-stained paper in dry bin', 'mixing broken glass with recyclables without wrapping'],
    tip: 'Ensure recyclables are empty and rinsed to prevent contamination.'
  },
  {
    id: 'hazardous', name: 'Domestic Hazardous', binLabel: 'Red bin', binColor: '#dc2626', icon: '⚠️',
    examples: ['expired medicines/tablets', 'AA/AAA batteries', 'CFL bulbs/tube lights', 'mosquito repellent liquid/refills', 'paint cans/thinner', 'pesticide containers'],
    commonMistakes: ['flushing medicines down the drain (contaminates water)', 'putting CFL bulbs in regular bins (mercury hazard)'],
    tip: 'Keep hazardous items separate for safe processing.'
  },
  {
    id: 'ewaste', name: 'E-Waste', binLabel: 'Black bin', binColor: '#1e293b', icon: '📱',
    examples: ['old mobile phones', 'USB/charging cables', 'earphones', 'broken pen drives', 'laptop batteries', 'electric bulb sockets/holders'],
    commonMistakes: ['giving e-waste to regular kabadiwala who cannot process it safely', 'mixing with dry recyclables'],
    tip: 'Dispose of e-waste only through authorised processing centres.'
  },
  {
    id: 'sanitary', name: 'Sanitary Waste', binLabel: 'Orange bin', binColor: '#ea580c', icon: '🩹',
    examples: ['sanitary napkins (wrapped in paper)', 'baby diapers (folded & wrapped)', 'wound bandages', 'used cotton swabs', 'face masks (used)', 'tissue paper (used)'],
    commonMistakes: ['mixing sanitary waste with wet food waste', 'putting unwrapped in bin (hygiene risk for collectors)'],
    tip: 'Wrap sanitary items separately and hand to BMC workers directly.'
  },
  {
    id: 'inert', name: 'Inert / Construction', binLabel: 'Grey bin', binColor: '#64748b', icon: '🧱',
    examples: ['broken floor tiles', 'brick/cement rubble', 'plaster debris', 'sand', 'empty cement bags', 'mirror/window glass shards'],
    commonMistakes: ['dumping in municipal bins (too heavy, damages vehicles)', 'throwing glass shards unwrapped (injury risk)'],
    tip: 'Contact BMC helpline for special bulk pickup of construction debris.'
  }
];

router.get('/campaigns', auth, async (req, res) => {
  try {
    const now = new Date();
    const campaigns = await Campaign.find({
      isActive: true,
      wardId: req.user.wardId,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).select('-quizQuestions.correctIndex');
    
    res.json({ success: true, data: campaigns, message: 'Campaigns fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

router.get('/quiz/:campaignId', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId).select('title description bonusPoints quizQuestions');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    
    const data = {
      campaignId: campaign._id,
      title: campaign.title,
      description: campaign.description,
      bonusPoints: campaign.bonusPoints,
      questions: campaign.quizQuestions.map(q => ({ question: q.question, options: q.options }))
    };
    
    res.json({ success: true, data, message: 'Quiz fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed: ' + error.message });
  }
});

const submitSchema = Joi.object({
  answers: Joi.array().items(Joi.number()).length(5).required()
});

router.post('/quiz/:campaignId/submit', auth, validate(submitSchema), async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { answers } = req.body;
    
    const existing = await QuizResult.findOne({ userId: req.user.id, campaignId });
    if (existing && existing.passed) {
      return res.status(409).json({ success: false, message: 'Already completed this quiz' });
    }
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    
    let correct = 0;
    for (let i = 0; i < 5; i++) {
      if (answers[i] === campaign.quizQuestions[i].correctIndex) {
        correct++;
      }
    }
    
    const total = 5;
    const score = Math.round((correct / total) * 100);
    const passed = score >= 80;
    let pointsAwarded = 0;
    
    if (passed) {
      const result = await pointsEngine.earnPoints(req.user.id, 'QUIZ_PASS', campaign.bonusPoints, `Quiz passed: ${campaign.title}`, { campaignId });
      pointsAwarded = result.pointsEarned;
      campaign.participantCount += 1;
      await campaign.save();
    }
    
    const quizResult = new QuizResult({
      userId: req.user.id,
      campaignId,
      score,
      passed,
      pointsAwarded,
      answers
    });
    
    // Check if unique index error happens on save, if it does just update it or proceed
    try {
      if(existing) {
         existing.score = score;
         existing.passed = passed;
         existing.pointsAwarded = pointsAwarded;
         existing.answers = answers;
         existing.attemptedAt = Date.now();
         await existing.save();
      } else {
         await quizResult.save();
      }
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
    
    res.json({
      success: true,
      data: { score, passed, correct, total, pointsAwarded },
      message: passed ? `Quiz passed! Earned ${pointsAwarded} pts.` : 'Try again to get 80% or more.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Submit failed: ' + error.message });
  }
});

router.get('/guide', auth, (req, res) => {
  res.json({ success: true, data: WASTE_CATEGORIES, message: 'Guide fetched' });
});

module.exports = router;
