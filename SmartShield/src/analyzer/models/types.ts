/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SourceLocation {
  line: number | null;
  column: number | null;
  endLine?: number | null;
  endColumn?: number | null;
}

export interface StateVariableInfo {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'internal' | 'default';
  isConstant: boolean;
  isImmutable: boolean;
  slot: string;
  offset: number;
  bytes: number;
  declarationOrder: number;
  contract: string;
  location?: SourceLocation;
  isComplex?: boolean;
  complexReason?: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
}

export interface FunctionInfo {
  name: string;
  contract: string;
  fullSignature: string;
  selector?: string;
  visibility: 'public' | 'external' | 'internal' | 'private';
  mutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  modifiers: string[];
  parameters: ParameterInfo[];
  returnValues: ParameterInfo[];
  sourceLocation: SourceLocation;
  astNodeId?: string;
  calledFunctions: string[];
  calledBy: string[];
  isConstructor: boolean;
  isFallback: boolean;
  isReceive: boolean;
  externalReachability: boolean;
  accessControls: string[];
  reads: string[];
  writes: string[];
}

export interface ReadWriteInfo {
  function: string;
  contract: string;
  reads: string[];
  writes: string[];
  compound: string[];
  visibility: string;
  modifiers: string[];
}

export interface CFGNode {
  id: string;
  type: 'entry' | 'statement' | 'condition' | 'branch' | 'call' | 'sensitive' | 'exit';
  label: string;
  line?: number;
  variablesRead: string[];
  variablesWritten: string[];
  condition?: string;
  trueBranch?: string;
  falseBranch?: string;
  next?: string[];
}

export interface CFGFunction {
  contract: string;
  functionName: string;
  nodes: CFGNode[];
  entryNodeId: string;
}

export interface CallGraphEdge {
  from: string; // e.g. "Wallet.initialize"
  to: string;   // e.g. "Wallet._setupOwner" or "Library.init"
  type: 'internal' | 'external' | 'modifier' | 'delegatecall';
  contractFrom: string;
  contractTo?: string;
}

export interface CallGraphInfo {
  nodes: string[];
  edges: CallGraphEdge[];
  adjacency: Record<string, string[]>;
  reverseAdjacency: Record<string, string[]>;
}

export interface DelegatecallInfo {
  contract: string;
  function: string;
  sourceLocation: {
    line: number | null;
    column: number | null;
  };
  targetExpression: string;
  targetType: 'constant' | 'state_variable' | 'function_parameter' | 'local_variable' | 'computed_expression';
  targetResolved: boolean;
  targetContractName?: string | null;
  argumentsSummary: string;
}

export interface SensitiveOperation {
  type: 'SELF_DESTRUCT' | 'ETHER_TRANSFER' | 'JUDGMENT_CONDITION';
  function: string;
  contract: string;
  variablesUsed: string[];
  sourceLocation: {
    line: number | null;
    column: number | null;
  };
  condition?: string;
  details: string;
}

export interface StorageSlotInfo {
  name: string;
  type: string;
  slot: string;
  offset: number;
  bytes: number;
  contract: string;
  declarationOrder: number;
  isComplex: boolean;
  complexReason?: string;
}

export interface ContractInfo {
  name: string;
  kind: 'contract' | 'interface' | 'library';
  inheritance: string[];
  stateVariables: StateVariableInfo[];
  functions: FunctionInfo[];
  modifiers: string[];
  constructors: FunctionInfo[];
  fallbackFunctions: FunctionInfo[];
  receiveFunctions: FunctionInfo[];
}

export interface ContractIR {
  contracts: ContractInfo[];
  stateVariables: StateVariableInfo[];
  functions: FunctionInfo[];
  modifiers: string[];
  calls: CallGraphEdge[];
  delegatecalls: DelegatecallInfo[];
  sensitiveOperations: SensitiveOperation[];
  controlFlow: CFGFunction[];
  storageLayout: StorageSlotInfo[];
  compilerVersion: string;
}

export interface CandidateAttackPath {
  schema_version?: string;
  id: string;
  contract?: string;
  vulnerability_type?: 'SELF_DESTRUCT' | 'CURRENCY_SENDING' | 'JUDGMENT_CONDITION' | string;
  vulnerabilityType: 'SELF_DESTRUCT' | 'ETHER_TRANSFER' | 'JUDGMENT_CONDITION';
  status: 'CANDIDATE';
  validationRequired: true;

  entry_point?: {
    function: string;
    source_line: number | null;
  };

  writer?: {
    function: string;
    variable: string;
    source_line: number | null;
  };

  reader?: {
    function: string;
    variable: string;
    source_line: number | null;
  };

  sink?: {
    type: string;
    function: string;
    source_line: number | null;
  };

  delegatecall?: {
    function: string;
    source_line: number | null;
    target: string;
    target_resolution: string;
  };

  access_control?: {
    writer: string;
    reader: string;
  };

  evidence?: {
    reason: string;
  };

  callerContract: string | null;
  calleeContract: string | null;
  delegatecallLocation: {
    function: string;
    line: number | null;
    column: number | null;
  };
  path: string[];
  vulnerabilityVariable: string;
  writerFunction: string;
  readerFunction: string;
  sensitiveOperation: {
    type: string;
    function: string;
  };
  storage: {
    variable?: string;
    slot: string | null;
    offset: number | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  reason: string;
}

export interface AnalysisInput {
  sources: { filename: string; content: string }[];
  compilerVersion: string;
}

export interface AnalysisResult {
  ir: ContractIR;
  candidateAttackPaths: CandidateAttackPath[];
  summary: {
    contractsCount: number;
    functionsCount: number;
    stateVariablesCount: number;
    delegatecallCount: number;
    sensitiveOperationsCount: number;
    candidateAttackPathsCount: number;
    highRiskCandidatesCount: number;
  };
  warnings: string[];
  errors: string[];
  status: 'SUCCESS' | 'PARTIAL' | 'ERROR';
}
