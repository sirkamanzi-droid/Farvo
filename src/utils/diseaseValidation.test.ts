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
