/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { AnalyzerService } from '../analyzer/index.ts';
import { AnalysisInput, CandidateAttackPath } from '../analyzer/models/types.ts';
import { DEMO_CONTRACTS } from '../analyzer/examples/demoContracts.ts';
import { analysisStore } from './store.ts';

export const apiRouter = Router();

// POST /api/analyze
// Accepts { sources: [...] }, { filename, source_code }, or { source }
apiRouter.post('/analyze', (req, res) => {
  try {
    let { sources, source, source_code, filename = 'Contract.sol', compilerVersion = '0.8.20' } = req.body;

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      const code = source_code || source;
      if (typeof code === 'string' && code.trim()) {
        sources = [{ filename, content: code }];
      } else {
        return res.status(400).json({ error: 'Solidity source code is required' });
      }
    }

    // Persist source for Group 2 handoff via GET /api/source
    const primarySource = sources[0];
    analysisStore.setSource(primarySource.content, primarySource.filename || filename);

    const input: AnalysisInput = {
      sources,
      compilerVersion,
    };

    const result = AnalyzerService.analyze(input);
    const analysisId = 'analysis-' + Date.now();
    analysisStore.setResult(analysisId, result);

    return res.json({
      ...result,
      status: result.status,
      analysis_id: analysisId,
      id: analysisId,
      contract_summary: result.summary,
      delegatecalls: result.ir.delegatecalls,
      candidate_paths: result.candidateAttackPaths,
    });
  } catch (err: any) {
    console.error('Error during analysis:', err);
    return res.status(500).json({
      error: 'Internal static analysis failure',
      details: err?.message || String(err),
    });
  }
});

// GET /api/analysis/:id
apiRouter.get('/analysis/:id', (req, res) => {
  const result = analysisStore.getResult(req.params.id);
  if (!result) {
    return res.status(404).json({ error: `Analysis '${req.params.id}' not found.` });
  }
  return res.json(result);
});

// GET /api/analysis/:id/paths
apiRouter.get('/analysis/:id/paths', (req, res) => {
  const result = analysisStore.getResult(req.params.id);
  if (!result) {
    return res.status(404).json({ error: `Analysis '${req.params.id}' not found.` });
  }
  return res.json(result.candidateAttackPaths);
});

// GET /api/analysis/:id/contract-ir
apiRouter.get('/analysis/:id/contract-ir', (req, res) => {
  const result = analysisStore.getResult(req.params.id);
  if (!result) {
    return res.status(404).json({ error: `Analysis '${req.params.id}' not found.` });
  }
  return res.json(result.ir);
});

// GET /api/analysis/:id/storage
apiRouter.get('/analysis/:id/storage', (req, res) => {
  const result = analysisStore.getResult(req.params.id);
  if (!result) {
    return res.status(404).json({ error: `Analysis '${req.params.id}' not found.` });
  }
  return res.json(result.ir.storageLayout);
});

// GET /api/analysis/:id/graph
apiRouter.get('/analysis/:id/graph', (req, res) => {
  const result = analysisStore.getResult(req.params.id);
  if (!result) {
    return res.status(404).json({ error: `Analysis '${req.params.id}' not found.` });
  }
  return res.json({
    calls: result.ir.calls,
    controlFlow: result.ir.controlFlow,
  });
});

