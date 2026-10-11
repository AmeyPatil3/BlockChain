# Downstream Symbolic & Dynamic Validation Handoff Guide

## 1. Overview of the Handoff Boundary

SmartShield produces **Stage 1 static candidate findings**. The downstream validation module consumes these candidate paths and performs **symbolic execution, path constraint solving, and dynamic transaction replay**.

```
STAGE 1 (SmartShield Static Engine)
Solidity Source → AST → State Read/Write → Storage Slots → Candidate Attack Paths
                                   │
                                   ▼ [Machine-Readable Analysis Package]
STAGE 2 (Symbolic & Dynamic Validation)
Symbolic Execution → Constraint Solving (Z3) → Storage Slot Alignment → CONFIRMED / REJECTED
```

---

## 2. Package Ingestion

The downstream validator should consume the standardized export:
- Endpoint: `GET /api/analysis/:id/package`
- File: `smartshield-analysis-package.json`

### Core Package Files:
1. `candidate_paths.json`: Primary input list of candidate paths to validate.
2. `contract_ir.json`: Detailed AST representations of all functions, statements, and expressions.
3. `storage_layout.json`: Slot and byte offset packing for verifying storage collision.
4. `read_write.json`: Specific state variable read and write sets per function.

---

## 3. Recommended Validation Pipeline

For each candidate path in `candidate_paths.json`:

1. **Target Reachability:**
   Formulate path conditions for the `writer.function` to verify whether an arbitrary caller identity (`msg.sender != owner`) can reach the write statement.
2. **Storage Slot Collision Check:**
   Verify if the caller contract's storage slot matches the callee contract's slot assigned during `delegatecall` execution.
3. **Sink Feasibility:**
   Solve path constraints for `reader.function` leading to `sink.type` (e.g. `require(msg.sender == owner)` where `owner` has been modified by the writer).
4. **Outcome Assignment:**
   - **CONFIRMED VULNERABILITY:** Constraints are satisfiable and an execution vector exists.
   - **BENIGN / REJECTED:** Guard conditions cannot be satisfied by an untrusted actor.
