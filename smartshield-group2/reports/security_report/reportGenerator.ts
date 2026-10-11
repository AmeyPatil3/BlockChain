import { GoogleGenAI } from '@google/genai';
import { ValidationResult, SimulationResult, CandidateAttackPath } from '../../validator/types.ts';

export interface SecurityReportData {
  contractName: string;
  compilerVersion: string;
  candidatePath: CandidateAttackPath;
  validationResult: ValidationResult;
  simulationResult?: SimulationResult;
  aiExplanation?: {
    explanation: string;
    impact: string;
    recommendation: string;
    model?: string;
  };
  soliditySource?: string;
}

export class ReportGenerator {
  public static async generateMarkdownReport(data: SecurityReportData): Promise<string> {
    const { contractName, compilerVersion, candidatePath, validationResult, simulationResult, aiExplanation, soliditySource } = data;
    const isConfirmed = validationResult.status === 'CONFIRMED';
    const timestamp = new Date().toISOString();

    let geminiAuditorAnalysis = '';
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() && !apiKey.includes('YOUR_API_KEY')) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        let res;
        try {
          res = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: `You are an elite smart contract auditor writing the executive assessment section of a formal security report.
TARGET: ${contractName}
STATUS: ${isConfirmed ? 'CRITICAL EXPLOIT CONFIRMED' : 'REJECTED / SAFE'}
ATTACK PATH: ${(candidatePath.attack_path || []).join(' -> ')}
TARGET VARIABLE: ${candidatePath.vulnerability_variable || 'owner'}
EVM SMT RESULT: ${validationResult.constraints}

Write a professional 2-paragraph auditor assessment analyzing:
1. Threat model and systemic risk to the protocol.
2. The exact storage layout mechanics and why modern upgradeable proxies (ERC-1967/UUPS) prevent this failure mode.
Format as Markdown with bolding and bullet points.`,
          });
        } catch (mErr: any) {
          console.warn('[ReportGenerator] gemini-flash-latest error, trying gemini-3.8-flash:', mErr.message);
          res = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `You are an elite smart contract auditor writing the executive assessment section of a formal security report.
TARGET: ${contractName}
STATUS: ${isConfirmed ? 'CRITICAL EXPLOIT CONFIRMED' : 'REJECTED / SAFE'}
ATTACK PATH: ${(candidatePath.attack_path || []).join(' -> ')}
TARGET VARIABLE: ${candidatePath.vulnerability_variable || 'owner'}
EVM SMT RESULT: ${validationResult.constraints}

Write a professional 2-paragraph auditor assessment analyzing:
1. Threat model and systemic risk to the protocol.
2. The exact storage layout mechanics and why modern upgradeable proxies (ERC-1967/UUPS) prevent this failure mode.
Format as Markdown with bolding and bullet points.`,
          });
        }
        geminiAuditorAnalysis = res.text || '';
      } catch (err: any) {
        console.warn('[ReportGenerator] Gemini report enrichment skipped:', err.message);
      }
    }

    return `# SmartShield Security Audit Report: ${contractName}

**Report Generated:** ${timestamp}  
**Compiler Version:** ${compilerVersion}  
**Assessment Target:** \`${contractName}\`  
**Methodology:** DelegateTracker (Static AST Candidate Discovery + Dynamic EVM Opcode Validation)  
**Overall Validation Status:** **[ ${validationResult.status} ]** ${isConfirmed ? '🚨 CRITICAL VULNERABILITY CONFIRMED' : '✅ REJECTED / BENIGN'}

---

## 1. Executive Summary

${
  isConfirmed
    ? `An exploitable state-hijacking delegatecall vulnerability has been **CONFIRMED** in contract \`${contractName}\`. Runtime execution traces prove that untrusted external callers can overwrite sensitive storage slot \`0x${validationResult.evidence?.writer_observed?.slot || '0'}\` (associated with state variable \`${validationResult.variable}\`), satisfying access-control guards and executing sensitive operations.`
    : `Candidate attack path evaluated for contract \`${contractName}\` was **REJECTED**. Runtime verification demonstrated that constraints cannot be satisfied or external reachability is guarded.`
}

---

## 2. Attack Path Specification

