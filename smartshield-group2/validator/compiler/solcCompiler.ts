/**
 * @file solcCompiler.ts
 * FR-01 - Contract Compilation
 * Compiles Solidity source using solc and returns bytecode, ABI, and compiler version.
 */

import solc from 'solc';

export interface CompiledContract {
  name: string;
  bytecode: string;
  deployedBytecode: string;
  abi: any[];
  compilerVersion: string;
}

export interface CompilationResult {
  success: boolean;
  compilerVersion: string;
  contracts: Record<string, CompiledContract>;
  errors?: string[];
}

export class SolcCompiler {
  public static getCompilerVersion(): string {
    return solc.version();
  }

  public static compile(
    sources: Record<string, string>,
    optimizerRuns: number = 200
  ): CompilationResult {
    const compilerVersion = solc.version();
    
    // Construct standard JSON input for solc
    const inputSources: Record<string, { content: string }> = {};
    for (const [filename, content] of Object.entries(sources)) {
      inputSources[filename] = { content };
    }

    const input = {
      language: 'Solidity',
      sources: inputSources,
      settings: {
        optimizer: {
          enabled: true,
          runs: optimizerRuns,
        },
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'],
          },
        },
      },
    };

    try {
      const output = JSON.parse(solc.compile(JSON.stringify(input)));

      const errors: string[] = [];
      if (output.errors) {
        for (const err of output.errors) {
          if (err.severity === 'error') {
            errors.push(err.formattedMessage || err.message);
          }
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          compilerVersion,
          contracts: {},
          errors,
        };
      }

      const contracts: Record<string, CompiledContract> = {};

      if (output.contracts) {
        for (const [fileName, fileContracts] of Object.entries(output.contracts)) {
          for (const [contractName, contractData] of Object.entries(fileContracts as Record<string, any>)) {
            contracts[contractName] = {
              name: contractName,
              bytecode: '0x' + (contractData.evm?.bytecode?.object || ''),
              deployedBytecode: '0x' + (contractData.evm?.deployedBytecode?.object || ''),
              abi: contractData.abi || [],
              compilerVersion,
            };
          }
        }
      }

      return {
        success: true,
        compilerVersion,
        contracts,
      };
    } catch (err: any) {
      return {
        success: false,
        compilerVersion,
        contracts: {},
        errors: [err.message || String(err)],
      };
    }
  }

  public static compileSource(
    sourceCode: string,
    filename: string = 'Contract.sol'
  ): CompilationResult {
    return this.compile({ [filename]: sourceCode });
  }
}