// GET /api/analysis/:id/package - Complete Machine-Readable Handoff Package (Section 35)
apiRouter.get('/analysis/:id/package', (req, res) => {
  const result = analysisStore.getResult(req.params.id);
  if (!result) {
    return res.status(404).json({ error: `Analysis '${req.params.id}' not found.` });
  }

  const manifest = {
    schema_version: '1.0',
    package_name: 'SmartShield Analysis Package',
    analysis_id: req.params.id,
    timestamp: new Date().toISOString(),
    tool: 'SmartShield Static Delegatecall Analyzer',
    methodology: 'DelegateTracker Read-Write Data Flow Capture Algorithm',
    status: 'STATIC_CANDIDATE_ATTACK_PATHS_GENERATED',
    handoff_notice:
      'Candidate attack paths are generated purely via static AST and data-flow analysis. They represent unvalidated attack hypotheses. Symbolic execution and dynamic verification are required for exploitability confirmation.',
    summary: result.summary,
  };

  const readWrite = result.ir.functions.map((f) => ({
    contract: f.contract,
    function: f.name,
    reads: f.reads,
    writes: f.writes,
    visibility: f.visibility,
    modifiers: f.modifiers,
    externalReachability: f.externalReachability,
  }));

  const sourceMetadata = {
    compilerVersion: result.ir.compilerVersion,
    contractsCount: result.summary.contractsCount,
    functionsCount: result.summary.functionsCount,
    stateVariablesCount: result.summary.stateVariablesCount,
    contracts: result.ir.contracts.map((c) => ({
      name: c.name,
      kind: c.kind,
      inheritance: c.inheritance,
    })),
  };

  return res.json({
    'manifest.json': manifest,
    'contract_ir.json': result.ir,
    'delegatecalls.json': result.ir.delegatecalls,
    'read_write.json': readWrite,
    'call_graph.json': result.ir.calls,
    'cfg.json': result.ir.controlFlow,
    'storage_layout.json': result.ir.storageLayout,
    'candidate_paths.json': result.candidateAttackPaths,
    'source_metadata.json': sourceMetadata,
  });
});

// GET /api/source — return the Solidity source last uploaded by the user
// Used by Group 2 to display the actual contract in its Solidity Contract Source panel
apiRouter.get('/source', (req, res) => {
  const src = analysisStore.getSource();
  if (!src) {
    return res.status(404).json({ error: 'No source code uploaded yet. Analyse a contract in Group 1 first.' });
  }
  return res.json(src);
});

// GET /api/attack-paths
apiRouter.get('/attack-paths', (req, res) => {
  const paths = analysisStore.getAllAttackPaths();
  return res.json(paths);
});

