/**
 * @file types.ts
 * Core types and data models for SmartShield Group 2
 * Delegatecall Attack Path Validation & Simulation
 */

export interface ExpectedStorage {
  slot: string | number;
  offset: number;
}

export interface CandidateAttackPath {
  schema_version?: string;
  id?: string;
  contract?: string;
  caller_contract?: string;
  callee_contract?: string;
  callerContract?: string;
  calleeContract?: string;
  delegatecall_function?: string;
  vulnerability_type?: 'SELF_DESTRUCT' | 'CURRENCY_SENDING' | 'ETHER_TRANSFER' | 'JUDGMENT_CONDITION' | string;
  vulnerabilityType?: 'SELF_DESTRUCT' | 'ETHER_TRANSFER' | 'JUDGMENT_CONDITION';
  status?: string;
  attack_path?: string[];
  path?: string[];
  vulnerability_variable?: string;
  vulnerabilityVariable?: string;
  writer_function?: string;
  writerFunction?: string;
  reader_function?: string;
  readerFunction?: string;
  expected_storage?: ExpectedStorage;
  storage?: {
    variable?: string;
    slot: string | number | null;
    offset: number | null;
    confidence?: string;
  };
  sink?: {
    type: string;
    function: string;
    source_line?: number | null;
  };
  sensitiveOperation?: {
    type: string;
    function: string;
  };
  delegatecall?: {
    function: string;
    target?: string;
    target_resolution?: string;
  };
  reason?: string;
}

export interface RuntimeAccess {
  operation: 'READ' | 'WRITE';
  slot: string;
  offset: number;
  function: string;
  contract?: string;
  value?: string;
  stepIndex?: number;
}

export interface ValidationEvidence {
  writer_observed: {
    slot: string;
    offset: number;
    function: string;
    value?: string;
  } | null;
  reader_observed: {
    slot: string;
    offset: number;
    function: string;
    value?: string;
  } | null;
  sensitive_operation_details?: string;
  path_trace?: string[];
}

export interface ValidationResult {
  status: 'CONFIRMED' | 'REJECTED' | 'INCONCLUSIVE';
  executable: boolean;
  write_detected: boolean;
  read_detected: boolean;
  storage_match: boolean;
  constraints: 'SAT' | 'UNSAT' | 'UNKNOWN';
  sensitive_operation_reached: boolean;
  variable: string;
  reason?: string;
  runtime_accesses: RuntimeAccess[];
  attack_path: string[];
  evidence?: ValidationEvidence;
}

export interface AccountState {
  address: string;
  balanceEth: string;
  storage?: Record<string, string>;
  isOwner?: boolean;
}

export interface SimulationStep {
  stepNumber: number;
  action: string;
  caller: string;
  targetContract: string;
  calldataSummary: string;
  delegatecallTarget?: string;
  storageModified?: {
    slot: string;
    oldValue: string;
    newValue: string;
  };
  fundsTransferredEth?: string;
  sensitiveOpTriggered?: string;
}

export interface SimulationResult {
  status: 'COMPLETED' | 'FAILED';
  before_state: {
    owner: string;
    contractBalanceEth: string;
    attackerBalanceEth: string;
    storage: Record<string, string>;
  };
  steps: SimulationStep[];
  after_state: {
    owner: string;
    contractBalanceEth: string;
    attackerBalanceEth: string;
    storage: Record<string, string>;
  };
  impact: {
    unauthorizedNewOwner?: string;
    fundsDrainedEth?: string;
    contractDestroyed?: boolean;
    conditionBypassed?: boolean;
    summary: string;
  };
}
