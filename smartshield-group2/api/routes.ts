  /**
 * @file routes.ts
 * Section 11: Group 2 API Requirements
 * POST /api/validate
 * POST /api/simulate
 * POST /api/explain
 * POST /api/report
 */

import { Router } from 'express';
import { CandidateValidator } from '../validator/path_validator/candidateValidator.ts';
import { ExploitReplayer } from '../simulator/simulation_engine/exploitReplayer.ts';
import { ExplainController } from './explain/explainController.ts';
import { ReportGenerator } from '../reports/security_report/reportGenerator.ts';
import { CandidateAttackPath, ValidationResult } from '../validator/types.ts';
import { SolcCompiler } from '../validator/compiler/solcCompiler.ts';

export const group2Router = Router();

// Health check
group2Router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    module: 'SmartShield Group 2 - Dynamic Validation & Simulation Engine',
    version: '1.0.0',
    compilerVersion: SolcCompiler.getCompilerVersion(),
  });
});

// POST /api/ingest-from-group1
// Automatically pulls Section 35 package from Group 1 (port 3000) and executes validation
group2Router.post('/ingest-from-group1', async (req, res) => {
  try {
    const defaultG1Url = process.env.GROUP1_URL || 'http://localhost:3000';
    const { group1Url = defaultG1Url, analysisId, solidity_source } = req.body;

    let candidatePaths: CandidateAttackPath[] = [];
    let solSource = solidity_source;
    let importedFilename: string | null = null;

    // 1. Fetch candidate paths from Group 1
    try {
      const endpoint = analysisId
        ? `${group1Url}/api/analysis/${analysisId}/package`
        : `${group1Url}/api/attack-paths`;

      const response = await fetch(endpoint);
      if (response.ok) {
        const pkg: any = await response.json();
        candidatePaths = pkg['candidate_paths.json'] || (Array.isArray(pkg) ? pkg : pkg.candidateAttackPaths || []);
      }
    } catch (e: any) {
      console.warn(`Could not reach Group 1 at ${group1Url}:`, e.message);
    }

    if (candidatePaths.length === 0) {
      return res.status(404).json({
        error: 'No candidate attack paths retrieved from Group 1. Make sure Group 1 is running on port 3000.',
      });
    }

    // 2. Fetch the uploaded Solidity source from Group 1 (new /api/source endpoint)
    if (!solSource) {
      try {
        const srcRes = await fetch(`${group1Url}/api/source`);
        if (srcRes.ok) {
          const srcData: any = await srcRes.json();
          solSource = srcData.source;
          importedFilename = srcData.filename || null;
          console.log(`[Group 2] Imported source from Group 1: ${importedFilename}`);
        }
      } catch (e: any) {
        console.warn('[Group 2] Could not fetch source from Group 1:', e.message);
      }
    }

    // 3. Validate each candidate
    const results = [];
    for (const cand of candidatePaths) {
      const validation = await CandidateValidator.validateCandidate(cand, {
        soliditySource: solSource,
      });
      results.push({
        candidate_id: cand.id,
        candidate: cand,
        validation,
      });
    }

    return res.json({
      status: 'SUCCESS',
      source: `Group 1 (${group1Url})`,
      candidates_count: candidatePaths.length,
      // Return the imported source so the UI can display the real uploaded contract
      solidity_source: solSource || null,
      filename: importedFilename,
      results,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to ingest and validate from Group 1',
      details: err.message || String(err),
    });
  }
});

