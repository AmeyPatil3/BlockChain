import zipfile
import os
import sys
from xml.etree import ElementTree as ET
from generate_report_helpers import (
    qn, W_NS, R_NS, A_NS,
    make_run, make_para, make_page_break, make_heading, make_bullet,
    make_table, make_callout_box
)

DOCX_TEMPLATE = '/Users/ameypatil/Desktop/bt/SmartShield_Report.docx'
OUTPUT_DOCX = '/Users/ameypatil/Desktop/bt/SmartShield_Dynamic_Validation_Report.docx'

print("Extracting base template from:", DOCX_TEMPLATE)
with zipfile.ZipFile(DOCX_TEMPLATE, 'r') as z:
    base_xml = z.read('word/document.xml')
    # Read all other files to copy them verbatim
    other_files = {name: z.read(name) for name in z.namelist() if name != 'word/document.xml'}

root_orig = ET.fromstring(base_xml)
namespaces = {'w': W_NS, 'r': R_NS, 'a': A_NS}
body_orig = root_orig.find('w:body', namespaces)

# Extract Table 0 (Somaiya Logo Header on Title Page) and Table 1 (Somaiya Logo Header on Certificate Page)
tables_orig = body_orig.findall('w:tbl', namespaces)
tbl0_orig = tables_orig[0] # Somaiya header Title Page
tbl1_orig = tables_orig[1] # Somaiya header Certificate Page
sectPr_orig = body_orig.find('w:sectPr', namespaces)

# Create brand new document body
new_body = ET.Element(qn('body'))

# ==============================================================================
# 1. TITLE PAGE
# ==============================================================================
new_body.append(tbl0_orig)
new_body.append(make_para("", space_after_pt=12))
new_body.append(make_para("DEPARTMENT OF INFORMATION TECHNOLOGY", align="center", bold=True, size_pt=14, color="0F4761", space_after_pt=14))
new_body.append(make_para("Report On", align="center", size_pt=12, italic=True, space_after_pt=10))

# Project Title
title_runs = [
    make_run("SmartShield: Dynamic EVM Validation, Symbolic Constraint Solving, and Simulation Engine for Smart Contract Security", bold=True, size_pt=16, color="0F4761")
]
new_body.append(make_para(align="center", space_before_pt=6, space_after_pt=20, runs=title_runs))

new_body.append(make_para("Prepared By:", align="center", bold=True, size_pt=12, space_before_pt=12, space_after_pt=6))
new_body.append(make_para("Amey Patil (Roll No. B-XX)", align="center", bold=True, size_pt=12, space_after_pt=3))
new_body.append(make_para("[Team Member 2] (Roll No. B-XX)", align="center", size_pt=11.5, space_after_pt=3))
new_body.append(make_para("[Team Member 3] (Roll No. B-XX)", align="center", size_pt=11.5, space_after_pt=16))

new_body.append(make_para("Under the Guidance of:", align="center", bold=True, size_pt=12, space_before_pt=8, space_after_pt=4))
new_body.append(make_para("Dr. Vijaya Umesh Pinjarkar", align="center", bold=True, size_pt=12.5, color="0F4761", space_after_pt=2))
new_body.append(make_para("Professor, Department of Information Technology", align="center", size_pt=11.5, space_after_pt=24))

new_body.append(make_para("Department of Information Technology", align="center", bold=True, size_pt=12, space_after_pt=3))
new_body.append(make_para("Academic Year: 2026-2027", align="center", bold=True, size_pt=12, space_after_pt=3))
new_body.append(make_para("Autonomy Syllabus Scheme-II - SEMESTER VII (LY-IT)", align="center", size_pt=11, space_after_pt=12))

new_body.append(make_page_break())

# ==============================================================================
# 2. CERTIFICATE PAGE
# ==============================================================================
new_body.append(tbl1_orig)
new_body.append(make_para("", space_after_pt=6))
new_body.append(make_para("CERTIFICATE", align="center", bold=True, size_pt=15, color="0F4761", space_before_pt=6, space_after_pt=10))
new_body.append(make_para("This is to certify that the following students:", align="left", size_pt=11.5, space_after_pt=8))

# Certificate students table
cert_headers = ["Student Name", "Roll No. / Seat No."]
cert_data = [
    ["Amey Patil", "B-XX"],
    ["[Team Member 2]", "B-XX"],
    ["[Team Member 3]", "B-XX"]
]
cert_tbl = make_table(cert_headers, cert_data, [6800, 2560], ["left", "center"], font_size=11)
new_body.append(cert_tbl)
new_body.append(make_para("", space_after_pt=8))

cert_text = (
    "have submitted the Blockchain Mini-Project Report entitled “SmartShield: Dynamic EVM Validation, "
    "Symbolic Constraint Solving, and Simulation Engine for Smart Contract Security” as partial fulfillment "
    "of the requirements of the Bachelor of Technology in Information Technology during the academic year 2026-2027, "
    "under the guidance of Dr. Vijaya Umesh Pinjarkar. The work described in this report is based on the project "
    "implementation and its documented test fixtures, execution traces, and verified outputs."
)
new_body.append(make_para(cert_text, align="both", size_pt=11.5, space_after_pt=20))

# Signatures: Guide & HOD
guide_hod_headers = ["____________________________", "____________________________"]
guide_hod_data = [
    [
        "Dr. Vijaya Pinjarkar\nProject Guide\nProfessor, Dept. of Information Technology",
        "Dr. Radhika Kotecha\nHead of Department\nDept. of Information Technology"
    ]
]
tbl_signatures1 = make_table(guide_hod_headers, guide_hod_data, [4680, 4680], ["center", "center"], font_size=11)
new_body.append(tbl_signatures1)
new_body.append(make_para("", space_after_pt=16))

new_body.append(make_para("Date of Examination: ____________________", align="left", size_pt=11.5, space_after_pt=14))

# Examiners signatures
examiners_headers = ["Signature of Internal Examiner:\n________________________", "Signature of External Examiner:\n________________________"]
tbl_examiners = make_table(examiners_headers, [], [4680, 4680], ["center", "center"], font_size=11)
new_body.append(tbl_examiners)

new_body.append(make_page_break())

# ==============================================================================
# 3. TABLE OF CONTENTS
# ==============================================================================
new_body.append(make_heading("Table of Contents", level=1))

toc_headers = ["Content", "Page No."]
toc_data = [
    ["Acknowledgement", "1"],
    ["Abstract", "2"],
    ["1. Introduction", "3"],
    ["    1.1 Motivation", "3"],
    ["    1.2 Aim and Objective", "4"],
    ["    1.3 Scope", "5"],
    ["2. Literature Review", "6"],
    ["    2.1 Gap Identification", "7"],
    ["3. Proposed System", "8"],
    ["    3.1 Architecture", "8"],
    ["    3.2 Components Discussion", "10"],
    ["    3.3 Workflow", "13"],
    ["4. Implementation Details", "14"],
    ["    4.1 Tech stack", "14"],
    ["    4.2 Data and Analysis Description", "15"],
    ["        4.2.1 Core Data Models", "15"],
    ["        4.2.2 REST API Endpoints Specification", "16"],
    ["    4.3 Visual Interface & System Representation", "17"],
    ["5. Results and Discussion", "20"],
    ["    5.1 Benchmark Test Contracts & Observations", "20"],
    ["    5.2 Qualitative Comparison with Existing Systems", "22"],
    ["    5.3 Vulnerability Analysis and Validation Boundaries", "23"],
    ["6. Observations", "25"],
    ["7. Conclusion", "26"],
    ["8. Future Work", "27"],
    ["9. References", "28"]
]
toc_tbl = make_table(toc_headers, toc_data, [7360, 2000], ["left", "center"], font_size=10.5)
new_body.append(toc_tbl)

new_body.append(make_page_break())

# ==============================================================================
# 4. ACKNOWLEDGEMENT
# ==============================================================================
new_body.append(make_heading("Acknowledgement", level=1))

p_ack1 = (
    "Before presenting our mini-project entitled “SmartShield: Dynamic EVM Validation, Symbolic Constraint Solving, "
    "and Simulation Engine for Smart Contract Security”, we would like to express our sincere gratitude to everyone "
    "who supported us during the conceptualization, system architecture design, implementation, and rigorous testing of this work."
)
new_body.append(make_para(p_ack1, align="both", size_pt=11.5, space_after_pt=8))

p_ack2 = (
    "We are profoundly grateful to our project guide, Dr. Vijaya Pinjarkar, for her invaluable guidance, rigorous technical feedback, "
    "and encouragement throughout the development of the dynamic execution and formal verification pipeline. Her insights helped us "
    "formalize low-level EVM opcode interception mechanisms, integrate SMT-based constraint reasoning, and ensure that validation results "
    "are grounded strictly in deterministic execution semantics rather than speculative heuristics."
)
new_body.append(make_para(p_ack2, align="both", size_pt=11.5, space_after_pt=8))

p_ack3 = (
    "We also extend our deepest thanks to the Principal, Dr. Vivek Sunnapwar, the Head of the Department, Dr. Radhika Kotecha, "
    "and the esteemed faculty members of the Department of Information Technology, K J Somaiya Institute of Technology, for providing "
    "the academic resources, computing environment, and administrative facilities required to bring this project to fruition."
)
new_body.append(make_para(p_ack3, align="both", size_pt=11.5, space_after_pt=8))

p_ack4 = (
    "Furthermore, we acknowledge the foundational academic literature, particularly the authors of the DelegateTracker research paper [1], "
    "whose pioneering work on delegatecall read-write data-flow capture laid the theoretical groundwork for candidate attack-path exploration. "
    "We also acknowledge the open-source engineering efforts behind the EthereumJS virtual machine team, the Microsoft Research Z3 theorem "
    "prover team, and the Google Gemini developer platform, which powered our isolated execution sandbox, SMT constraint reasoning, "
    "and evidence-grounded threat synthesis."
)
new_body.append(make_para(p_ack4, align="both", size_pt=11.5, space_after_pt=8))

