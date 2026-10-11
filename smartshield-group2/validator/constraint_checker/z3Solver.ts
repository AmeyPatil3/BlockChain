/**
 * @file z3Solver.ts
 * FR-07: Constraint Validation
 * Evaluates execution conditions required by the candidate path using Microsoft Z3 SMT solver.
 * Returns SAT, UNSAT, or UNKNOWN.
 */

import { init } from 'z3-solver';

export interface ConstraintResult {
  status: 'SAT' | 'UNSAT' | 'UNKNOWN';
  reason: string;
  model?: Record<string, string>;
}

export class Z3Solver {
  private static z3ContextPromise: Promise<any> | null = null;

  private static async getContext(): Promise<any> {
    if (!this.z3ContextPromise) {
      this.z3ContextPromise = init().then(({ Context }) => new Context('main'));
    }
    return this.z3ContextPromise;
  }

  /**
   * Checks satisfiability of an access control condition:
   * e.g. caller address reaching a gate requiring `caller == owner`.
   * If `owner` can be set to `caller` (post-delegatecall overwrite), this is SAT.
   * If `caller` is constrained != `owner` and cannot be mutated, this is UNSAT.
   */
  public static async checkAccessControlCondition(params: {
    callerAddress: string;
    originalOwnerAddress: string;
    runtimeOwnerWrittenAddress: string | null;
    requiresOwnerCheck: boolean;
  }): Promise<ConstraintResult> {
    try {
      const ctx = await this.getContext();
      const solver = new ctx.Solver();

      // Symbolic variables as BitVecs or Ints
      // Represent addresses as 160-bit integers
      const caller = ctx.BitVec.const('caller', 160);
      const owner = ctx.BitVec.const('owner', 160);

      const callerVal = BigInt(params.callerAddress);
      const writtenVal = params.runtimeOwnerWrittenAddress
        ? BigInt(params.runtimeOwnerWrittenAddress)
        : BigInt(params.originalOwnerAddress);

      // Caller identity
      solver.add(ctx.Eq(caller, ctx.BitVec.val(callerVal, 160)));

      // Current state of owner variable at runtime
      solver.add(ctx.Eq(owner, ctx.BitVec.val(writtenVal, 160)));

      // If condition requires caller == owner
      if (params.requiresOwnerCheck) {
        solver.add(ctx.Eq(caller, owner));
      }

      const check = await solver.check();

      if (check === 'sat') {
        return {
          status: 'SAT',
          reason: 'Path constraints satisfied: caller matches runtime owner condition.',
          model: {
            caller: params.callerAddress,
            runtime_owner: params.runtimeOwnerWrittenAddress || params.originalOwnerAddress,
          },
        };
      } else if (check === 'unsat') {
        return {
          status: 'UNSAT',
          reason: 'Path constraints impossible: caller does not satisfy the required guard condition.',
        };
      } else {
        return {
          status: 'UNKNOWN',
          reason: 'Solver returned unknown or timed out.',
        };
      }
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        reason: `SMT solver error: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * General symbolic expression satisfiability check
   */
  public static async checkConditionSAT(conditionExpr: string, variableBindings: Record<string, bigint | number>): Promise<ConstraintResult> {
    try {
      const ctx = await this.getContext();
      const solver = new ctx.Solver();

      for (const [name, val] of Object.entries(variableBindings)) {
        const v = ctx.Int.const(name);
        solver.add(ctx.Eq(v, ctx.Int.val(BigInt(val))));
      }

      const check = await solver.check();
      return {
        status: check === 'sat' ? 'SAT' : check === 'unsat' ? 'UNSAT' : 'UNKNOWN',
        reason: `Constraint evaluation completed with status: ${check}`,
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        reason: `Solver error: ${err.message || String(err)}`,
      };
    }
  }
}
