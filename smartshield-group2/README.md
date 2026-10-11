# SmartShield Group 2: Delegatecall Attack Path Validation & Simulation

SmartShield Group 2 is the dynamic execution validation, controlled simulation, visual presentation, and grounded AI explanation layer of the SmartShield smart-contract security pipeline.

---

## 1. Core Principle & Mission

While Group 1 operates as a static analyzer identifying candidate attack hypotheses via AST parsing and read/write data-flow capture, Group 2 determines whether those candidate paths are **actually executable** in an isolated EVM environment.

> **Core Principle:** Group 2 does not decide vulnerability from the mere presence of `delegatecall`. It validates candidate paths produced by Group 1 using runtime read/write, storage, reachability, and satisfiability evidence.

---

## 2. Architecture & Subsystems

```
GROUP 1 (Static Analysis in SmartShield/)
  │
  ▼ CandidateAttackPath JSON / Section 35 Package
GROUP 2 (smartshield-group2/)
  │
  ├── validator/
  │   ├── compiler/                  # In-memory Solidity compiler (solc 0.8.37)
  │   ├── symbolic_executor/         # Isolated EVM runner hooking SLOAD/SSTORE/DELEGATECALL/CALL
  │   ├── storage_tracker/           # Slot/offset alignment & access comparisons
  │   ├── constraint_checker/        # Microsoft Z3 SMT solver checking path satisfiability
  │   └── path_validator/            # Sequential path execution & CONFIRMED/REJECTED verdicts
  │
  ├── simulator/
  │   └── simulation_engine/         # Safe sandbox executing exploit replay & computing state diffs
  │
  ├── api/
  │   ├── server.ts                  # Express server on port 3001
  │   ├── routes.ts                  # /api/validate, /api/simulate, /api/explain, /api/report
  │   └── explain/                   # Grounded, evidence-bound AI root cause explanation
  │
  ├── ui/                            # React 19 + Tailwind CSS interactive dashboard
  │   ├── attack_path_view/          # Clickable visual attack graph exposing runtime evidence
  │   ├── simulation_view/           # Before vs. After state & balance transition cards
  │   └── validation_result/         # 6-criteria verification checklist & status badges
  │
  └── tests/
      ├── vulnerable_contracts/      # VulnerableOwner reference benchmark
      ├── safe_contracts/            # SafeDelegatecall benchmark
      └── validation_tests/          # Milestone 1 & automated regression test suites
```

---

## 3. Quick Start Guide

### Prerequisites
- Node.js (v20+ recommended)
- npm

### 1. Run Automated Validation Tests (Milestone 1)
```bash
npm test
```
*Proves end-to-end execution of `vulnerable_owner.sol`: intercepts `SSTORE` (write) and `SLOAD` (read) at slot 0, matches storage layout, satisfies Z3 constraints (`SAT`), reaches sensitive transfer sink, returns `CONFIRMED`, and runs controlled exploit simulation.*

### 2. Run Full Regression Suite
```bash
npm run test:all
```
*Executes both vulnerable contracts (verifying true positives) and safe contracts (verifying rejection with zero false positives).*

### 3. Start the Web Dashboard & API Server
```bash
npm start
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser to interact with:
- **Interactive Visual Attack Path Graph:** Click individual nodes to inspect runtime opcodes, PC offsets, and storage slots.
- **Controlled Sandbox Simulation:** View Before/After state cards comparing Alice vs. Attacker balances and owner state.
- **Grounded AI Explanation:** Evidence-bound analysis of root cause and remediation.
- **Security Audit Report Export:** Download formatted Markdown audit reports.

---

## 4. API Endpoints

### `POST /api/validate`
Validates a candidate attack path against compiled bytecode in the isolated EVM sandbox.
```json
{
  "contract": "VulnerableOwnerProxy",
  "candidate_path": {
    "writer_function": "initialize",
    "reader_function": "execute",
    "vulnerability_variable": "owner",
    "expected_storage": { "slot": 0, "offset": 0 }
  },
  "solidity_source": "<contract source code>"
}
```

### `POST /api/simulate`
Safely demonstrates confirmed findings in a clean sandbox without touching real networks or funds.
```json
{
  "contract": "VulnerableOwnerProxy",
  "candidate_path": { ... },
  "solidity_source": "<contract source code>",
  "initial_balance": "10.0"
}
```

### `POST /api/explain`
Generates an evidence-bound AI root cause explanation without hallucinations.
```json
{
  "validation_result": { ... }
}
```

### `POST /api/report`
Generates a complete auditor-grade Markdown report detailing contract metadata, execution traces, simulation state diffs, and remediation.

---

## 5. Compliance with Group 2 PRD

| PRD Section | Requirement | Implementation Status |
| :--- | :--- | :--- |
| **FR-01** | Contract Compilation with version tracking | Implemented via `SolcCompiler` (`solc 0.8.37`) |
| **FR-02** | Isolated EVM Execution Engine | Implemented via `EVMRunner` (`@ethereumjs/vm`) |
| **FR-03** | Candidate Path Execution | Implemented via `CandidateValidator` |
| **FR-04** | Runtime READ/WRITE Opcode Capture | Intercepts `SSTORE` (write) & `SLOAD` (read) |
| **FR-05** | Storage Layout Validation | Implemented via `SlotComparator` |
| **FR-06** | State Variable Validation | Verifies writer and reader access sequence |
| **FR-07** | Constraint Validation (SAT/UNSAT) | Implemented via Microsoft `z3-solver` |
| **FR-08** | Vulnerability Confirmation | Returns `CONFIRMED` only when all 6 criteria hold |
| **FR-09** | Rejection / Inconclusive Handling | Returns `REJECTED` for safe contracts, `INCONCLUSIVE` on errors |
| **Section 7**| Controlled Attack Simulation | Implemented via `ExploitReplayer` |
| **Section 8**| Visual Graph with Clickable Evidence | Implemented via `AttackGraph.tsx` |
| **Section 9**| Grounded AI Explanation Layer | Implemented via `ExplainController.ts` |
| **Section 10**| Security Audit Report Generator | Implemented via `ReportGenerator.ts` |
| **Section 16**| Milestone 1 Verification Proof | Verified passing via `milestone1.test.ts` |
