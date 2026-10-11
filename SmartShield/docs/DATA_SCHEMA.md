# SmartShield Data Schema Specification

## 1. Candidate Attack Path Schema (Section 36 Compliance)

Every candidate path produced by SmartShield adheres to the following machine-readable JSON schema:

```json
{
  "schema_version": "1.0",
  "id": "PATH-001",
  "contract": "Wallet",
  "vulnerability_type": "CURRENCY_SENDING",
  "status": "CANDIDATE",

  "entry_point": {
    "function": "initialize",
    "source_line": 8
  },

  "writer": {
    "function": "initialize",
    "variable": "owner",
    "source_line": 8
  },

  "reader": {
    "function": "execute",
    "variable": "owner",
    "source_line": 14
  },

  "sink": {
    "type": "ETHER_TRANSFER",
    "function": "execute",
    "source_line": 16
  },

  "delegatecall": {
    "function": "fallback",
    "source_line": 42,
    "target": "implementation",
    "target_resolution": "STATE_VARIABLE"
  },

  "storage": {
    "variable": "owner",
    "slot": "0",
    "offset": 0
  },

  "path": [
    "initialize",
    "owner",
    "execute",
    "ether_transfer"
  ],

  "access_control": {
    "writer": "PUBLIC",
    "reader": "OWNER_RESTRICTED"
  },

  "evidence": {
    "reason": "State variable is written by the source function and subsequently read by a function reaching a sensitive operation."
  }
}
```

---

## 2. Machine-Readable Handoff Package Structure (Section 35)

When exporting the complete analysis package, SmartShield produces an archive containing:

1. `manifest.json`: Tool version, timestamp, target file, summary statistics, and handoff notice.
2. `candidate_paths.json`: Array of `CandidateAttackPath` objects.
3. `contract_ir.json`: Complete internal representation of all parsed contracts, AST elements, functions, and state variables.
4. `storage_layout.json`: Detailed EVM storage slot mappings, byte offsets, and collision flags.
5. `read_write.json`: Per-function state-variable read and write sets.
6. `call_graph.json`: Directed edges connecting callers to callees with call types (`internal`, `external`, `delegatecall`).
7. `cfg.json`: Control-flow basic blocks and branch nodes.
8. `delegatecalls.json`: Detailed metadata for every delegatecall occurrence, target expression, and access restrictions.
9. `source_metadata.json`: Original contract names, compiler versions, and lines of code.

---

## 3. Storage Slot Schema

```json
{
  "name": "owner",
  "type": "address",
  "slot": "0",
  "offset": 0,
  "bytes": 20,
  "contract": "VulnerableProxy",
  "isComplex": false
}
```
