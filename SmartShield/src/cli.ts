/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { AnalyzerService } from './analyzer/index.ts';

function main() {
  const args = process.argv.slice(2);
  let targetFile = args[0] === 'analyze' ? args[1] : args[0];

  if (!targetFile) {
    targetFile = 'examples/vulnerable_owner.sol';
    console.log(`[SmartShield CLI] No file specified, analyzing default example: ${targetFile}`);
  }

  const resolvedPath = path.resolve(process.cwd(), targetFile);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found at ${resolvedPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const filename = path.basename(resolvedPath);

  console.log('====================================================');
  console.log('SMARTSHIELD: STATIC DELEGATECALL ANALYZER');
  console.log('DelegateTracker Read-Write Data Flow Engine');
  console.log('====================================================\n');
  console.log(`Target: ${filename}`);
  console.log('Analyzing static structure and candidate attack paths...\n');

  const result = AnalyzerService.analyze({
    sources: [{ filename, content }],
    compilerVersion: '0.8.20',
  });

  console.log('====================================================');
  console.log('ANALYSIS SUMMARY');
  console.log('====================================================');
  console.log(`Contracts: ${result.summary.contractsCount}`);
  console.log(`Functions: ${result.summary.functionsCount}`);
  console.log(`State Variables: ${result.summary.stateVariablesCount}`);
  console.log(`Delegatecalls: ${result.summary.delegatecallCount}`);
  console.log(`Sensitive Operations: ${result.summary.sensitiveOperationsCount}`);
  console.log(`Candidate Attack Paths: ${result.summary.candidateAttackPathsCount}`);
  console.log('----------------------------------------------------');

  if (result.candidateAttackPaths.length === 0) {
    console.log('No candidate attack paths discovered.');
  } else {
    result.candidateAttackPaths.forEach((p, idx) => {
      console.log(`\n[#${idx + 1}] ${p.id} - ${p.vulnerability_type || p.vulnerabilityType}`);
      console.log(`Status: ${p.status} (Validation Required)`);
      console.log(`Storage Slot: ${p.storage.slot} (offset: ${p.storage.offset})`);
      console.log(`Flow:`);
      console.log(`  ${p.writerFunction}()`);
      console.log(`    ↓ [WRITE: ${p.vulnerabilityVariable}]`);
      console.log(`  ${p.vulnerabilityVariable}`);
      console.log(`    ↓ [READ: ${p.vulnerabilityVariable}]`);
      console.log(`  ${p.readerFunction}()`);
      console.log(`    ↓ [SINK: ${p.sensitiveOperation.type}]`);
      console.log(`Reason: ${p.reason}`);
    });
  }

  // Export results
  const outDir = path.resolve(process.cwd(), 'results');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const manifest = {
    schema_version: '1.0',
    tool: 'SmartShield Static Analyzer',
    target: filename,
    timestamp: new Date().toISOString(),
    status: result.status,
    candidate_paths_count: result.candidateAttackPaths.length,
    handoff_notice: 'Stage 1 static candidate findings. Stage 2 symbolic validation required.',
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outDir, 'candidate_paths.json'), JSON.stringify(result.candidateAttackPaths, null, 2));
  fs.writeFileSync(path.join(outDir, 'contract_ir.json'), JSON.stringify(result.ir, null, 2));
  fs.writeFileSync(path.join(outDir, 'storage_layout.json'), JSON.stringify(result.ir.storageLayout, null, 2));
  fs.writeFileSync(path.join(outDir, 'delegatecalls.json'), JSON.stringify(result.ir.delegatecalls, null, 2));

  console.log(`\n====================================================`);
  console.log(`Results exported to: ${outDir}/`);
  console.log(`- manifest.json`);
  console.log(`- candidate_paths.json`);
  console.log(`- contract_ir.json`);
  console.log(`- storage_layout.json`);
  console.log(`- delegatecalls.json`);
  console.log(`====================================================\n`);
}

main();
