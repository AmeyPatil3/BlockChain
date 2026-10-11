/**
 * @file evmRunner.ts
 * FR-02 & FR-04: Isolated EVM Controlled Execution Engine
 * Hooks EVM opcodes (SLOAD, SSTORE, DELEGATECALL, CALL, SELFDESTRUCT)
 * to capture runtime storage and call data-flow.
 */

import { createVM, VM } from '@ethereumjs/vm';
import {
  createAccount,
  createAddressFromString,
  Address,
  hexToBytes,
  bytesToHex,
  bigIntToHex,
} from '@ethereumjs/util';
import { ethers } from 'ethers';
import { RuntimeAccess } from '../types.ts';

export interface ExecutionStepRecord {
  stepIndex: number;
  opcode: string;
  pc: number;
  contract: string;
  activeFunction?: string;
  data?: any;
}

export interface CallResult {
  success: boolean;
  returnValue: string;
  gasUsed: bigint;
  revertReason?: string;
  runtimeAccesses: RuntimeAccess[];
  delegatecalls: { from: string; to: string; gas: bigint }[];
  transfers: { to: string; valueEth: string }[];
  selfdestructs: { recipient: string }[];
}

export class EVMRunner {
  private vm!: VM;
  private isInitialized = false;

  // Track runtime storage accesses
  private runtimeAccesses: RuntimeAccess[] = [];
  private stepRecords: ExecutionStepRecord[] = [];
  private delegatecalls: { from: string; to: string; gas: bigint }[] = [];
  private transfers: { to: string; valueEth: string }[] = [];
  private selfdestructs: { recipient: string }[] = [];

  // Context for active function
  private currentFunction: string = 'unknown';
  private currentContract: string = 'unknown';

  public async init(): Promise<void> {
    this.vm = await createVM();
    this.setupOpcodeInterception();
    this.isInitialized = true;
  }

  public setCurrentContext(contractName: string, functionName: string): void {
    this.currentContract = contractName;
    this.currentFunction = functionName;
  }

  private setupOpcodeInterception(): void {
    const evmEvents = this.vm.evm.events;
    if (!evmEvents) return;
    evmEvents.on('step', (step: any, next?: () => void) => {
      const opcodeName = step.opcode.name;

      if (opcodeName === 'SSTORE') {
        // Stack: [..., key, value]
        const stackLen = step.stack.length;
        if (stackLen >= 2) {
          const keyBigInt = step.stack[stackLen - 1];
          const valBigInt = step.stack[stackLen - 2];
          const slotHex = keyBigInt.toString(16);
          const valHex = valBigInt.toString(16);

          this.runtimeAccesses.push({
            operation: 'WRITE',
            slot: slotHex,
            offset: 0,
            function: this.currentFunction,
            contract: this.currentContract,
            value: '0x' + valHex,
            stepIndex: this.stepRecords.length,
          });
        }
      } else if (opcodeName === 'SLOAD') {
        // Stack: [..., key]
        const stackLen = step.stack.length;
        if (stackLen >= 1) {
          const keyBigInt = step.stack[stackLen - 1];
          const slotHex = keyBigInt.toString(16);

          this.runtimeAccesses.push({
            operation: 'READ',
            slot: slotHex,
            offset: 0,
            function: this.currentFunction,
            contract: this.currentContract,
            stepIndex: this.stepRecords.length,
          });
        }
      } else if (opcodeName === 'DELEGATECALL') {
        // Stack: [gas, to, inOffset, inSize, outOffset, outSize]
        const stackLen = step.stack.length;
        if (stackLen >= 2) {
          const toBigInt = step.stack[stackLen - 2];
          const toAddrHex = '0x' + toBigInt.toString(16).padStart(40, '0');
          this.delegatecalls.push({
            from: this.currentContract,
            to: toAddrHex,
            gas: step.stack[stackLen - 1],
          });
        }
      } else if (opcodeName === 'CALL') {
        // Stack: [gas, to, value, inOffset, inSize, outOffset, outSize]
        const stackLen = step.stack.length;
        if (stackLen >= 3) {
          const toBigInt = step.stack[stackLen - 2];
          const valBigInt = step.stack[stackLen - 3];
          if (valBigInt > 0n) {
            const toAddrHex = '0x' + toBigInt.toString(16).padStart(40, '0');
            this.transfers.push({
              to: toAddrHex,
              valueEth: ethers.formatEther(valBigInt),
            });
          }
        }
      } else if (opcodeName === 'SELFDESTRUCT') {
        // Stack: [recipient]
        const stackLen = step.stack.length;
        if (stackLen >= 1) {
          const toBigInt = step.stack[stackLen - 1];
          const toAddrHex = '0x' + toBigInt.toString(16).padStart(40, '0');
          this.selfdestructs.push({ recipient: toAddrHex });
        }
      }

      this.stepRecords.push({
        stepIndex: this.stepRecords.length,
        opcode: opcodeName,
        pc: step.pc,
        contract: this.currentContract,
        activeFunction: this.currentFunction,
      });

      if (typeof next === 'function') {
        next();
      }
    });
  }

