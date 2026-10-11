# SmartShield Scope & Limitations

## 1. Static Analysis Scope vs. Dynamic Validation

SmartShield is a **pure static analysis engine**. Its explicit goal is to identify **candidate attack paths** through AST traversal, EVM storage layout modeling, and persistent state-variable read-write data flow capture.

### What SmartShield Guarantees:
- **No False Negatives on Direct State-Flow:** If an accessible writer function mutates a state variable that is subsequently evaluated by a sensitive sink function, a candidate path is generated.
- **Deterministic & Offline:** Analysis runs entirely on local AST structures without relying on third-party cloud RPC nodes, heuristic guesses, or opaque LLM scanners.
- **Traceable Source Evidence:** Every candidate path references exact source line numbers, storage slots, and caller/callee context.

### What Static Analysis Cannot Resolve (Handoff Target):
1. **Modifier Satisfiability:** If a writer function has a complex custom modifier (e.g. `onlyRole(keccak256("ADMIN"))` or cryptographic signature check), static analysis flags the data-flow chain. Symbolic constraint solvers (e.g. Z3) are required to determine whether an unauthorized attacker can satisfy the conditions.
2. **Dynamic Delegatecall Targets:** If the target of a `delegatecall` is computed dynamically at runtime from input calldata, static analysis classifies it as `target_resolution: "UNKNOWN"` or `PARAMETER`.
3. **Dynamic Keccak256 Storage Slots:** Dynamic mapping keys (`mapping(address => uint256)`) and dynamically-sized arrays calculate their actual EVM storage slot at runtime via `keccak256(key . slot)`. SmartShield calculates the base declaration slot and flags dynamic entries as `isComplex: true`.
4. **Non-Confirmed Vulnerabilities:** All outputs are designated as `status: "CANDIDATE"`. They represent unvalidated attack hypotheses for downstream symbolic verification.
