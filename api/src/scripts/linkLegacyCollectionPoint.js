// filepath: api/src/scripts/linkLegacyCollectionPoint.js
require('dotenv').config();
const mongoose = require('mongoose');
const Society = require('../models/Society');
const CollectionPoint = require('../models/CollectionPoint');
const connectDB = require('../config/db');

async function linkLegacyCollectionPoint() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      params[key] = value;
    }
  }

  const { societyId, pointId, force = false } = params;
  const isDryRun = Boolean(params['dry-run'] || params.dryRun);

  if (!societyId || !pointId) {
    console.log('Usage: node src/scripts/linkLegacyCollectionPoint.js --societyId <ObjectId> --pointId <ObjectId> [--dry-run] [--force]');
    console.log('  --dry-run   Perform all validations and print plan without writing to database');
    console.log('  --force     Allow relinking if society already had a collection point');
    process.exit(1);
  }

  if (!mongoose.Types.ObjectId.isValid(societyId) || !mongoose.Types.ObjectId.isValid(pointId)) {
    console.error('❌ Invalid ObjectId format provided for societyId or pointId.');
    process.exit(1);
  }

  await connectDB();

  try {
    const society = await Society.findById(societyId);
    if (!society) {
      console.error(`❌ Society with ID ${societyId} not found.`);
      process.exit(1);
    }

    if (society.registrationStatus !== 'APPROVED') {
      console.error(`❌ Society ${society.name} is not APPROVED (status: ${society.registrationStatus}). Legacy collection points can only be linked to approved societies.`);
      process.exit(1);
    }

    if (society.collectionPointId && !force && society.collectionPointId.toString() !== pointId) {
      console.error(`❌ Society already linked to CollectionPoint ${society.collectionPointId}. Use --force to override.`);
      process.exit(1);
    }

    const point = await CollectionPoint.findById(pointId);
    if (!point) {
      console.error(`❌ CollectionPoint with ID ${pointId} not found.`);
      process.exit(1);
    }

    if (point.type !== 'society') {
      console.error(`❌ CollectionPoint ${point.name} is of type "${point.type}". Only collection points of type "society" can be linked to a Society.`);
      process.exit(1);
    }

    if (point.wardId.toUpperCase() !== society.wardId.toUpperCase()) {
      console.error(`❌ Ward conflict: Society ward is "${society.wardId}", but CollectionPoint ward is "${point.wardId}".`);
      process.exit(1);
    }

    if (point.societyId && point.societyId.toString() !== societyId && !force) {
      console.error(`❌ CollectionPoint is already linked to another Society (${point.societyId}). Use --force to reassign.`);
      process.exit(1);
    }

    console.log('\n--- Link Summary ---');
    console.log(`Society:          ${society.name} (${society._id}) [Ward: ${society.wardId}]`);
    console.log(`Collection Point: ${point.name} (${point._id}) [Type: ${point.type}, Ward: ${point.wardId}]`);
    console.log(`Mode:             ${isDryRun ? 'DRY RUN (No changes saved)' : 'COMMIT (Applying changes)'}`);
    console.log('--------------------\n');

    if (isDryRun) {
      console.log('✅ Validation passed. Dry run complete. No modifications made.');
      process.exit(0);
    }

    // Atomic update
    point.societyId = society._id;
    society.collectionPointId = point._id;

    await point.save();
    await society.save();

    console.log('✅ Successfully linked legacy CollectionPoint to Society.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Link failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  linkLegacyCollectionPoint();
}

module.exports = linkLegacyCollectionPoint;