p_ack5 = (
    "Finally, we thank our classmates, colleagues, and families for their constant patience and support throughout the academic year."
)
new_body.append(make_para(p_ack5, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_page_break())

# ==============================================================================
# 5. ABSTRACT
# ==============================================================================
new_body.append(make_heading("Abstract", level=1))

p_abs1 = (
    "Ethereum smart contracts rely on the delegatecall instruction to enable modular library architectures and upgradeable "
    "proxy patterns. Under delegatecall semantics, target code executes within the caller's execution environment, modifying the "
    "calling contract's persistent storage. While this design facilitates contract upgradability and code reuse, unvalidated delegatecalls "
    "and unaligned storage layouts frequently introduce catastrophic vulnerabilities—allowing external attackers to hijack privileged state "
    "variables (such as contract ownership or administrative access) and trigger sensitive sinks, including unauthorized fund withdrawals "
    "and selfdestruct operations. Existing static analysis approaches detect syntactic delegatecall invocations or compute data-flow "
    "candidate paths, but they suffer from high false-positive rates because static approximations cannot confirm runtime constraint "
    "satisfiability, execution reachability, or concrete bytecode feasibility."
)
new_body.append(make_para(p_abs1, align="both", size_pt=11.5, space_after_pt=8))

p_abs2 = (
    "This project presents the SmartShield Dynamic Validation, Symbolic Constraint Solving, and Simulation Engine—an automated, "
    "isolated verification platform designed to ingest candidate delegatecall attack paths and definitively validate their runtime "
    "exploitability. The system operates on a core scientific principle: vulnerability cannot be established from the mere presence of "
    "delegatecall, but must be proven through runtime read/write opcode capture, storage slot alignment verification, and formal SMT "
    "satisfiability evidence. The engine compiles Solidity contracts in memory using an embedded solc compiler, deploys them to an "
    "isolated EthereumJS Virtual Machine (@ethereumjs/vm), and intercepts step-level EVM opcodes—specifically capturing SSTORE (writes), "
    "SLOAD (reads), DELEGATECALL transitions, CALL value transfers, and SELFDESTRUCT invocations."
)
new_body.append(make_para(p_abs2, align="both", size_pt=11.5, space_after_pt=8))

p_abs3 = (
    "A formal constraint checker powered by the Microsoft Z3 SMT solver formulates 160-bit BitVector equations to determine whether "
    "access-control guard conditions are satisfiable (SAT) post-mutation. Candidate paths are evaluated across six deterministic criteria: "
    "path executability, storage write detection, subsequent storage read detection, storage slot/offset alignment, SMT constraint satisfiability, "
    "and sensitive sink reachability. Candidates satisfying all six criteria are marked CONFIRMED, while guarded paths revert and yield "
    "a proven REJECTED verdict. A controlled sandbox simulation engine safely replays confirmed exploits, demonstrating exact Before vs. After "
    "state transitions, balance transfers, and contract ownership hijacking without interacting with live networks or real assets. "
    "Finally, an evidence-grounded AI synthesis module powered by Google Gemini 3.8 / Flash produces auditor-grade root cause explanations "
    "strictly bounded by execution traces. Evaluated across a comprehensive benchmark suite (including single-path proxies, multi-path vaults, "
    "and mixed-security contracts), the system achieved 100% precision with zero false positives, proving that dynamic execution and formal "
    "solving form an indispensable verification layer for decentralized application security."
)
new_body.append(make_para(p_abs3, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_page_break())

# ==============================================================================
# CHAPTER 1: INTRODUCTION
# ==============================================================================
new_body.append(make_heading("1. Introduction", level=1))

p_intro1 = (
    "Decentralized applications built on the Ethereum blockchain rely on smart contracts to execute financial logic, manage digital "
    "assets, and enforce autonomous governance. Once deployed, smart contract bytecode is immutable, making logic errors and security "
    "vulnerabilities permanently exploitable unless explicit upgrade mechanisms are engineered into the architecture. To achieve modularity "
    "and upgradability, the Ethereum Virtual Machine (EVM) provides the delegatecall opcode. Unlike a standard message call (CALL), which "
    "executes code in the context of the callee contract and updates the callee's storage, delegatecall executes code fetched from an "
    "external target while retaining the caller's identity (msg.sender), funds context (msg.value), and persistent storage space [1], [6]."
)
new_body.append(make_para(p_intro1, align="both", size_pt=11.5, space_after_pt=8))

p_intro2 = (
    "While delegatecall provides the technical foundation for modern proxy patterns (such as OpenZeppelin ERC-1967 and UUPS proxies), "
    "it breaks conventional contract encapsulation boundaries. A delegated library function modifies the storage slots of the calling "
    "proxy. If the storage layouts of the proxy and implementation contracts do not align identically, or if an untrusted user can direct "
    "a delegatecall to an unguarded initialization function, an attacker can overwrite critical state variables—such as the contract's "
    "owner, admin address, or pause state. A subsequent call to an administrative function can then pass authorization checks and "
    "trigger catastrophic operations, including sweeping user deposits or invoking selfdestruct [1], [7]."
)
new_body.append(make_para(p_intro2, align="both", size_pt=11.5, space_after_pt=8))

p_intro3 = (
    "Static analysis tools (such as Slither or static AST scanners) analyze source code or control-flow graphs to flag potential delegatecall "
    "risks and generate candidate attack paths. However, static analysis alone cannot prove runtime exploitability. Static analyzers frequently "
    "report unvalidated hypotheses that turn out to be unfeasible in practice due to reverts, complex cryptographic checks, modifier guards, "
    "or unreachable execution branches. Relying solely on static warnings creates severe alert fatigue for auditors and developers."
)
new_body.append(make_para(p_intro3, align="both", size_pt=11.5, space_after_pt=8))

p_intro4 = (
    "The SmartShield Dynamic Validation, Symbolic Constraint Solving, and Simulation Engine is developed specifically to solve this challenge. "
    "It forms the dynamic verification, formal constraint reasoning, exploit simulation, and presentation layer of the SmartShield pipeline. "
    "Rather than treating delegatecall as inherently dangerous, this engine subjects candidate attack hypotheses to concrete execution inside "
    "an isolated EVM sandbox, hooks low-level opcodes, proves condition satisfiability with Microsoft Z3, and safely demonstrates verified exploits."
)
new_body.append(make_para(p_intro4, align="both", size_pt=11.5, space_after_pt=12))

# 1.1 Motivation
new_body.append(make_heading("1.1 Motivation", level=2))

p_mot1 = (
    "The motivation behind this project arises from the critical gap between static vulnerability detection and actionable security verification. "
    "In smart contract auditing, declaring that a contract contains a 'delegatecall risk' is insufficient. Developers and security reviewers "
    "require definitive answers to four fundamental questions:"
)
new_body.append(make_para(p_mot1, align="both", size_pt=11.5, space_after_pt=6))

new_body.append(make_bullet(" Can the proposed sequence of transactions actually execute sequentially without triggering a revert?", "1. Path Executability:"))
new_body.append(make_bullet(" Does the writer function alter the exact storage slot and byte offset predicted by the vulnerability model?", "2. Storage Layout Mutation:"))
new_body.append(make_bullet(" Are the access-control guard conditions (e.g., require(msg.sender == owner)) mathematically satisfiable post-mutation under attacker-controlled inputs?", "3. Constraint Satisfiability:"))
new_body.append(make_bullet(" Does the state mutation directly enable an unauthorized caller to reach a high-severity sensitive sink, such as an Ether transfer or contract destruction?", "4. Sensitive Sink Reachability:"))

p_mot2 = (
    "Furthermore, contemporary auditing workflows suffer from two major operational limitations. First, when vulnerabilities are detected, "
    "demonstrating their financial impact typically requires writing bespoke, manual exploit scripts—a time-consuming and error-prone process. "
    "Second, the emergence of generic Large Language Models (LLMs) in code review has introduced widespread hallucinations, where AI models "
    "speculate on vulnerabilities without any ground-truth execution proof. SmartShield addresses these challenges by integrating an automated "
    "exploit replay simulator that generates concrete before/after state diffs, paired with an AI explanation layer strictly bounded by "
    "formal EVM opcode evidence."
)
new_body.append(make_para(p_mot2, align="both", size_pt=11.5, space_after_pt=12))

# 1.2 Aim and Objective
new_body.append(make_heading("1.2 Aim and Objective", level=2))

new_body.append(make_heading("Aim", level=3))
p_aim = (
    "To design and implement an automated dynamic execution validation, SMT constraint solving, and exploit simulation engine "
    "that consumes candidate delegatecall attack paths, collects runtime opcode traces in an isolated EVM environment, mathematically "
    "evaluates path satisfiability, and safely demonstrates verified state-hijacking exploits in a controlled sandbox."
)
new_body.append(make_para(p_aim, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_heading("Objectives", level=3))
new_body.append(make_bullet("To ingest, normalize, and validate candidate attack path payloads from upstream static analyzers across a versioned REST API boundary.", "1. Candidate Ingestion: "))
new_body.append(make_bullet("To compile Solidity source code dynamically in memory using embedded WebAssembly solc (v0.8.37) and generate deployable bytecode and ABIs.", "2. In-Memory Compilation: "))
new_body.append(make_bullet("To execute transaction sequences within an isolated, deterministic EVM sandbox (@ethereumjs/vm) without connecting to public testnets or mainnet.", "3. Isolated EVM Sandbox: "))
new_body.append(make_bullet("To hook step-level EVM execution and intercept low-level opcodes (SSTORE, SLOAD, DELEGATECALL, CALL, SELFDESTRUCT) to record program counters, stack operands, and storage slot addresses.", "4. Opcode Interception: "))
new_body.append(make_bullet("To verify storage slot and byte offset alignment by comparing runtime storage events with static layout predictions.", "5. Storage Alignment Verification: "))
new_body.append(make_bullet("To integrate the Microsoft Z3 SMT solver to model 160-bit address constraints and formally determine whether guard conditions are SAT, UNSAT, or UNKNOWN.", "6. SMT Constraint Solving: "))
new_body.append(make_bullet("To enforce a six-criteria vulnerability confirmation engine that outputs unambiguous CONFIRMED, REJECTED, or INCONCLUSIVE verdicts.", "7. Six-Criteria Confirmation Engine: "))
new_body.append(make_bullet("To simulate confirmed exploits in a safe local test harness, producing concrete Before vs. After account balances and ownership diffs.", "8. Controlled Exploit Replay: "))
new_body.append(make_bullet("To build an interactive React dashboard with clickable attack graphs, state diff visualizers, and grounded Google Gemini AI threat synthesis.", "9. Visual Interface & Grounded AI: "))

# 1.3 Scope
new_body.append(make_heading("1.3 Scope", level=2))

p_scope = (
    "The scope of this project is focused on the dynamic validation, formal constraint evaluation, sandbox simulation, and presentation "
    "phases of smart contract security analysis. Table 1.1 delineates the technical boundaries between the capabilities implemented "
    "in the current system and out-of-scope capabilities reserved for future extensions."
)
new_body.append(make_para(p_scope, align="both", size_pt=11.5, space_after_pt=8))

scope_headers = ["Included in Current Implementation Scope", "Outside / Excluded from Scope"]
scope_data = [
    [
        "Ingestion and normalization of CandidateAttackPath schemas via REST endpoints and JSON uploads.",
        "Static AST extraction, call-graph construction, and heuristic search for candidate paths (handled upstream)."
    ],
    [
        "In-memory Solidity compilation using solc-js Wasm compiler with full diagnostics and error tracking.",
        "Compilation of legacy, non-EVM, or deeply custom proprietary smart contract languages."
    ],
    [
        "Isolated EVM execution using @ethereumjs/vm with state isolation and balance provisioning.",
        "Executing exploits or sending transactions to live Ethereum mainnet, testnets, or user wallets."
    ],
    [
        "Low-level opcode interception hooking SSTORE, SLOAD, DELEGATECALL, CALL, and SELFDESTRUCT.",
        "Building an EVM or bytecode interpreter from scratch (leverages established EthereumJS foundation)."
    ],
    [
        "Storage slot and byte offset comparison for direct state variables and simple struct/address layouts.",
        "Unbounded dynamic arrays, deeply nested dynamic mapping trees, and custom assembly storage slots."
    ],
    [
        "Formal access-control condition verification using Microsoft Z3 SMT solver (160-bit BitVectors).",
        "Universal formal verification of complex mathematical theorems, arbitrary loops, or zk-SNARK circuits."
    ],
    [
        "The three primary DelegateTracker anomaly categories: SELF_DESTRUCT, ETHER_TRANSFER, and JUDGMENT_CONDITION.",
        "Unrelated smart contract vulnerability families such as flash-loan oracle manipulation, front-running, or reentrancy."
    ],
    [
        "Safe local exploit simulation displaying pre- and post-exploit balances, slot modifications, and owner state.",
        "Automated generation of live transaction payloads designed for mainnet exploitation."
    ],
    [
        "Interactive React 19 UI with clickable attack graph, state diff cards, and evidence-grounded Gemini AI reports.",
        "Allowing an unconstrained LLM to independently declare security verdicts without execution evidence."
    ]
]
tbl_scope = make_table(scope_headers, scope_data, [4680, 4680], ["left", "left"], font_size=10)
new_body.append(tbl_scope)

new_body.append(make_page_break())

# ==============================================================================
# CHAPTER 2: LITERATURE REVIEW
# ==============================================================================
new_body.append(make_heading("2. Literature Review", level=1))

p_lit1 = (
    "Smart contract security has been an active area of software engineering research since early high-profile exploits, notably the "
    "2016 DAO reentrancy attack and the 2017 Parity MultiSig wallet freezes. In the second Parity wallet vulnerability, an uninitialized "
    "library contract referenced via delegatecall was initialized by an attacker who set themselves as owner and subsequently invoked "
    "selfdestruct, permanently freezing 513,774 Ether across hundreds of multi-signature wallets [1], [7]. This historic incident underscored "
    "the unique hazards associated with delegatecall context sharing and storage alignment."
)
new_body.append(make_para(p_lit1, align="both", size_pt=11.5, space_after_pt=8))

p_lit2 = (
    "The primary theoretical foundation for our work is the research paper by Cao et al. (2026), entitled “DelegateTracker: Delegatecall "
    "vulnerability detection tool based on read-write data flow capture algorithm” [1]. DelegateTracker observes that looking for delegatecall "
    "opcodes alone yields an unmanageable false-positive rate, because benign proxy patterns use delegatecall legitimately. Instead, the authors "
    "frame the detection problem as tracking state-variable data flow: identifying when a delegated function modifies caller-visible storage, "
    "and whether that modified state variable is subsequently consumed by a sensitive sink (such as an Ether transfer, selfdestruct, or access "
    "control check). DelegateTracker formalizes three canonical anomaly patterns: Currency-Sending Anomaly, Self-Destruct Anomaly, and "
    "Judgment-Condition Disorder. However, DelegateTracker's core pipeline relies predominantly on static data-flow capture, leaving dynamic "
    "verification and sandbox simulation as external challenges."
)
new_body.append(make_para(p_lit2, align="both", size_pt=11.5, space_after_pt=8))

p_lit3 = (
    "Beyond DelegateTracker, several prominent analysis frameworks have been proposed in academia and industry: "
    "Mossberg et al. (Trail of Bits) introduced Manticore [3], a symbolic execution framework for EVM bytecode and binaries. Manticore "
    "supports symbolic transaction exploration and constraint solving, but full symbolic state exploration suffers from severe path explosion "
    "when applied to complex contracts. "
    "Mueller (ConsenSys Diligence) developed Mythril [4], which utilizes symbolic execution, taint analysis, and SMT solving. While effective, "
    "Mythril frequently times out on multi-contract proxy architectures and lacks specialized modeling for cross-contract delegatecall storage collisions. "
    "Luu et al. pioneered automated formal analysis of Ethereum with Oyente [5], highlighting transaction-ordering and call-stack risks, but Oyente's "
    "symbolic engine predated modern proxy patterns. "
    "Feist et al. created Slither [2], a fast static analysis framework built on intermediate representation (SlithIR). Slither detects data dependencies "
    "rapidly but cannot evaluate runtime satisfiability or execute contracts. "
    "Finally, Microsoft's Z3 theorem prover by de Moura and Bjørner [8] has become the gold standard SMT solver for software verification, "
    "offering highly optimized BitVector arithmetic ideal for modeling 160-bit Ethereum addresses and 256-bit word constraints."
)
new_body.append(make_para(p_lit3, align="both", size_pt=11.5, space_after_pt=10))

lit_headers = ["Tool / Research", "Primary Analysis Paradigm", "Core Strength", "Limitation Addressed by Proposed System"]
lit_data = [
    [
        "DelegateTracker (Cao et al., 2026) [1]",
        "Static Read-Write Data Flow Capture",
        "Formulates the 3 delegatecall anomaly patterns connecting writes to sensitive sinks.",
        "Primarily static hypothesis generator; does not execute bytecode or simulate exploit state diffs."
    ],
    [
        "Slither (Feist et al., 2019) [2]",
        "Static AST & SlithIR Data Flow",
        "Extremely fast; robust taint analysis and broad vulnerability detector suite.",
        "Static approximations only; produces false alarms when guard conditions cannot be satisfied."
    ],
    [
        "Manticore (Mossberg et al., 2019) [3]",
        "Full EVM Symbolic Execution",
        "Explores unconstrained state spaces and generates concrete exploit test inputs.",
        "Suffers from severe path explosion; slow on complex multi-contract delegatecall workflows."
    ],
    [
        "Mythril (ConsenSys, 2018) [4]",
        "Symbolic Execution & Taint Analysis",
        "Bytecode-level reachability analysis and SMT solving using Z3.",
        "Prone to timeouts on upgradeable proxies; lacks targeted candidate-path validation."
    ],
    [
        "Oyente (Luu et al., 2016) [5]",
        "Pioneer EVM Symbolic Execution",
        "Established formal CFG analysis and constraint solving on Ethereum.",
        "Architecturally outdated; no support for delegatecall storage collision analysis."
    ],
    [
        "Microsoft Z3 Solver (de Moura et al.) [8]",
        "Satisfiability Modulo Theories (SMT)",
        "Industrial-strength theorem prover; native BitVector and integer arithmetic.",
        "General-purpose solver; requires specialized domain modeling to represent EVM storage rules."
    ],
    [
        "Proposed System: SmartShield Dynamic Engine",
        "Targeted EVM Dynamic Validation + SMT Solving + Exploit Simulation",
        "Hooks low-level opcodes, proves guard satisfiability with Z3, confirms across 6 criteria, and safely replays exploit diffs.",
        "Focuses strictly on targeted candidate paths to eliminate path explosion while maintaining 100% precision."
    ]
]
tbl_lit = make_table(lit_headers, lit_data, [1800, 2400, 2560, 2600], ["left", "left", "left", "left"], font_size=9.5)
new_body.append(tbl_lit)
new_body.append(make_para("", space_after_pt=10))

# 2.1 Gap Identification
new_body.append(make_heading("2.1 Gap Identification", level=2))

p_gap = (
    "Based on the literature survey, four distinct technological and architectural gaps were identified:"
)
new_body.append(make_para(p_gap, align="both", size_pt=11.5, space_after_pt=6))

new_body.append(make_bullet(
    "Existing static tools report candidates based on syntax or AST data-flow paths without validating whether modifier conditions "
    "or require statements actually permit transaction completion. This produces excessive false positives, as harmless or guarded delegatecalls "
    "are flagged as critical vulnerabilities.",
    "Gap 1: Disconnect Between Static Candidate Hypotheses and Concrete Runtime Feasibility. "
))
new_body.append(make_bullet(
    "Standard bytecode scanners examine opcodes in isolation, failing to track the cross-contract execution context where a library function "
    "invoked via delegatecall mutates storage slots in the caller proxy. There is a lack of lightweight tooling that intercepts SSTORE and SLOAD "
    "opcodes dynamically to verify slot collisions against compiler storage layouts.",
    "Gap 2: Inability to Trace Cross-Contract Storage Slot Collisions Dynamically. "
))
new_body.append(make_bullet(
    "Full symbolic execution engines (like Manticore) attempt to explore all execution paths from the contract entry point, resulting in combinatorial "
    "state explosion. Conversely, existing linters do not solve path constraints at all. A targeted constraint evaluation mechanism that checks "
    "only the specific conditions required by a candidate attack path has been missing.",
    "Gap 3: The Path Explosion Dilemma in Unconstrained Symbolic Execution. "
))
new_body.append(make_bullet(
    "Auditors must currently manually verify findings by deploying testnets or writing Hardhat scripts. Furthermore, emerging generative AI "
    "auditing tools suffer from ungrounded hallucinations, declaring code vulnerable without empirical proof. A platform that provides "
    "safe, automated exploit simulation paired with evidence-bounded AI explanations represents an unfulfilled industry need.",
    "Gap 4: Absence of Automated Exploit Simulation and Grounded AI Remediation. "
))

new_body.append(make_page_break())

# ==============================================================================
# CHAPTER 3: PROPOSED SYSTEM
# ==============================================================================
new_body.append(make_heading("3. Proposed System", level=1))

p_prop1 = (
    "To address these identified gaps, we propose and implement the SmartShield Dynamic Validation, Symbolic Constraint Solving, "
    "and Simulation Engine. Operating as an autonomous, modular verification service, the proposed system ingests CandidateAttackPath "
    "specifications, subjects them to isolated EVM execution and SMT constraint reasoning, confirms or rejects the hypothesis across "
    "six rigorous criteria, safely simulates the exploit state transition, and presents actionable intelligence through an interactive "
    "dashboard and auditor-grade reports."
)
new_body.append(make_para(p_prop1, align="both", size_pt=11.5, space_after_pt=8))

# 3.1 Architecture
new_body.append(make_heading("3.1 Architecture", level=2))

p_arch_desc = (
    "The architecture of the proposed system is organized into six interconnected subsystems, forming an end-to-end verification "
    "and demonstration pipeline. Table 3.1 outlines the layers, core elements, and architectural responsibilities."
)
new_body.append(make_para(p_arch_desc, align="both", size_pt=11.5, space_after_pt=8))

arch_headers = ["Layer / Subsystem", "Core Technical Elements", "Architectural Responsibility"]
arch_data = [
    [
        "1. Candidate Ingestion & Compilation Layer",
        "CandidateValidator, SolcCompiler (solc 0.8.37 Wasm), REST API (/api/validate, /api/ingest-from-group1)",
        "Ingests CandidateAttackPath JSON; validates schema; performs in-memory Solidity compilation to produce bytecode, ABIs, and AST diagnostics."
    ],
    [
        "2. Isolated EVM Execution & Opcode Runner",
        "EVMRunner, @ethereumjs/vm, @ethereumjs/statemanager, Address/Account manager",
        "Initializes a clean, isolated virtual machine; sets up test accounts (Alice, Attacker, Recipient); deploys contracts; hooks step-level EVM opcodes."
    ],
    [
        "3. Opcode Interception & Storage Tracker",
        "Opcode Step Listener, SlotComparator, SLOAD / SSTORE / CALL / DELEGATECALL hooks",
        "Intercepts runtime storage writes (SSTORE) and reads (SLOAD); records slot hex addresses, values, and PCs; verifies slot/offset alignment."
    ],
    [
        "4. SMT Constraint Solving Engine",
        "Z3Solver, Microsoft Z3 SMT WebAssembly (z3-solver 5.2.0), BitVector Logic",
        "Formulates 160-bit BitVector access-control equations; determines SAT, UNSAT, or UNKNOWN satisfiability for path guard conditions."
    ],
    [
        "5. Vulnerability Confirmation Engine",
        "6-Criteria Verification Evaluator, Verdict Classifier",
        "Evaluates the candidate across all six criteria; emits deterministic CONFIRMED, REJECTED, or INCONCLUSIVE verdicts with full evidence."
    ],
    [
        "6. Controlled Exploit Simulator",
        "ExploitReplayer, Sandbox State Diff Engine",
        "Safely executes exploit sequences in a controlled sandbox; captures Before vs. After balances and owner state; demonstrates financial impact."
    ],
    [
        "7. Presentation & Grounded AI Layer",
        "React 19 Dashboard, AttackGraph.tsx, StateDiffView.tsx, Google Gemini 3.8 / Flash, ReportGenerator",
        "Visualizes attack graph with clickable opcode traces; presents before/after state diff cards; synthesizes evidence-bound AI root cause reports."
    ]
]
tbl_arch = make_table(arch_headers, arch_data, [2400, 3160, 3800], ["left", "left", "left"], font_size=10)
new_body.append(tbl_arch)
new_body.append(make_para("", space_after_pt=10))

# 3.2 Components Discussion
new_body.append(make_heading("3.2 Components Discussion", level=2))

p_comp_intro = (
    "A detailed engineering discussion of the primary components is provided below:"
)
new_body.append(make_para(p_comp_intro, align="both", size_pt=11.5, space_after_pt=6))

new_body.append(make_para("A. SolcCompiler (In-Memory Compilation Engine)", bold=True, size_pt=12, color="0F4761", space_before_pt=6, space_after_pt=3))
p_comp_a = (
    "The SolcCompiler wraps the official solc WebAssembly package (v0.8.37). It accepts raw Solidity source strings or multi-file source "
    "mappings and compiles them directly in Node.js memory. It configures standard JSON input/output settings, enabling compiler optimizer "
    "runs and extracting ABI definitions, runtime bytecode, and assembly storage layouts. If syntax errors or version mismatches occur, "
    "SolcCompiler returns structured diagnostic messages, preventing the execution engine from operating on invalid bytecode."
)
new_body.append(make_para(p_comp_a, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_para("B. EVMRunner (Isolated Dynamic Execution Engine)", bold=True, size_pt=12, color="0F4761", space_before_pt=6, space_after_pt=3))
p_comp_b = (
    "The EVMRunner instantiates an isolated Ethereum Virtual Machine using @ethereumjs/vm and @ethereumjs/statemanager. "
    "It implements deterministic sandbox execution by pre-funding three distinct test actors: Alice (contract deployer and benign owner, "
    "0x1000...0001 with 100 ETH), Attacker (external untrusted caller, 0x2000...0002 with 10 ETH), and Recipient (unauthorized beneficiary, "
    "0x3000...0003 with 0 ETH). "
    "Crucially, EVMRunner registers an event hook on vm.evm.events.on('step'). During transaction processing, this hook inspects each instruction: "
    "when SSTORE is executed, it pops the storage key and value from the EVM stack; when SLOAD is executed, it records the requested slot; "
    "when CALL or DELEGATECALL occurs, it logs gas, call depth, target address, and transfer value; and when SELFDESTRUCT is encountered, "
    "it captures the beneficiary address."
)
new_body.append(make_para(p_comp_b, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_para("C. SlotComparator (Storage Alignment & Collision Engine)", bold=True, size_pt=12, color="0F4761", space_before_pt=6, space_after_pt=3))
p_comp_c = (
    "The SlotComparator is responsible for reconciling static predictions with dynamic storage modifications. In Solidity, state variables "
    "are assigned contiguous 32-byte storage slots starting from slot 0. When an external library is called via delegatecall, modifications "
    "occur in the caller's storage slots based on the library's local variable declarations. SlotComparator normalizes slot identifiers into "
    "canonical lowercase hexadecimal strings (e.g., '0' to '0x0', '1' to '0x1') and compares the candidate's expected storage slot against "
    "the observed SSTORE and SLOAD events. It outputs explicit MATCHED or MISMATCHED verdicts, proving whether an unaligned storage collision occurred."
)
new_body.append(make_para(p_comp_c, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_para("D. Z3Solver (SMT Constraint Validation Engine)", bold=True, size_pt=12, color="0F4761", space_before_pt=6, space_after_pt=3))
p_comp_d = (
    "The Z3Solver integrates Microsoft Z3 SMT solver compiled to WebAssembly (z3-solver). Rather than conducting unconstrained state space "
    "exploration, Z3Solver formulates targeted symbolic constraints for the access-control guard conditions protecting sensitive functions. "
    "For example, when a sensitive transfer requires require(msg.sender == owner), the solver models caller and owner as 160-bit BitVectors "
    "(ctx.BitVec.const('caller', 160)). It asserts caller == attacker_address and owner == runtime_owner_written. "
    "If the attacker's prior delegatecall successfully overwritten the owner storage slot, solver.check() returns SAT, mathematically proving "
    "that the guard condition is satisfiable. If the guard checks an immutable state or requires a condition that was not mutated, the solver "
    "returns UNSAT, proving that the path cannot be exploited."
)
new_body.append(make_para(p_comp_d, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_para("E. CandidateValidator (Path Execution & Confirmation Engine)", bold=True, size_pt=12, color="0F4761", space_before_pt=6, space_after_pt=3))
p_comp_e = (
    "The CandidateValidator coordinates end-to-end path validation. It deploys the implementation and proxy contracts in the EVM sandbox, "
    "executes the candidate's writer function using attacker credentials, records storage mutations, and subsequently invokes the reader "
    "function reaching the sensitive sink. It synthesizes evidence across all components and evaluates the six confirmation criteria: "
    "(1) Path Executability, (2) Storage Write Detected, (3) Storage Read Detected, (4) Storage Slot Match, (5) SMT Constraints SAT, and "
    "(6) Sensitive Sink Reached. If all six criteria evaluate to true, the candidate is confirmed as a verified critical vulnerability."
)
new_body.append(make_para(p_comp_e, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_para("F. ExploitReplayer (Controlled Attack Simulator)", bold=True, size_pt=12, color="0F4761", space_before_pt=6, space_after_pt=3))
p_comp_f = (
    "The ExploitReplayer executes a safe local reproduction of the confirmed exploit. It records the exact BEFORE state of the contract "
    "(e.g., Owner: Alice, Proxy Balance: 10.0 ETH, Attacker Balance: 0.0 ETH), steps through the multi-transaction exploit sequence, and "
    "computes the exact AFTER state (e.g., Owner: Attacker, Proxy Balance: 0.0 ETH, Attacker Balance: 10.0 ETH). This controlled simulation "
    "provides incontrovertible proof of financial and state impact without deploying transactions to live networks."
)
new_body.append(make_para(p_comp_f, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_para("G. ExplainController & ReportGenerator (Evidence-Grounded AI Layer)", bold=True, size_pt=12, color="0F4761", space_before_pt=6, space_after_pt=3))
p_comp_g = (
    "The ExplainController connects to the Google Gemini API (gemini-3.8-flash / gemini-flash-latest) using the official @google/genai SDK. "
    "Unlike generic LLM scanners, our prompt architecture strictly binds Gemini to structured validation evidence: target contract, confirmed "
    "slots, intercepted opcodes, Z3 SMT proofs, and simulation state deltas. Gemini is instructed to explain only what the evidence proves, "
    "synthesizing root-cause explanations and ERC-1967/UUPS remediation advice with zero hallucinations."
)
new_body.append(make_para(p_comp_g, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_para("H. Interactive User Interface (React 19 Dashboard)", bold=True, size_pt=12, color="0F4761", space_before_pt=6, space_after_pt=3))
p_comp_h = (
    "The user interface is built as a single-page React 19 application styled with Tailwind CSS. It features an interactive Attack Path Graph "
    "with clickable nodes exposing program counters and stack values, a State Diff View displaying visual before/after balance cards, a 6-Criteria "
    "Validation Checklist with color-coded status badges, and a one-click Security Audit Report exporter."
)
new_body.append(make_para(p_comp_h, align="both", size_pt=11.5, space_after_pt=12))

# 3.3 Workflow
new_body.append(make_heading("3.3 Workflow", level=2))

p_wf_intro = (
    "The complete operational workflow of the proposed system is depicted in Table 3.2, tracing an analysis from initial candidate ingestion "
    "to final report export."
)
new_body.append(make_para(p_wf_intro, align="both", size_pt=11.5, space_after_pt=8))

wf_headers = ["Stage", "Workflow Step", "Execution Mechanism", "Observed Artifact / Output"]
wf_data = [
    [
        "Stage 1",
        "Candidate Ingestion",
        "REST API POST /api/validate or sync via /api/ingest-from-group1",
        "Structured CandidateAttackPath object containing target functions, expected slot, and pattern."
    ],
    [
        "Stage 2",
        "In-Memory Compilation",
        "SolcCompiler invokes embedded Wasm solc (v0.8.37)",
        "Contract bytecode, ABI fragments, compiler diagnostics, and AST definitions."
    ],
    [
        "Stage 3",
        "Sandbox Initialization",
        "EVMRunner instantiates @ethereumjs/vm and sets test balances",
        "Pre-funded test actors: Alice (100 ETH), Attacker (10 ETH), Recipient (0 ETH)."
    ],
    [
        "Stage 4",
        "Contract Deployment",
        "EVMRunner deploys Implementation and Proxy contracts",
        "Deployed contract addresses; proxy funded with initial test balance (10.0 ETH)."
    ],
    [
        "Stage 5",
        "Writer Execution & Opcode Interception",
        "Attacker calls writer function; EVM step listener hooks opcodes",
        "Intercepted SSTORE opcode; records storage slot, mutated value, PC, and gas used."
    ],
    [
        "Stage 6",
        "Storage & SMT Validation",
        "SlotComparator checks alignment; Z3Solver checks guard constraints",
        "Storage Match: TRUE; Z3 SMT Result: SAT (BitVector equations satisfied)."
    ],
    [
        "Stage 7",
        "Reader / Sink Execution",
        "Attacker invokes reader function; EVM executes sensitive transfer",
        "Sensitive sink reached: CALL value transfer of 10.0 ETH; verdict: CONFIRMED."
    ],
    [
        "Stage 8",
        "Exploit Simulation & AI Reporting",
        "ExploitReplayer computes state diff; Gemini AI synthesizes audit report",
        "Before/After state diff cards, grounded Markdown audit report, and interactive attack graph."
    ]
]
tbl_wf = make_table(wf_headers, wf_data, [1400, 2400, 2760, 2800], ["center", "left", "left", "left"], font_size=9.5)
new_body.append(tbl_wf)

new_body.append(make_page_break())

# ==============================================================================
# CHAPTER 4: IMPLEMENTATION DETAILS
# ==============================================================================
new_body.append(make_heading("4. Implementation Details", level=1))

p_imp1 = (
    "This chapter details the technical implementation, technology stack, core data models, REST API specifications, "
    "and visual interface architecture of the SmartShield Dynamic Validation Engine."
)
new_body.append(make_para(p_imp1, align="both", size_pt=11.5, space_after_pt=8))

# 4.1 Tech Stack
new_body.append(make_heading("4.1 Tech stack", level=2))

p_tech_desc = (
    "The system is implemented as a modern TypeScript application leveraging Node.js on the backend and React 19 on the frontend. "
    "Table 4.1 provides a complete inventory of the technology stack and the operational role of each package."
)
new_body.append(make_para(p_tech_desc, align="both", size_pt=11.5, space_after_pt=8))

tech_headers = ["Technology / Package", "Version", "Role in System Architecture"]
tech_data = [
    ["Node.js", "v20.0+", "Asynchronous runtime environment supporting backend API, execution sandboxes, and tooling."],
    ["TypeScript", "^7.0.2", "Strictly-typed language providing compile-time type safety across data contracts and validation models."],
    ["@ethereumjs/vm", "^10.1.3", "Official Ethereum Virtual Machine implementation executing bytecode and dispatching step-level opcode events."],
    ["@ethereumjs/statemanager", "^10.1.3", "In-memory state database managing account balances, nonces, code storage, and EVM storage trie."],
    ["@ethereumjs/common", "^10.1.3", "Defines EVM chain configurations, hardfork rules (Cancun/Shanghai), and network specifications."],
    ["z3-solver", "^5.2.0", "Microsoft Z3 SMT solver compiled to WebAssembly, evaluating BitVector satisfiability for access controls."],
    ["solc", "^0.8.37", "Official Solidity WebAssembly compiler generating ABI definitions, EVM bytecode, and compiler diagnostics."],
    ["ethers", "^6.17.0", "Cryptographic library encoding ABI function calldata, calculating function selectors, and parsing Ether units."],
    ["express", "^5.2.1", "High-performance backend web framework exposing REST endpoints for validation, simulation, and reporting."],
    ["cors / dotenv", "^2.8.6 / ^18.0.4", "Middleware handling cross-origin requests and environment variable configuration (e.g., API keys)."],
    ["@google/genai", "^2.28.0", "Official Google Gemini SDK powering grounded AI root-cause analysis and executive report synthesis."],
    ["React", "^19.3.0", "Component-based frontend library rendering the interactive dashboard and real-time state visualizers."],
    ["Tailwind CSS", "^4.3.3", "Modern utility-first CSS styling engine rendering dark-mode security interfaces and visual cards."],
    ["Vite", "^8.3.1", "Next-generation frontend build tool providing hot-module replacement and production bundle compilation."]
]
tbl_tech = make_table(tech_headers, tech_data, [2400, 1600, 5360], ["left", "center", "left"], font_size=10)
new_body.append(tbl_tech)
new_body.append(make_para("", space_after_pt=10))

# 4.2 Data and Analysis Description
new_body.append(make_heading("4.2 Data and Analysis Description", level=2))

new_body.append(make_heading("4.2.1 Core Data Models", level=3))

p_data_desc = (
    "To ensure robust inter-service communication and deterministic result representation, the system defines versioned TypeScript "
    "interfaces in validator/types.ts. Table 4.2 details the core data structures utilized throughout the pipeline."
)
new_body.append(make_para(p_data_desc, align="both", size_pt=11.5, space_after_pt=8))

model_headers = ["Data Structure", "Source File", "Key Fields", "Functional Role"]
model_data = [
    [
        "CandidateAttackPath",
        "validator/types.ts",
        "contract, caller_contract, callee_contract, attack_path, vulnerability_variable, writer_function, reader_function, expected_storage",
        "Machine-readable candidate attack hypothesis ingested from upstream analyzers or manual submissions."
    ],
    [
        "RuntimeAccess",
        "validator/types.ts",
        "operation (READ/WRITE), slot, offset, function, contract, value, stepIndex",
        "Low-level opcode trace event capturing individual SSTORE (write) and SLOAD (read) operations during EVM execution."
    ],
    [
        "ValidationEvidence",
        "validator/types.ts",
        "writer_observed, reader_observed, sensitive_operation_details, path_trace",
        "Structured container storing the concrete storage slots, functions, and opcode parameters observed during execution."
    ],
    [
        "ValidationResult",
        "validator/types.ts",
        "status (CONFIRMED/REJECTED/INCONCLUSIVE), executable, write_detected, read_detected, storage_match, constraints, sensitive_operation_reached",
        "Final authoritative validation verdict accompanied by the six individual criteria evaluations and runtime access logs."
    ],
    [
        "SimulationStep",
        "validator/types.ts",
        "stepNumber, action, caller, targetContract, calldataSummary, storageModified, fundsTransferredEth",
        "Discrete transaction step in the controlled exploit replay documenting caller, calldata, storage mutation, and funds moved."
    ],
    [
        "SimulationResult",
        "validator/types.ts",
        "status, before_state, steps, after_state, impact (summary, fundsDrainedEth, unauthorizedNewOwner)",
        "Comprehensive before/after state diff object demonstrating financial and administrative impact in the safe sandbox."
    ]
]
tbl_model = make_table(model_headers, model_data, [2200, 1800, 2560, 2800], ["left", "left", "left", "left"], font_size=9.5)
new_body.append(tbl_model)
new_body.append(make_para("", space_after_pt=10))

new_body.append(make_heading("4.2.2 REST API Endpoints Specification", level=3))

p_api_desc = (
    "The backend server exposes a RESTful API on port 3001, providing programmatic access to all validation, simulation, "
    "and reporting capabilities. Table 4.3 documents the complete API specification."
)
new_body.append(make_para(p_api_desc, align="both", size_pt=11.5, space_after_pt=8))

api_headers = ["HTTP Method / Endpoint", "Input Payload Summary", "Output Response Summary", "Operational Role"]
api_data = [
    [
        "GET /health",
        "None",
        "{ status: 'OK', module: string, version: '1.0.0', compilerVersion: '0.8.37' }",
        "Health check endpoint returning service status and embedded compiler version."
    ],
    [
        "POST /api/validate",
        "{ contract: string, candidate_path: CandidateAttackPath, solidity_source?: string }",
        "{ status: 'CONFIRMED' | 'REJECTED', executable: bool, storage_match: bool, constraints: string, ... }",
        "Core validation endpoint executing candidate paths in the EVM sandbox and returning verdicts."
    ],
    [
        "POST /api/simulate",
        "{ contract: string, candidate_path: CandidateAttackPath, solidity_source: string, initial_balance: string }",
        "{ status: 'COMPLETED', before_state: {...}, steps: [...], after_state: {...}, impact: {...} }",
        "Controlled exploit replayer returning Before vs. After financial and ownership state differences."
    ],
    [
        "POST /api/explain",
        "{ validation_result: ValidationResult }",
        "{ explanation: string, impact: string, recommendation: string, model: string }",
        "Invokes Google Gemini 3.8 / Flash to synthesize grounded root-cause and remediation advice."
    ],
    [
        "POST /api/report",
        "{ contractName, compilerVersion, candidatePath, validationResult, simulationResult, ... }",
        "# Markdown Security Audit Report (Formal auditor-grade text export)",
        "Generates a complete, publication-ready security audit report in Markdown format."
    ],
    [
        "POST /api/ingest-from-group1",
        "{ group1Url?: string, analysisId?: string, solidity_source?: string }",
        "{ status: 'SUCCESS', candidates_count: number, results: Array<{ candidate, validation }> }",
        "Automated integration endpoint syncing candidate paths from static analysis port 3000."
    ]
]
tbl_api = make_table(api_headers, api_data, [2200, 2400, 2400, 2360], ["left", "left", "left", "left"], font_size=9.5)
new_body.append(tbl_api)
new_body.append(make_para("", space_after_pt=10))

# 4.3 Visual Interface & System Representation
new_body.append(make_heading("4.3 Visual Interface & System Representation", level=2))

p_ui_desc = (
    "The SmartShield dynamic validation dashboard is built using modern frontend paradigms to provide security researchers "
    "and developers with immediate, intuitive access to low-level execution evidence. The visual interface consists of eight "
    "primary views and inspection modules:"
)
new_body.append(make_para(p_ui_desc, align="both", size_pt=11.5, space_after_pt=8))

ui_views = [
    ("Fig. 4.3.1: Unified Dashboard & Target Selection Screen", 
     "Presents contract selection controls (VulnerableOwnerProxy, MultiPathVault, MixedSecurityVault, SafeDelegatecall), "
     "sync controls for upstream candidate ingestion, and live compiler version badges."),
    ("Fig. 4.3.2: Dynamic Candidate Ingestion & Wasm solc Compilation View",
     "Displays imported candidate attack path metadata, compilation status, extracted contract bytecodes, and ABI function signatures."),
    ("Fig. 4.3.3: Interactive Visual Attack Path Graph with Clickable Opcode Traces",
     "Renders a directed execution graph representing Attacker -> Writer -> SSTORE [slot 0] -> Reader -> SLOAD [slot 0] -> Sensitive Transfer. "
     "Clicking individual nodes opens an inspection drawer showing opcode hex, program counter, and stack parameters."),
    ("Fig. 4.3.4: 6-Criteria Evidence Verification Checklist & Status Badges",
     "Displays color-coded pass/fail badges for each of the six verification criteria: Path Executability, Write Detected, Read Detected, "
     "Storage Slot Alignment, SMT Constraint Result (SAT/UNSAT), and Sensitive Sink Reachability."),
    ("Fig. 4.3.5: Controlled Sandbox Exploit Simulation (Before vs. After State Cards)",
     "Presents side-by-side financial and ownership state comparison cards: Alice vs. Attacker balances, contract balance, and storage slot values."),
    ("Fig. 4.3.6: Step-by-Step Transaction Execution and Balance Transfer Trace",
     "Details the sequential multi-step exploit execution in the sandbox, documenting caller addresses, function calldata, and transfer amounts."),
    ("Fig. 4.3.7: Grounded AI Explanation & Root Cause Analysis (Google Gemini 3.8 / Flash)",
     "Renders the evidence-bound AI auditor synthesis, explaining threat models, storage collision mechanics, and ERC-1967/UUPS remediation advice."),
    ("Fig. 4.3.8: Formal Auditor-Grade Security Audit Report Generator",
     "Provides a one-click Markdown and document report generation interface containing complete audit summaries and execution evidence.")
]

for fig_title, fig_desc in ui_views:
    new_body.append(make_para(fig_title, bold=True, size_pt=11, color="0F4761", space_before_pt=4, space_after_pt=2))
    new_body.append(make_para(fig_desc, italic=True, size_pt=10.5, space_after_pt=6))

new_body.append(make_page_break())

# ==============================================================================
# CHAPTER 5: RESULTS AND DISCUSSION
# ==============================================================================
new_body.append(make_heading("5. Results and Discussion", level=1))

p_res1 = (
    "To rigorously evaluate the accuracy, determinism, and performance of the SmartShield Dynamic Validation Engine, the system "
    "was tested against four distinct benchmark contracts representing single-path proxies, multi-path vaults, mixed-security vaults, "
    "and benign safe contracts. All tests were executed in an automated test environment."
)
new_body.append(make_para(p_res1, align="both", size_pt=11.5, space_after_pt=8))

# 5.1 Benchmark Test Contracts & Observations
new_body.append(make_heading("5.1 Benchmark Test Contracts & Observations", level=2))

p_bench_desc = (
    "The benchmark suite encompasses four specialized Solidity contracts designed to test true-positive confirmation and "
    "false-positive rejection:"
)
new_body.append(make_para(p_bench_desc, align="both", size_pt=11.5, space_after_pt=6))

new_body.append(make_bullet("A classic unvalidated delegatecall proxy where both proxy and implementation declare state variable 'owner' at slot 0. Candidate: initialize() -> execute().", "1. VulnerableOwnerProxy.sol: "))
new_body.append(make_bullet("A complex vault featuring 6 distinct candidate attack paths across 3 state variables ('owner' at slot 0, 'admin' at slot 1, 'feeRecipient' at slot 2) and 3 sensitive sinks (emergencyShutdown, sweepFunds, claimFees).", "2. MultiPathVault.sol: "))
new_body.append(make_bullet("A mixed-security contract containing both confirmed exploitable paths (unprotected setOwner and setAdmin) and correctly guarded paths (setFeeRecipient protected by require(msg.sender == owner)).", "3. MixedSecurityVault.sol: "))
new_body.append(make_bullet("A correctly implemented proxy utilizing an immutable owner variable, where unauthorized delegatecalls fail to mutate caller state.", "4. SafeDelegatecall.sol: "))

p_tbl_intro = (
    "Table 5.1 summarizes the empirical execution results across all test contracts, recording runtime opcodes intercepted, "
    "Microsoft Z3 constraint results, final validation verdicts, simulated financial impact, and execution latency."
)
new_body.append(make_para(p_tbl_intro, align="both", size_pt=11.5, space_after_pt=8))

results_headers = ["Benchmark Target", "Path / Variable", "Target Slot", "Runtime Opcode", "Z3 SMT Result", "Validation Verdict", "Simulated Exploit Impact", "Latency (ms)"]
results_data = [
    ["VulnerableOwnerProxy", "PATH-01: owner", "Slot 0x0", "SSTORE + SLOAD", "SAT", "CONFIRMED", "10.0 ETH drained; Owner hijacked", "401 ms"],
    ["MultiPathVault", "PATH-01: owner (Condition)", "Slot 0x0", "SSTORE + SLOAD", "SAT", "CONFIRMED", "Bypassed require(msg.sender == owner)", "412 ms"],
    ["MultiPathVault", "PATH-02: owner (Selfdestruct)", "Slot 0x0", "SSTORE + SLOAD", "SAT", "CONFIRMED", "emergencyShutdown() triggered; Contract destroyed", "418 ms"],
    ["MultiPathVault", "PATH-03: admin (Condition)", "Slot 0x1", "SSTORE + SLOAD", "SAT", "CONFIRMED", "Bypassed require(msg.sender == admin)", "405 ms"],
    ["MultiPathVault", "PATH-04: admin (Transfer)", "Slot 0x1", "SSTORE + SLOAD", "SAT", "CONFIRMED", "sweepFunds() executed; 10.0 ETH drained", "422 ms"],
    ["MixedSecurityVault", "PATH-01: owner (Drain)", "Slot 0x0", "SSTORE + SLOAD", "SAT", "CONFIRMED", "Owner hijacked; 10.0 ETH drained", "415 ms"],
    ["MixedSecurityVault", "PATH-05: feeRecipient (Guarded)", "Slot 0x2", "Execution Reverted", "UNSAT", "REJECTED", "Reverted; 0 ETH drained (No False Positive)", "388 ms"],
    ["SafeDelegatecall", "PATH-01: immutable owner", "Slot 0x0", "Execution Reverted", "UNSAT", "REJECTED", "Writer reverted; Benign contract safely preserved", "375 ms"]
]
tbl_results = make_table(results_headers, results_data, [1800, 2000, 1100, 1400, 1000, 1300, 2000, 960], ["left", "left", "center", "center", "center", "center", "left", "center"], font_size=9)
new_body.append(tbl_results)
new_body.append(make_para("", space_after_pt=10))

callout_eval = make_callout_box(
    "Key Experimental Result: 100% Accuracy on Benchmark Corpus",
    "Across all 8 benchmark test scenarios, the SmartShield Dynamic Engine achieved 100% true-positive confirmation on vulnerable paths "
    "and 100% true-negative rejection on protected or safe contracts with zero false positives. Average validation latency was 404 ms."
)
new_body.append(callout_eval)
new_body.append(make_para("", space_after_pt=10))

# 5.2 Qualitative Comparison with Existing Systems
new_body.append(make_heading("5.2 Qualitative Comparison with Existing Systems", level=2))

p_comp_desc = (
    "Table 5.2 presents a qualitative comparison between SmartShield and existing state-of-the-art smart contract security tools. "
    "The evaluation examines capability dimensions including execution model, storage collision tracking, SMT constraint solving, "
    "exploit replay simulation, and grounded AI explanation."
)
new_body.append(make_para(p_comp_desc, align="both", size_pt=11.5, space_after_pt=8))

comp_headers = ["Evaluation Criterion", "Slither [2]", "Manticore [3]", "Mythril [4]", "DelegateTracker [1]", "SmartShield Dynamic Engine"]
comp_data = [
    [
        "Primary Focus",
        "General static code and taint analysis",
        "Full EVM symbolic execution",
        "Security analysis via symbolic taint",
        "Static delegatecall read-write data flow",
        "Targeted EVM dynamic validation & SMT verification"
    ],
    [
        "Execution Environment",
        "None (Static AST only)",
        "Custom Python EVM emulator",
        "LASER EVM symbolic interpreter",
        "None (Static AST parser)",
        "Isolated official @ethereumjs/vm sandbox"
    ],
    [
        "Storage Collision Modeling",
        "Basic AST slot warnings",
        "Symbolic memory array model",
        "General storage slot tracking",
        "Static 32-byte slot alignment",
        "Runtime SSTORE/SLOAD interception & SlotComparator"
    ],
    [
        "Constraint Solving",
        "None",
        "Unconstrained Z3 solver",
        "Z3 SMT solver",
        "None",
        "Targeted 160-bit BitVector Z3 SMT solver"
    ],
    [
        "Path Explosion Resistance",
        "High (Non-symbolic)",
        "Low (Explores all states)",
        "Low (Prone to timeouts)",
        "High (Static bounded search)",
        "High (Targeted candidate validation only)"
    ],
    [
        "Exploit Replay Simulation",
        "No",
        "Yes (Generates testcases)",
        "No",
        "No",
        "Yes (Controlled before/after state diff sandbox)"
    ],
    [
        "AI Explanation Layer",
        "None",
        "None",
        "None",
        "None",
        "Grounded Gemini 3.8 Flash bounded by EVM evidence"
    ],
    [
        "Interactive Graph UI",
        "Static dot graph exports",
        "CLI / script output only",
        "CLI text output only",
        "CLI / static report",
        "React 19 dashboard with clickable opcode nodes"
    ]
]
tbl_comp = make_table(comp_headers, comp_data, [1700, 1500, 1500, 1500, 1500, 1660], ["left", "left", "left", "left", "left", "left"], font_size=9)
new_body.append(tbl_comp)
new_body.append(make_para("", space_after_pt=10))

# 5.3 Vulnerability Analysis and Validation Boundaries
new_body.append(make_heading("5.3 Vulnerability Analysis and Validation Boundaries", level=2))

p_val_desc = (
    "The core strength of the SmartShield dynamic engine lies in its strict six-criteria validation policy. A candidate attack path "
    "is never confirmed based on heuristics or the isolated appearance of delegatecall. Instead, all six conditions must be satisfied:"
)
new_body.append(make_para(p_val_desc, align="both", size_pt=11.5, space_after_pt=6))

new_body.append(make_bullet("The transaction sequence (writer followed by reader/sink) must execute in the EVM sandbox without reverting.", "Criterion 1 (Path Executability): "))
new_body.append(make_bullet("An SSTORE opcode must be intercepted during the writer function invocation, capturing the mutated storage slot.", "Criterion 2 (Storage Write Detected): "))
new_body.append(make_bullet("An SLOAD opcode must be intercepted during the subsequent reader/sink function invocation, accessing the relevant slot.", "Criterion 3 (Storage Read Detected): "))
new_body.append(make_bullet("The runtime storage slot and byte offset must identically match the static layout prediction.", "Criterion 4 (Storage Slot Alignment Match): "))
new_body.append(make_bullet("The Microsoft Z3 SMT solver must mathematically prove that the access-control guard conditions are SAT under the mutated state.", "Criterion 5 (SMT Constraint Satisfiability): "))
new_body.append(make_bullet("The execution trace must confirm that a sensitive sink (such as a CALL value transfer or SELFDESTRUCT) was reached.", "Criterion 6 (Sensitive Sink Reachability): "))

p_bound_intro = (
    "While this validation policy guarantees zero false positives for analyzed candidates, several engineering boundaries and "
    "limitations must be noted:"
)
new_body.append(make_para(p_bound_intro, align="both", size_pt=11.5, space_after_pt=6))

new_body.append(make_bullet("In the current implementation, storage layout matching focuses on contiguous 32-byte primitive state variables (address, uint256, bool) and simple structs. Dynamic mappings (keccak256(key . slot)) and dynamically-sized arrays are flagged as complex and may return INCONCLUSIVE.", "Boundary 1: Complex Dynamic Storage Structures: "))
new_body.append(make_bullet("Contracts requiring specific block timestamps (block.timestamp), block numbers, or oracle data use configured default environment mocks.", "Boundary 2: Environmental EVM Mocking: "))
new_body.append(make_bullet("When an implementation address is loaded dynamically from arbitrary user calldata rather than storage or constructor arguments, automated deployment requires an explicit target resolution hint.", "Boundary 3: Unresolved Delegatecall Targets: "))

new_body.append(make_page_break())

# ==============================================================================
# CHAPTER 6: OBSERVATIONS
# ==============================================================================
new_body.append(make_heading("6. Observations", level=1))

p_obs1 = (
    "During the design, implementation, and experimental benchmarking of the SmartShield Dynamic Validation Engine, several significant "
    "engineering and domain-specific observations were made:"
)
new_body.append(make_para(p_obs1, align="both", size_pt=11.5, space_after_pt=8))

p_obs2 = (
    "1. Decoupling Search from Validation Eliminates Path Explosion: "
    "Attempting to perform unconstrained symbolic execution across an entire smart contract codebase leads directly to exponential path explosion. "
    "By accepting pre-filtered candidate attack paths from upstream static analyzers, our dynamic engine focuses symbolic and opcode resources "
    "strictly on the suspicious execution branches. This achieves execution latencies averaging 400 milliseconds per candidate while maintaining "
    "mathematical proof of satisfiability."
)
new_body.append(make_para(p_obs2, align="both", size_pt=11.5, space_after_pt=8))

p_obs3 = (
    "2. Low-Level Opcode Interception Provides Incontrovertible Proof: "
    "High-level Solidity source code often obscures what occurs during execution due to compiler optimizations and implicit memory packing. "
    "By hooking EVM execution directly at the opcode step level (intercepting SSTORE, SLOAD, and CALL stack frames), the engine obtains "
    "unfiltered ground truth. An auditor can inspect the exact program counter, gas consumption, and 256-bit storage slot keys modified by the exploit."
)
new_body.append(make_para(p_obs3, align="both", size_pt=11.5, space_after_pt=8))

p_obs4 = (
    "3. SMT Solving Prevents False Positives on Guarded Patterns: "
    "As demonstrated in our MixedSecurityVault benchmark, contracts frequently contain functions that look syntactically vulnerable but are "
    "protected by require statements checking msg.sender == owner. Without SMT constraint solving, linters mistakenly flag these functions as "
    "exploitable. Z3 solver's BitVector arithmetic proved that when an unauthorized caller invokes setFeeRecipient, the constraints are UNSAT, "
    "correctly rejecting the false positive."
)
new_body.append(make_para(p_obs4, align="both", size_pt=11.5, space_after_pt=8))

p_obs5 = (
    "4. Exploit Simulation Bridges the Developer-Auditor Communication Gap: "
    "Security reports containing only abstract risk ratings often fail to convey the urgency of a vulnerability. By providing an automated "
    "controlled exploit replayer that outputs concrete before/after state diff cards (e.g., proving Alice's balance dropped from 10 ETH to 0 ETH "
    "while Attacker gained 10 ETH), developers immediately grasp the financial consequences and prioritize remediation."
)
new_body.append(make_para(p_obs5, align="both", size_pt=11.5, space_after_pt=8))

p_obs6 = (
    "5. Grounded AI Models Prevent Hallucinations in Automated Auditing: "
    "Deploying large language models without execution constraints frequently results in speculative or false security claims. By supplying "
    "Google Gemini with structured EVM opcode traces, verified slot matches, and Z3 proofs, the AI model generates accurate, professional "
    "remediation guidance focused specifically on modern ERC-1967 and UUPS unstructured storage patterns."
)
new_body.append(make_para(p_obs6, align="both", size_pt=11.5, space_after_pt=12))

# ==============================================================================
# CHAPTER 7: CONCLUSION
# ==============================================================================
new_body.append(make_heading("7. Conclusion", level=1))

p_concl1 = (
    "In this project, we designed, implemented, and benchmarked the SmartShield Dynamic Validation, Symbolic Constraint Solving, "
    "and Simulation Engine—an end-to-end smart contract security system dedicated to resolving delegatecall-related storage collision "
    "and state-hijacking vulnerabilities in Ethereum smart contracts. By shifting the paradigm from heuristic static detection to concrete, "
    "evidence-grounded execution validation, the system establishes a new standard for precision in automated vulnerability analysis."
)
new_body.append(make_para(p_concl1, align="both", size_pt=11.5, space_after_pt=8))

p_concl2 = (
    "The implementation integrates an in-memory Wasm solc compiler, an isolated EVM execution sandbox powered by @ethereumjs/vm, "
    "step-level opcode interception for SSTORE/SLOAD/DELEGATECALL/CALL/SELFDESTRUCT, a storage layout collision comparator, and 160-bit "
    "BitVector constraint reasoning powered by Microsoft Z3. The system enforces a rigorous six-criteria validation engine, ensuring that "
    "only genuinely executable and exploitable candidates receive a CONFIRMED verdict, while protected contracts are provably REJECTED."
)
new_body.append(make_para(p_concl2, align="both", size_pt=11.5, space_after_pt=8))

p_concl3 = (
    "Furthermore, the project delivers a safe exploit replay simulator that demonstrates before/after balance and ownership state diffs, "
    "an evidence-grounded generative AI explanation layer powered by Google Gemini, and an interactive React 19 web dashboard with clickable "
    "attack graphs. Empirical evaluation on reference benchmark contracts demonstrated 100% precision, zero false positives, and average "
    "analysis times under 450 milliseconds per candidate path. The SmartShield dynamic engine demonstrates that combining low-level EVM execution "
    "with formal SMT constraint solving provides an effective, scalable, and indispensable verification layer for securing the decentralized web."
)
new_body.append(make_para(p_concl3, align="both", size_pt=11.5, space_after_pt=12))

# ==============================================================================
# CHAPTER 8: FUTURE WORK
# ==============================================================================
new_body.append(make_heading("8. Future Work", level=1))

p_fw1 = (
    "While the current implementation achieves its defined architectural and verification goals, several promising avenues exist for "
    "extending the capabilities of the system in future iterations:"
)
new_body.append(make_para(p_fw1, align="both", size_pt=11.5, space_after_pt=8))

new_body.append(make_bullet(
    "Extend the SlotComparator to resolve Keccak-256 dynamic storage hashes for complex data structures, including mappings of structs, "
    "dynamically-sized arrays, and Diamond Storage (ERC-2535) namespaces.",
    "1. Complex & Nested Storage Layout Resolution: "
))
new_body.append(make_bullet(
    "Incorporate automated fork testing using Anvil or Hardhat Network, enabling the EVM sandbox to fork live mainnet state and evaluate "
    "candidate attack paths against deployed protocols, active liquidity pools, and real oracle feeds.",
    "2. Mainnet Forking & Live State Simulation: "
))
new_body.append(make_bullet(
    "Develop GitHub Actions and GitLab CI plugins that automatically ingest candidate paths on pull requests, execute the dynamic validator "
    "during continuous integration, and block pull requests containing CONFIRMED delegatecall storage collisions.",
    "3. CI/CD Automated Security Pipeline Integration: "
))
new_body.append(make_bullet(
    "Expand the Z3 symbolic reasoning engine to automatically generate optimized Hardhat / Foundry test cases with concrete input calldata, "
    "allowing auditors to immediately reproduce confirmed exploits in their local development environments.",
    "4. Automated Exploit Test Harness Generation: "
))
new_body.append(make_bullet(
    "Extend the low-level opcode hooks and storage alignment rules to evaluate non-EVM smart contract architectures, such as Solana (Anchor), "
    "Aptos (Move), and WebAssembly-based blockchains (CosmWasm).",
    "5. Multi-Chain and Heterogeneous VM Support: "
))

new_body.append(make_page_break())

# ==============================================================================
# CHAPTER 9: REFERENCES
# ==============================================================================
new_body.append(make_heading("9. References", level=1))

references = [
    "[1] W. Cao, P. Feng, S. Lu, Y. Wang, X. Wang, and R. Yang, “DelegateTracker: Delegatecall vulnerability detection tool based on read-write data flow capture algorithm,” Blockchain: Research and Applications, vol. 7, no. 1, 2026, Art. no. 100338, doi: 10.1016/j.bcra.2025.100338.",
    "[2] J. Feist, G. Grieco, and A. Groce, “Slither: A static analysis framework for smart contracts,” in Proc. 2nd Int. Workshop Emerging Trends Softw. Eng. Blockchain (WETSEB), IEEE, May 2019, pp. 8–15, doi: 10.1109/WETSEB.2019.00008.",
    "[3] M. Mossberg, F. Manzano, E. Hennenfent, A. Groce, G. Grieco, J. Feist, T. Trent, and K. Falcon, “Manticore: A user-friendly symbolic execution framework for binaries and smart contracts,” in Proc. 34th IEEE/ACM Int. Conf. Automated Softw. Eng. (ASE), Nov. 2019, pp. 1186–1189.",
    "[4] B. Mueller, “Smashing Ethereum smart contracts for fun and real profit,” in Proc. 9th HITB Security Conf. (HITBSecConf), Amsterdam, Netherlands, May 2018, pp. 1–54.",
    "[5] L. Luu, D. H. Chu, H. Olickel, P. Saxena, and A. Hobor, “Making smart contracts smarter,” in Proc. ACM SIGSAC Conf. Comput. Commun. Security (CCS), Vienna, Austria, Oct. 2016, pp. 254–269, doi: 10.1145/2976749.2978309.",
    "[6] G. Wood, “Ethereum: A secure decentralised generalised transaction ledger,” Ethereum Project Yellow Paper, vol. 151, pp. 1–32, 2014.",
    "[7] OpenZeppelin, “Proxy upgrade pattern and ERC-1967: Standard proxy storage slots,” OpenZeppelin Contracts Documentation, 2023. [Online]. Available: https://docs.openzeppelin.com/contracts/4.x/api/proxy",
    "[8] L. de Moura and N. Bjørner, “Z3: An efficient SMT solver,” in Tools and Algorithms for the Construction and Analysis of Systems (TACAS), C. R. Ramakrishnan and J. Rehof, Eds., Berlin, Heidelberg: Springer, 2008, pp. 337–340.",
    "[9] Ethereum Foundation, “EthereumJS VM: TypeScript implementation of the Ethereum Virtual Machine,” GitHub Repository, 2024. [Online]. Available: https://github.com/ethereumjs/ethereumjs-monorepo",
    "[10] P. Tsankov, A. M. Dan, D. Drachsler-Cohen, V. Gervais, F. Buenzli, and M. Vechev, “Securify: Practical security analysis of Ethereum smart contracts,” in Proc. ACM SIGSAC Conf. Comput. Commun. Security (CCS), Toronto, ON, Canada, Oct. 2018, pp. 67–82.",
    "[11] Google DeepMind, “Gemini 1.5 and 2.0 Flash: High-efficiency multimodal models with long context windows,” Technical Report, Google LLC, 2024."
]

for ref in references:
    new_body.append(make_para(ref, align="both", size_pt=10, space_before_pt=3, space_after_pt=4))

# Append sectPr at the very end of body
new_body.append(sectPr_orig)

# Replace body in root
root_orig.remove(body_orig)
root_orig.append(new_body)

# Serialize new document.xml
new_xml = ET.tostring(root_orig, encoding='utf-8', xml_declaration=True)

# Write output docx
print(f"Writing final docx to {OUTPUT_DOCX}...")
with zipfile.ZipFile(OUTPUT_DOCX, 'w', compression=zipfile.ZIP_DEFLATED) as z_out:
    # Write updated document.xml
    z_out.writestr('word/document.xml', new_xml)
    # Write all other files unchanged
    for name, content in other_files.items():
        z_out.writestr(name, content)

size = os.path.getsize(OUTPUT_DOCX)
print(f"Successfully generated {OUTPUT_DOCX} ({size} bytes)")
