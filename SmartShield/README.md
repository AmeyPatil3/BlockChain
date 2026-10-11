# SmartShield: Delegatecall Attack-Path Search & Static Analysis

> **Notice**: SmartShield implements static attack-path search and read/write data-flow capture for Solidity smart contracts. Candidate attack paths are unvalidated attack hypotheses; dynamic and symbolic validation is required to test runtime constraint satisfiability.

---

## 1. Overview & Research Foundation

SmartShield is built upon the methodology outlined in the academic research paper:
> **“DelegateTracker: Delegatecall vulnerability detection tool based on read-write data flow capture algorithm”**

The central premise of DelegateTracker is answering a fundamentally more meaningful question than *“Does this contract contain delegatecall?”*:
> **“Does this delegatecall participate in a potentially exploitable relationship involving state-variable modification, subsequent state-variable use, and a security-sensitive operation?”**

SmartShield investigates this through a deterministic static analysis pipeline:

```
Solidity Contract (.sol)
          ↓
Program Understanding (AST)
          ↓
Delegatecall Detection
          ↓
State Read/Write Analysis
          ↓
Sensitive Operation Analysis
          ↓
Attack Path Search
          ↓
Candidate Attack Paths (Standardized Machine-Readable Schema)
```

---

## 2. Key Features

- **AST Parsing & Internal Representation:** Extracts complete ContractIR without naive string or regex matching.
- **EVM Storage Layout Modeling:** Calculates contiguous 32-byte slot packing (uint8..256, address, bool, bytesN) and detects potential storage layout conflicts across delegatecalls.
- **Semantic Read/Write Data Flow:** Identifies persistent state-variable mutations (assignments, compound operations, increments, deletes) and accesses (requires, asserts, if-conditions, function arguments, transfer values/destinations).
- **The Three Anomaly Patterns:**
  1. *Self-Destruct Anomaly (`SELF_DESTRUCT`)*: Writer function modifies state variable read by function reaching `selfdestruct`.
  2. *Currency-Sending Anomaly (`CURRENCY_SENDING`)*: Writer function modifies state variable read by function reaching Ether transfer.
  3. *Judgment-Condition Disorder (`JUDGMENT_CONDITION`)*: Writer function modifies state variable evaluated inside access-control gatekeepers.
- **Two Application Modes:**
  - **Simple / Default View:** Designed for normal users and auditors. Clear security status, candidate paths, affected variables, and visual step-by-step path cards with source snippets.
  - **Advanced Inspector:** For researchers. Detailed AST breakdown, Read/Write matrix, Call Graph, CFG, Storage packing tables, Raw JSON, and Scan History.
- **Machine-Readable Handoff Package:** Fully implements the Section 35 analysis package specification for downstream symbolic execution.

---

## 3. Included Example Contracts

SmartShield includes the 8 reference contracts specified in the research benchmarks:

1. `examples/safe_delegatecall.sol`: Protected delegatecall with immutable owner and strict access control.
2. `examples/vulnerable_owner.sol`: Classic unvalidated delegatecall proxy allowing owner slot overwrite and draining.
3. `examples/vulnerable_transfer.sol`: State-variable mutation of treasury/beneficiary destination leading to unauthorized withdrawal.
4. `examples/vulnerable_selfdestruct.sol`: Uninitialized implementation library allowing arbitrary takeover and `selfdestruct`.
5. `examples/vulnerable_condition.sol`: Mutation of lock flags leading to condition disorder and bypassing vault gates.
6. `examples/cross_contract_delegatecall.sol`: Multi-contract project analyzing caller proxy and callee implementation data-flow.
7. `examples/storage_mismatch.sol`: Slot collision between caller contract (slot 0: address) and callee contract (slot 0: uint256).
8. `examples/unresolved_target.sol`: Dynamic delegatecall target passed via input calldata parameter without static resolution.

---

## 4. CLI Usage

Run the static analyzer directly from your command line:

```bash
# Analyze a specific contract
npm run cli examples/vulnerable_owner.sol

# Or using tsx directly
npx tsx src/cli.ts examples/vulnerable_transfer.sol
```

The CLI outputs:
- Contracts, functions, and state-variable counts
- Delegatecall and sensitive operation occurrences
- Step-by-step candidate attack path flow
- Auto-exports results to `results/` (`manifest.json`, `candidate_paths.json`, `contract_ir.json`, `storage_layout.json`, `delegatecalls.json`)

---

## 5. Web Application

```bash
# Start the web server
npm run dev

# Open in browser
http://localhost:3000
```

---

## 6. Automated Test Suite

```bash
# Run the 14-suite automated test engine
npm run test
```

All 41 tests verify AST extraction, semantic read/write identification, compound operations, storage packing, call graph construction, delegatecall detection, sensitive sink isolation, and candidate attack-path generation.

---

## 7. Documentation Index

- [Architecture Guide](docs/ARCHITECTURE.md): Complete module diagrams and design details.
- [Data Schema](docs/DATA_SCHEMA.md): JSON schema specifications for candidate paths and IR.
- [Scope & Limitations](docs/LIMITATIONS.md): Boundaries of static analysis vs. symbolic validation.
- [Validation Handoff Guide](docs/GROUP2_HANDOFF.md): Ingestion guidelines for downstream symbolic solvers.