// POST /api/validate
group2Router.post('/validate', async (req, res) => {
  try {
    const { contract, candidate_path, candidatePath, solidity_source, source_code, source, sources } = req.body;

    const targetCandidate: CandidateAttackPath = candidate_path || candidatePath || {};
    if (contract && !targetCandidate.contract) {
      targetCandidate.contract = contract;
    }

    const solSource = solidity_source || source_code || source;

    const validationResult = await CandidateValidator.validateCandidate(targetCandidate, {
      soliditySource: solSource,
      sources,
    });

    return res.json({
      status: validationResult.status,
      validation: validationResult,
      runtime_accesses: validationResult.runtime_accesses,
      storage_matches: [
        {
          matched: validationResult.storage_match,
          variable: validationResult.variable,
        },
      ],
      attack_path: validationResult.attack_path,
    });
  } catch (err: any) {
    console.error('Error during validation:', err);
    return res.status(500).json({
      error: 'Validation engine error',
      details: err.message || String(err),
    });
  }
});

// POST /api/simulate
group2Router.post('/simulate', async (req, res) => {
  try {
    const { contract, candidate_path, validated_path, solidity_source, source_code, initial_balance } = req.body;

    const targetCandidate: CandidateAttackPath = validated_path || candidate_path || {};
    if (contract && !targetCandidate.contract) {
      targetCandidate.contract = contract;
    }

    const solSource = solidity_source || source_code;
    if (!solSource) {
      return res.status(400).json({ error: 'solidity_source is required for simulation.' });
    }

    const simResult = await ExploitReplayer.simulateExploit(
      targetCandidate,
      solSource,
      initial_balance || '10.0'
    );

    return res.json(simResult);
  } catch (err: any) {
    console.error('Error during simulation:', err);
    return res.status(500).json({
      error: 'Simulation engine error',
      details: err.message || String(err),
    });
  }
});

// POST /api/explain
group2Router.post('/explain', async (req, res) => {
  try {
    const { validation_result, validationResult, candidate_path, candidatePath, solidity_source, source_code } = req.body;
    const targetResult: ValidationResult = validation_result || validationResult;
    const targetCandidate: CandidateAttackPath = candidate_path || candidatePath;
    const targetSource = solidity_source || source_code;

    if (!targetResult) {
      return res.status(400).json({ error: 'validation_result is required' });
    }

    const explanation = await ExplainController.explain(targetResult, targetCandidate, targetSource);
    return res.json(explanation);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Explanation generation failed',
      details: err.message || String(err),
    });
  }
});

// POST /api/report
group2Router.post('/report', async (req, res) => {
  try {
    const { contract_name, candidate_path, validation_result, simulation_result, ai_explanation, solidity_source } = req.body;

    const reportMarkdown = await ReportGenerator.generateMarkdownReport({
      contractName: contract_name || validation_result?.variable || 'SmartContract',
      compilerVersion: SolcCompiler.getCompilerVersion(),
      candidatePath: candidate_path || {},
      validationResult: validation_result,
      simulationResult: simulation_result,
      aiExplanation: ai_explanation,
      soliditySource: solidity_source,
    });

    return res.json({
      format: 'markdown',
      report: reportMarkdown,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Report generation failed',
      details: err.message || String(err),
    });
  }
});

// GET /api/gemini-status
group2Router.get('/gemini-status', (req, res) => {
  const key = process.env.GEMINI_API_KEY || '';
  const configured = Boolean(key.trim() && !key.includes('YOUR_API_KEY'));
  return res.json({
    configured,
    preview: configured ? `${key.slice(0, 8)}...${key.slice(-4)}` : null,
  });
});

// POST /api/set-gemini-key
group2Router.post('/set-gemini-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return res.status(400).json({ error: 'Valid apiKey string is required' });
    }
    const cleanKey = apiKey.trim();
    process.env.GEMINI_API_KEY = cleanKey;

    // Persist to smartshield-group2/.env
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.resolve(process.cwd(), '.env');
    fs.writeFileSync(
      envPath,
      `# Gemini API key for optional AI-powered attack path explanation\nGEMINI_API_KEY=${cleanKey}\n`,
      'utf8'
    );

    return res.json({
      success: true,
      message: 'Gemini API key updated and active.',
      preview: `${cleanKey.slice(0, 8)}...${cleanKey.slice(-4)}`,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to update Gemini API key',
      details: err.message || String(err),
    });
  }
});