// POST /api/attack-paths/export
apiRouter.post('/attack-paths/export', (req, res) => {
  const { format = 'json' } = req.body;
  const paths = analysisStore.getAllAttackPaths();
  const currentResult = analysisStore.getResult();

  if (format === 'csv') {
    const headers = [
      'Candidate ID',
      'Vulnerability Type',
      'Caller Contract',
      'Callee Contract',
      'Writer Function',
      'Vulnerability Variable',
      'Reader Function',
      'Sensitive Operation',
      'Storage Slot',
      'Storage Offset',
      'Confidence',
      'Status',
      'Validation Required',
      'Reason',
    ];

    const rows = paths.map((p) => [
      p.id,
      p.vulnerability_type || p.vulnerabilityType,
      p.callerContract || 'N/A',
      p.calleeContract || 'N/A',
      p.writerFunction,
      p.vulnerabilityVariable,
      p.readerFunction,
      `${p.sensitiveOperation.type} in ${p.sensitiveOperation.function}`,
      p.storage.slot ?? 'N/A',
      p.storage.offset ?? '0',
      p.storage.confidence,
      p.status,
      p.validationRequired ? 'YES' : 'NO',
      `"${p.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartshield-candidate-attack-paths.csv"');
    return res.send(csvContent);
  }

  return res.json({
    timestamp: new Date().toISOString(),
    tool: 'SmartShield - Delegatecall Attack-Path Search',
    methodology: 'DelegateTracker Read-Write Data Flow AST Analysis',
    status: 'STATIC_CANDIDATES_GENERATED',
    validationNotice:
      'Candidate paths are generated by static analysis. They are not confirmed vulnerabilities. Runtime/symbolic validation is required.',
    summary: currentResult?.summary || null,
    candidateAttackPaths: paths,
  });
});

// GET /api/contracts/:id
apiRouter.get('/contracts/:id', (req, res) => {
  const contract = analysisStore.getContract(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: `Contract '${req.params.id}' not found in active analysis.` });
  }
  return res.json(contract);
});

// GET /api/contracts/:id/functions
apiRouter.get('/contracts/:id/functions', (req, res) => {
  const contract = analysisStore.getContract(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: `Contract '${req.params.id}' not found.` });
  }
  return res.json(contract.functions);
});

// GET /api/contracts/:id/read-write
apiRouter.get('/contracts/:id/read-write', (req, res) => {
  const contract = analysisStore.getContract(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: `Contract '${req.params.id}' not found.` });
  }
  const rwData = contract.functions.map((f) => ({
    function: f.name,
    reads: f.reads,
    writes: f.writes,
    visibility: f.visibility,
    modifiers: f.modifiers,
    externalReachability: f.externalReachability,
  }));
  return res.json(rwData);
});

// GET /api/contracts/:id/delegatecalls
apiRouter.get('/contracts/:id/delegatecalls', (req, res) => {
  const result = analysisStore.getResult();
  if (!result) {
    return res.status(404).json({ error: 'No active analysis found.' });
  }
  const dcs = result.ir.delegatecalls.filter(
    (d) => d.contract.toLowerCase() === req.params.id.toLowerCase()
  );
  return res.json(dcs);
});

// GET /api/contracts/:id/storage
apiRouter.get('/contracts/:id/storage', (req, res) => {
  const result = analysisStore.getResult();
  if (!result) {
    return res.status(404).json({ error: 'No active analysis found.' });
  }
  const slots = result.ir.storageLayout.filter(
    (s) => s.contract.toLowerCase() === req.params.id.toLowerCase()
  );
  return res.json(slots);
});

// GET /api/contracts/:id/attack-paths
apiRouter.get('/contracts/:id/attack-paths', (req, res) => {
  const paths = analysisStore.getAllAttackPaths().filter(
    (p) =>
      (p.callerContract && p.callerContract.toLowerCase() === req.params.id.toLowerCase()) ||
      (p.calleeContract && p.calleeContract.toLowerCase() === req.params.id.toLowerCase())
  );
  return res.json(paths);
});

// GET /api/demos
apiRouter.get('/demos', (req, res) => {
  return res.json(DEMO_CONTRACTS);
});

// POST /api/explain-path
// High-clarity, deterministic technical security breakdown (AI-ready structured explanation)
apiRouter.post('/explain-path', (req, res) => {
  const { path: candidatePath } = req.body;

  if (!candidatePath) {
    return res.status(400).json({ error: 'Candidate attack path data is required.' });
  }

  const explanation = `### Candidate Attack Path Security Assessment: ${candidatePath.id}

**Classification:** ${candidatePath.vulnerability_type || candidatePath.vulnerabilityType}
**Target Variable:** \`${candidatePath.vulnerabilityVariable}\` (Storage Slot ${candidatePath.storage.slot ?? '0'}, Offset ${candidatePath.storage.offset ?? 0})

#### 1. Read-Write Data Flow Mechanism
- **Writer Function:** \`${candidatePath.writerFunction}()\` mutates state variable \`${candidatePath.vulnerabilityVariable}\`.
- **Reader Function:** \`${candidatePath.readerFunction}()\` subsequently reads and evaluates \`${candidatePath.vulnerabilityVariable}\`.
- **Sink Operation:** ${candidatePath.sensitiveOperation.type} executed inside \`${candidatePath.sensitiveOperation.function}()\`.

#### 2. EVM Storage & Delegatecall Context
- The variable \`${candidatePath.vulnerabilityVariable}\` occupies EVM storage slot **${candidatePath.storage.slot ?? '0'}**.
- When an execution passes through a delegatecall context, the callee executes code using the caller's storage context. Any modification of slot ${candidatePath.storage.slot ?? '0'} in the callee will directly overwrite \`${candidatePath.vulnerabilityVariable}\` in the caller contract.

#### 3. Why This is a Candidate Path (Not Confirmed)
- Static analysis has identified that the function relationship and data-flow reach the sensitive sink.
- However, static analysis does not evaluate runtime constraint satisfiability (e.g. \`msg.sender\` checks, cryptographic proofs, or branch feasibilities). 

#### 4. Required Symbolic Validation Objectives
- Test reachability of \`${candidatePath.writerFunction}()\` under arbitrary attacker identities.
- Formulate symbolic SMT constraints for \`${candidatePath.readerFunction}()\` require/assert statements.
- Verify whether storage collision or ownership assignment can be satisfied dynamically.`;

  return res.json({
    explanation,
    status: 'SUCCESS',
  });
});
