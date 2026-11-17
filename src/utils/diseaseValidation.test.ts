import test from 'node:test';
import assert from 'node:assert/strict';
import { findMismatchedDiseaseHost, isGenericDiseaseLabel } from './diseaseValidation.ts';

test('rejects eggplant labels even when crop name is not at the end', () => {
  assert.equal(
    findMismatchedDiseaseHost('tomato', 'Alternaria solani - Early blight of eggplant'),
    'eggplant',
  );
});

test('rejects a different supported crop named anywhere in the label', () => {
  assert.equal(
    findMismatchedDiseaseHost('tomato', 'Late blight of potato'),
    'potato',
  );
});

test('allows a label that names the selected crop only', () => {
  assert.equal(
    findMismatchedDiseaseHost('tomato', 'Tomato leaf mould'),
    null,
  );
});

test('allows banana and plantain as equivalent selected-crop labels', () => {
  assert.equal(
    findMismatchedDiseaseHost('banana', 'Black Sigatoka of plantain'),
    null,
  );
});

test('rejects labels for crops outside the current provider coverage too', () => {
  assert.equal(
    findMismatchedDiseaseHost('maize', 'Rice blast disease'),
    'rice',
  );
});

test('recognises generic provider labels as non-diagnoses', () => {
  assert.equal(isGenericDiseaseLabel('ZZXXZZ', 'Unknown pathogen'), true);
  assert.equal(isGenericDiseaseLabel('Some disease', 'Tomato leaf mould'), false);
});


test('matches the leading scientific-name candidate for each supported provider crop', () => {
  const cases = [
    ['maize', 'Zea mays L.'],
    ['beans', 'Phaseolus vulgaris L.'],
    ['coffee', 'Coffea arabica L.'],
    ['banana', 'Musa acuminata Colla'],
    ['tomato', 'Solanum lycopersicum L.'],
    ['potato', 'Solanum tuberosum L.'],
  ] as const;
  for (const [crop, scientificName] of cases) {
    assert.equal(matchesSelectedCropPlant(crop, scientificName), true, crop);
  }
});

test('rejects a different crop and rejects unsupported crops without a mapping', () => {
  assert.equal(matchesSelectedCropPlant('tomato', 'Solanum tuberosum L.'), false);
  assert.equal(matchesSelectedCropPlant('maize', 'Oryza sativa L.'), false);
  assert.equal(matchesSelectedCropPlant('cassava', 'Manihot esculenta Crantz'), true);
  assert.equal(matchesSelectedCropPlant('rice', 'Oryza sativa L.'), true);
});

test('does not accept empty, missing or partial scientific names', () => {
  assert.equal(matchesSelectedCropPlant('tomato', ''), false);
  assert.equal(matchesSelectedCropPlant('tomato', null), false);
  assert.equal(matchesSelectedCropPlant('tomato', 'Solanum'), false);
});