  public async setAccountBalance(addressStr: string, balanceEth: string): Promise<void> {
    const addr = createAddressFromString(addressStr);
    const balanceWei = ethers.parseEther(balanceEth);
    const existing = await this.vm.stateManager.getAccount(addr);
    const account = existing || createAccount({});
    account.balance = balanceWei;
    await this.vm.stateManager.putAccount(addr, account);
  }

  public async getAccountBalance(addressStr: string): Promise<string> {
    const addr = createAddressFromString(addressStr);
    const account = await this.vm.stateManager.getAccount(addr);
    if (!account) return '0.0';
    return ethers.formatEther(account.balance);
  }

  private toHexPrefixed(val: string): `0x${string}` {
    const clean = val.startsWith('0x') ? val.slice(2) : val;
    const even = clean.length % 2 === 1 ? '0' + clean : clean;
    return (`0x` + even) as `0x${string}`;
  }

  public async getStorageAt(contractAddress: string, slot: string | number): Promise<string> {
    const addr = createAddressFromString(contractAddress);
    const slotBigInt = typeof slot === 'string' ? BigInt(slot.startsWith('0x') ? slot : '0x' + slot) : BigInt(slot);
    const slotHex = '0x' + slotBigInt.toString(16).padStart(64, '0');
    const slotBytes = hexToBytes(slotHex as `0x${string}`);
    const valBytes = await this.vm.stateManager.getStorage(addr, slotBytes);
    return bytesToHex(valBytes);
  }

  public async deployContract(
    senderStr: string,
    bytecodeHex: string,
    constructorCalldataHex: string = ''
  ): Promise<string> {
    if (!this.isInitialized) await this.init();

    const sender = createAddressFromString(senderStr);
    const rawHex = bytecodeHex.replace(/^0x/, '') + constructorCalldataHex.replace(/^0x/, '');
    const code = hexToBytes(this.toHexPrefixed(rawHex));

    this.setCurrentContext('Deployer', 'constructor');
    const result = await this.vm.evm.runCall({
      caller: sender,
      data: code,
      gasLimit: BigInt(5_000_000),
    });

    if (result.execResult.exceptionError) {
      throw new Error(`Deployment failed: ${result.execResult.exceptionError.error}`);
    }

    if (!result.createdAddress) {
      throw new Error('Deployment succeeded but no createdAddress returned');
    }

    return result.createdAddress.toString();
  }

  public async executeCall(params: {
    caller: string;
    to: string;
    dataHex: string;
    valueEth?: string;
    contractName?: string;
    functionName?: string;
  }): Promise<CallResult> {
    if (!this.isInitialized) await this.init();

    const initialAccessesCount = this.runtimeAccesses.length;
    const initialTransfersCount = this.transfers.length;
    const initialDelegatecallsCount = this.delegatecalls.length;
    const initialSelfdestructsCount = this.selfdestructs.length;

    this.setCurrentContext(params.contractName || 'TargetContract', params.functionName || 'unknown');

    const caller = createAddressFromString(params.caller);
    const to = createAddressFromString(params.to);
    const data = hexToBytes(this.toHexPrefixed(params.dataHex));
    const value = params.valueEth ? ethers.parseEther(params.valueEth) : BigInt(0);

    const result = await this.vm.evm.runCall({
      caller,
      to,
      data,
      value,
      gasLimit: BigInt(5_000_000),
    });

    const success = !result.execResult.exceptionError;
    const returnValue = bytesToHex(result.execResult.returnValue);

    let revertReason: string | undefined;
    if (!success) {
      revertReason = result.execResult.exceptionError?.error;
      // Try decoding revert string if present
      if (result.execResult.returnValue.length > 4) {
        try {
          const iface = new ethers.Interface(['function Error(string)']);
          const decoded = iface.decodeFunctionData('Error', returnValue);
          revertReason = decoded[0];
        } catch {
          // fallback to raw exception
        }
      }
    }

    const currentAccesses = this.runtimeAccesses.slice(initialAccessesCount);
    const currentTransfers = this.transfers.slice(initialTransfersCount);
    const currentDelegatecalls = this.delegatecalls.slice(initialDelegatecallsCount);
    const currentSelfdestructs = this.selfdestructs.slice(initialSelfdestructsCount);

    return {
      success,
      returnValue,
      gasUsed: result.execResult.executionGasUsed,
      revertReason,
      runtimeAccesses: currentAccesses,
      delegatecalls: currentDelegatecalls,
      transfers: currentTransfers,
      selfdestructs: currentSelfdestructs,
    };
  }

  public getAllRuntimeAccesses(): RuntimeAccess[] {
    return [...this.runtimeAccesses];
  }
}
