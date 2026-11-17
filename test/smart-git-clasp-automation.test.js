import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const safeSync = require('/Users/jeffureta/.gemini/config/skills/smart-git-clasp/scripts/safe_sync.js');

describe('smart-git-clasp Deployment Automation & Resolution (TDD)', () => {
  const sampleDeploymentsOutput = `Found 9 deployments.
- AKfycbxIb3AMClb9jPoRC7lFJVubdQQecZjlQymilwSKz10 @HEAD 
- AKfycbwfQU86lNiQObPiQkd8xGaI9NIp_mTYWWA1dIDczqEbP9-z7PSNAPeXkZcXInKHNz2z @21 - Release v21: ChatBot widget header title
- AKfycbxD5Njxeh5Euus4h5z9vbVyg-zzHhlqhwRuKW8aB86C7bU3oOYlYM5XJGHMVZ5dBh3F @4 
- AKfycbzcQ260EaV_pNnfyPKB4bQZPXzxseCq_6Vw5JT8UqyuGkApDnzzsxOEmWyRuRrQw_Hv @3 
- AKfycbw558KUvCMgspCWimqz60hLgDL5n8SasOhOtJgqzNIDcjSKdBRdZ-91AHBXGhMyY6yD @2 
- AKfycbwHf01YU0iXLzPl8MFb0AxKLPf6khOM_RTE-3z_Pba2oueaqDtPBpO0cw-9jVdyaCnb @12 - Test deployment without 10% weekly discount
- AKfycbyAltTJYLHzvY9qfX8JaFLO2UDl2dceclof8H9WH4SNGvKNAeM753Rsz96770zZRboK @10 - Fix HtmlService ES5 preprocessor SyntaxError UID
- AKfycbz8pN8-jflaUGcjpCWmI-d4W9yjW7iGbMFts47UGgJqkTxdexWvRE3tCSNRoW0g89vt @11 - Update test deployment with latest mobile Guest Agent
- AKfycbxB_1h6wVjTkKQE3W7snwE404mjLaBAvoLDuc7mNRyDitmWSIUCveMv838xIIiRgp4 @7 - Add resilient iframe fallback for calendar rendering`;

  test('parseDeployments extracts list of deployments correctly', () => {
    assert.equal(typeof safeSync.parseDeployments, 'function', 'parseDeployments must be exported');
    const parsed = safeSync.parseDeployments(sampleDeploymentsOutput);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 9);
    assert.equal(parsed[0].id, 'AKfycbxIb3AMClb9jPoRC7lFJVubdQQecZjlQymilwSKz10');
    assert.equal(parsed[0].version, '@HEAD');
    assert.equal(parsed[1].id, 'AKfycbwfQU86lNiQObPiQkd8xGaI9NIp_mTYWWA1dIDczqEbP9-z7PSNAPeXkZcXInKHNz2z');
    assert.equal(parsed[1].version, '@21');
  });

  test('resolveActiveDeploymentId prioritizes .clasp.json deploymentId if specified', () => {
    assert.equal(typeof safeSync.resolveActiveDeploymentId, 'function', 'resolveActiveDeploymentId must be exported');
    const customId = 'CUSTOM_DEPLOYMENT_ID_12345';
    const resolved = safeSync.resolveActiveDeploymentId({
      claspConfig: { deploymentId: customId },
      deploymentsOutput: sampleDeploymentsOutput
    });
    assert.equal(resolved.deploymentId, customId);
    assert.equal(resolved.url, `https://script.google.com/macros/s/${customId}/exec`);
  });

  test('resolveActiveDeploymentId auto-detects latest versioned deployment if not specified in .clasp.json', () => {
    const resolved = safeSync.resolveActiveDeploymentId({
      claspConfig: {},
      deploymentsOutput: sampleDeploymentsOutput
    });
    // Should choose the first non-HEAD active deployment (AKfycbwfQU86lNiQObPiQkd8xGaI9NIp_mTYWWA1dIDczqEbP9-z7PSNAPeXkZcXInKHNz2z)
    assert.equal(resolved.deploymentId, 'AKfycbwfQU86lNiQObPiQkd8xGaI9NIp_mTYWWA1dIDczqEbP9-z7PSNAPeXkZcXInKHNz2z');
    assert.equal(resolved.version, '@21');
    assert.equal(resolved.url, 'https://script.google.com/macros/s/AKfycbwfQU86lNiQObPiQkd8xGaI9NIp_mTYWWA1dIDczqEbP9-z7PSNAPeXkZcXInKHNz2z/exec');
  });

  test('parseCreatedVersion extracts version number from clasp version output', () => {
    assert.equal(typeof safeSync.parseCreatedVersion, 'function', 'parseCreatedVersion must be exported');
    assert.equal(safeSync.parseCreatedVersion('- Creating a new version...\nCreated version 22'), 22);
    assert.equal(safeSync.parseCreatedVersion('Created version 5.'), 5);
    assert.equal(safeSync.parseCreatedVersion('Failed to create version'), null);
  });
});
