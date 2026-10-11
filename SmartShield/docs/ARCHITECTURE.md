# SmartShield Architecture

## Static Delegatecall Analysis & Read/Write Data Flow Engine

Based on the research paper:
> **“DelegateTracker: Delegatecall vulnerability detection tool based on read-write data flow capture algorithm”**

---

## 1. High-Level System Architecture

SmartShield isolates potential delegatecall attack paths through deterministic AST and data-flow analysis rather than naive keyword search:

```
                      Solidity Source (.sol)
                                ↓
                        Compiler / AST Parser
                                ↓
                           Contract IR
            ┌───────────────────┼───────────────────┐
            ↓                   ↓                   ↓
       Function AST        Storage Slot       Read/Write
         Analysis            Modeling          Analysis
            └───────────────────┼───────────────────┘
                                ↓
                        Call Graph & CFG
                                ↓
                     Delegatecall Detection
                                ↓
                   Sensitive Operation Analysis
                                ↓
                    Pattern Rule Engine
            (Selfdestruct, Currency, Condition)
                                ↓
                       Attack Path Search
                                ↓
                     Candidate Attack Paths
                                ↓
               Machine-Readable Handoff Package
```

---

## 2. Core Modules

### 2.1 Parser & Contract Model (`src/analyzer/parser/`)
- Ingests Solidity source files via `@solidity-parser/parser`.
- Constructs a consolidated `ContractIR` representation.
- Extracts contract definitions, functions, state variables, modifiers, constructors, fallback, and receive handlers.

### 2.2 Storage Layout Engine (`src/analyzer/storage/`)
- Computes EVM contiguous 32-byte storage slot packing.
- Accounts for byte widths: `address` (20B), `uint8..256`, `bool` (1B), `bytesN`.
- Flags dynamic types (mappings, dynamic arrays) that use keccak256 slot hashing.
- Compares caller and callee storage layouts to detect **Potential Storage Conflicts**.

### 2.3 Read/Write Data-Flow Engine (`src/analyzer/dataflow/`)
- Semantically captures persistent state-variable mutations (WRITEs):
  - Direct assignments (`=`)
  - Compound assignments (`+=`, `-=`, `*=`, `/=`)
  - Increments and decrements (`++`, `--`)
  - Deletions (`delete`)
- Semantically captures persistent state-variable accesses (READs):
  - Conditional checks (`require`, `assert`, `if`, `while`, `for`)
  - Expressions, comparisons, and binary operations
  - Function call parameters (destinations and amounts)
  - Return statements

### 2.4 Sensitive Operation Engine (`src/analyzer/sensitiveOperations/`)
Detects the three paper-defined sensitive sink categories:
1. **Self-Destruct Anomaly:** `selfdestruct(address)`
2. **Currency-Sending Anomaly:** `transfer()`, `send()`, `call{value: ...}()`
3. **Judgment-Condition Disorder:** state-variable evaluation inside access control conditions (`require(msg.sender == owner)`)

### 2.5 Attack Path Search Engine (`src/analyzer/attackPaths/`)
Traverses the data-flow graph to identify candidate sequences:
$$\text{Externally Accessible Writer Function} \longrightarrow \text{State Variable } X \longrightarrow \text{Reader Function} \longrightarrow \text{Sensitive Sink}$$

Every path generated is categorized as `status: "CANDIDATE"` with `validationRequired: true`.

---

## 3. UI Layer & User Experience

- **Simple View (Default):** Tailored for users and auditors. Displays overall security status, delegatecalls found, candidate attack paths, affected state variables, and visual step-by-step path cards with code snippets.
- **Advanced Inspector:** For researchers. Unlocks deep technical tabs for AST inspection, full Read/Write matrix, Call Graph, CFG, Storage packing tables, and Scan History.
