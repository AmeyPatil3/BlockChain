/**
 * @file explainController.ts
 * Section 9: Grounded AI Explanation Layer
 * Uses Google Gemini (gemini-3.8-flash) grounded on verified EVM & Z3 SMT execution evidence,
 * with deterministic offline fallback.
 */

import { GoogleGenAI } from '@google/genai';
import { ValidationResult, CandidateAttackPath } from '../../validator/types.ts';

export interface ExplanationResponse {
  explanation: string;
  impact: string;
  recommendation: string;
  model?: string;
}

export class ExplainController {
  public static async explain(
    validationResult: ValidationResult,
    candidate?: CandidateAttackPath,
    sourceCode?: string
  ): Promise<ExplanationResponse> {
    const isConfirmed = validationResult.status === 'CONFIRMED';
    const variable =
      candidate?.vulnerability_variable ||
      (candidate as any)?.vulnerabilityVariable ||
      validationResult.variable ||
      'state variable';
    const slot = String(
      candidate?.expected_storage?.slot ??
      (candidate as any)?.storage?.slot ??
      validationResult.evidence?.writer_observed?.slot ??
      '0'
    );
    const pathStr =
      validationResult.attack_path?.join(' -> ') ||
      candidate?.attack_path?.join(' -> ') ||
      'attack sequence';
    const writerFunc =
      candidate?.writer_function ||
      (candidate as any)?.writerFunction ||
      'writer';
    const readerFunc =
      candidate?.reader_function ||
      (candidate as any)?.readerFunction ||
      'reader';
    const contractName = candidate?.contract || 'SmartContract';

    // 1. If GEMINI_API_KEY is available, invoke live Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() && !apiKey.includes('YOUR_API_KEY')) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a top-tier Ethereum security auditor specializing in unvalidated delegatecall vulnerabilities, storage layout collisions, and symbolic EVM verification.
Analyze this verified vulnerability evidence and return a JSON object with your audit explanation.

EMPIRICAL EVIDENCE (VERIFIED IN EVM & Z3 SMT SOLVER):
- Contract: ${contractName}
- Status: ${validationResult.status} (${isConfirmed ? 'CRITICAL VULNERABILITY CONFIRMED' : 'REJECTED / ACCESS CONTROL GUARDED'})
- State Variable Target: ${variable} (EVM Storage Slot ${slot})
- Writer Function: ${writerFunc}()
- Reader/Sink Function: ${readerFunc}()
- Attack Sequence: ${pathStr}
- SMT Constraint Result: ${validationResult.constraints} (Z3 Solver)
- Verification Evidence: ${validationResult.reason || 'Storage write & read verified in EVM sandbox'}
${sourceCode ? `\nSOURCE CODE CONTEXT:\n\`\`\`solidity\n${sourceCode.slice(0, 3000)}\n\`\`\`` : ''}

Respond ONLY with valid JSON with keys:
{
  "explanation": "Clear, technical explanation of why this path is ${isConfirmed ? 'exploitable via delegatecall storage slot corruption' : 'safely defended by access control'}.",
  "impact": "Concrete financial, governance, or operational impact on the contract and users.",
  "recommendation": "Actionable, numbered code-level remediation steps (e.g. ERC-1967 storage, immutable variables, modifiers)."
}`;

        let res;
        try {
          res = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
          });
        } catch (mErr: any) {
          console.warn('[ExplainController] gemini-flash-latest error, trying gemini-3.8-flash:', mErr.message);
          res = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
          });
        }

        const rawText = res.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            explanation: parsed.explanation || '',
            impact: parsed.impact || '',
            recommendation: parsed.recommendation || '',
            model: 'Google Gemini Flash (Live AI)',
          };
        }
      } catch (geminiError: any) {
        console.warn(
          '[ExplainController] Gemini API call failed, falling back to evidence-grounded template:',
          geminiError.message
        );
      }
    }

    // 2. Deterministic evidence-grounded fallback
    return this.fallbackExplain(validationResult, candidate);
  }

  private static fallbackExplain(
    validationResult: ValidationResult,
    candidate?: CandidateAttackPath
  ): ExplanationResponse {
    const isConfirmed = validationResult.status === 'CONFIRMED';
    const variable =
      candidate?.vulnerability_variable ||
      (candidate as any)?.vulnerabilityVariable ||
      validationResult.variable ||
      'state variable';
    const pathStr =
      validationResult.attack_path?.join(' -> ') ||
      candidate?.attack_path?.join(' -> ') ||
      'attack sequence';
    const slot = String(
      candidate?.expected_storage?.slot ??
      (candidate as any)?.storage?.slot ??
      validationResult.evidence?.writer_observed?.slot ??
      '0'
    );
    const writerFunc =
      candidate?.writer_function ||
      (candidate as any)?.writerFunction ||
      'writer';
    const readerFunc =
      candidate?.reader_function ||
      (candidate as any)?.readerFunction ||
      'reader';

    if (!isConfirmed) {
      return {
        explanation: `Candidate path [${pathStr}] targeting '${variable}' was evaluated in the EVM sandbox but could NOT be exploited. Guard conditions halted execution: ${validationResult.reason || 'Unauthorized callers reverted'}.`,
        impact: 'Low / Benign: The evaluated attack vector is neutralized by access control guards.',
        recommendation: 'Maintain existing modifier checks and ensure new implementation functions retain authorization requirements.',
        model: 'Evidence-Grounding Engine (Deterministic)',
      };
    }

    const sensitiveSink =
      validationResult.evidence?.sensitive_operation_details || readerFunc;

    const explanation = `The candidate path [${pathStr}] is a CONFIRMED critical delegatecall vulnerability. During execution in an isolated EVM environment, calling '${writerFunc}()' modified storage slot 0x${slot} ('${variable}'). Because delegatecall operates in the caller proxy's storage context, this overwrite replaced the authority variable with the attacker's address. Subsequently, calling '${readerFunc}()' satisfied access-control constraints (Z3 SMT check returned SAT), permitting the caller to trigger '${sensitiveSink}'.`;

    const impact = `Critical Financial & Control Risk: An unauthorized external actor can invoke the unauthenticated delegatecall path to overwrite '${variable}' at storage slot 0x${slot}, seizing control and draining vault balances or triggering destruction.`;

    const recommendation = `1. Ensure implementation logic contracts cannot be initialized directly via external calls.\n2. Adopt ERC-1967 Unstructured Storage to prevent slot collisions between proxy and implementation state variables.\n3. Mark fixed administrative parameters as 'immutable' so they are embedded directly in runtime bytecode.\n4. Apply the 'onlyOwner' modifier to all functions in implementation contracts that modify critical state.`;

    return {
      explanation,
      impact,
      recommendation,
      model: 'Evidence-Grounding Engine (Deterministic)',
    };
  }
}