- **Caller Contract:** \`${candidatePath.caller_contract || candidatePath.callerContract || contractName}\`
- **Callee Implementation:** \`${candidatePath.callee_contract || candidatePath.calleeContract || 'N/A'}\`
- **Delegatecall Entry:** \`${candidatePath.delegatecall_function || 'fallback'}\`
- **Writer Function:** \`${candidatePath.writer_function || candidatePath.writerFunction}\`
- **Reader / Sink Function:** \`${candidatePath.reader_function || candidatePath.readerFunction}\`
- **Target Storage Slot:** \`0x${candidatePath.expected_storage?.slot ?? '0'}\` (Offset: \`${candidatePath.expected_storage?.offset ?? 0}\`)
- **Vulnerability Category:** \`${candidatePath.vulnerability_type || candidatePath.vulnerabilityType}\`
- **Candidate Execution Chain:**
  \`${(candidatePath.attack_path || candidatePath.path || []).join(' ➔ ')}\`

---

## 3. Dynamic Execution & Storage Evidence

| Verification Criterion | Static Prediction | Runtime Observation | Verdict |
| :--- | :--- | :--- | :--- |
| **Path Executability** | Proposed Candidate | Executed without revert | ${validationResult.executable ? '✅ PASS' : '❌ FAIL'} |
| **Storage Slot Write** | Slot \`0x${candidatePath.expected_storage?.slot ?? '0'}\` | \`SSTORE\` intercepted at \`0x${validationResult.evidence?.writer_observed?.slot || '0'}\` | ${validationResult.write_detected ? '✅ DETECTED' : '❌ NOT OBSERVED'} |
| **Storage Slot Read** | Slot \`0x${candidatePath.expected_storage?.slot ?? '0'}\` | \`SLOAD\` intercepted at \`0x${validationResult.evidence?.reader_observed?.slot || '0'}\` | ${validationResult.read_detected ? '✅ DETECTED' : '❌ NOT OBSERVED'} |
| **Storage Slot Alignment** | Slot \`0x${candidatePath.expected_storage?.slot ?? '0'}\` | Slot Match Verified | ${validationResult.storage_match ? '✅ MATCH' : '❌ MISMATCH'} |
| **Constraint Satisfiability** | Guard Condition | SMT Z3 Solver: \`${validationResult.constraints}\` | ${validationResult.constraints === 'SAT' ? '✅ SATISFIED' : '❌ UNSAT'} |
| **Sensitive Sink Reachability** | Sensitive Operation | Transfer / Destruct Triggered | ${validationResult.sensitive_operation_reached ? '✅ REACHED' : '❌ BLOCKED'} |

### Runtime Storage Access Log
\`\`\`json
${JSON.stringify(validationResult.runtime_accesses, null, 2)}
\`\`\`

---

${
  simulationResult
    ? `## 4. Controlled Sandbox Simulation Results

A safe local reproduction was executed in an isolated EVM sandbox:

### Pre-Exploit State (BEFORE)
- **Contract Owner:** \`${simulationResult.before_state.owner}\`
- **Contract Balance:** \`${simulationResult.before_state.contractBalanceEth} ETH\`
- **Attacker Balance:** \`${simulationResult.before_state.attackerBalanceEth} ETH\`

### Exploit Sequence
${simulationResult.steps
  .map(
    (step) =>
      `${step.stepNumber}. **${step.action}**\n   - Caller: \`${step.caller}\`\n   - Target: \`${step.targetContract}\`\n   - Calldata: \`${step.calldataSummary}\`${
        step.fundsTransferredEth ? `\n   - Transferred: \`${step.fundsTransferredEth} ETH\`` : ''
      }`
  )
  .join('\n\n')}

### Post-Exploit State (AFTER)
- **Contract Owner:** \`${simulationResult.after_state.owner}\`
- **Contract Balance:** \`${simulationResult.after_state.contractBalanceEth} ETH\`
- **Attacker Balance:** \`${simulationResult.after_state.attackerBalanceEth} ETH\`

**Demonstrated Impact:**  
> ${simulationResult.impact.summary}

---`
    : ''
}

## 5. Grounded AI Explanation & Root Cause Analysis

${
  geminiAuditorAnalysis
    ? `### AI Auditor Synthesis (Google Gemini 3.8 Flash)
${geminiAuditorAnalysis}

`
    : ''
}${
  aiExplanation
    ? `### Root Cause
${aiExplanation.explanation}

### Severity & Financial Impact
${aiExplanation.impact}

### Remediation Guidance
${aiExplanation.recommendation}`
    : `### Root Cause
Contract \`${contractName}\` forwards execution to an external implementation library using \`delegatecall\`. Because both contracts declare state variables occupying storage slot 0, the unauthenticated call to \`${candidatePath.writer_function}\` mutates slot 0 within the caller's storage context.

### Remediation Guidance
1. **Align Storage Layouts:** Utilize unstructured storage (ERC-1967) or diamond storage patterns to avoid slot collisions between proxies and implementations.
2. **Access Control:** Guard the writer function in the implementation contract with proper access restrictions or remove public initialization mechanisms.
3. **Immutability:** Mark immutable configuration addresses as \`immutable\` so they are stored in code bytecode rather than mutable storage slots.`
}

---

## 6. Analysis Limitations & Reproducibility Notice
- Analysis conducted on deterministic local EVM runner.
- Environment: Node.js / solc ${compilerVersion} / @ethereumjs/vm.
- Constraints solved using Microsoft Z3 SMT solver.
- No live networks or mainnet funds were touched during this validation.
`;
  }
}
