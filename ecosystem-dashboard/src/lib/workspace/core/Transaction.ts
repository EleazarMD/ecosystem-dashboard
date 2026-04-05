/**
 * Transaction Model
 * Batches operations that must succeed or fail together
 * Based on Notion's transaction architecture
 */

import { Operation, OperationUtils } from './Operation';

export type TransactionStatus = 'pending' | 'validating' | 'committing' | 'committed' | 'failed' | 'rolled_back';

export interface Transaction {
  id: string;
  operations: Operation[];
  workspace_id: string;
  user_id: string;
  status: TransactionStatus;
  created_at: number;
  committed_at?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TransactionResult {
  success: boolean;
  transaction_id: string;
  affected_blocks: string[];
  error?: string;
  duration_ms: number;
}

/**
 * Transaction Builder
 */
export class TransactionBuilder {
  private transaction: Transaction;

  constructor(workspace_id: string, user_id: string) {
    this.transaction = {
      id: crypto.randomUUID(),
      operations: [],
      workspace_id,
      user_id,
      status: 'pending',
      created_at: Date.now()
    };
  }

  /**
   * Add an operation to the transaction
   */
  addOperation(operation: Operation): this {
    this.transaction.operations.push(operation);
    return this;
  }

  /**
   * Add multiple operations
   */
  addOperations(operations: Operation[]): this {
    this.transaction.operations.push(...operations);
    return this;
  }

  /**
   * Set transaction metadata
   */
  setMetadata(metadata: Record<string, any>): this {
    this.transaction.metadata = metadata;
    return this;
  }

  /**
   * Build the transaction
   */
  build(): Transaction {
    if (this.transaction.operations.length === 0) {
      throw new Error('Transaction must have at least one operation');
    }
    return this.transaction;
  }

  /**
   * Get transaction (without building)
   */
  getTransaction(): Transaction {
    return this.transaction;
  }
}

/**
 * Transaction utilities
 */
export class TransactionUtils {
  /**
   * Get all blocks affected by transaction
   */
  static getAffectedBlocks(transaction: Transaction): string[] {
    const blocks = new Set<string>();
    
    for (const op of transaction.operations) {
      const opBlocks = OperationUtils.getAffectedBlocks(op);
      opBlocks.forEach(b => blocks.add(b));
    }
    
    return Array.from(blocks);
  }

  /**
   * Check if transaction has conflicting operations
   */
  static hasConflicts(transaction: Transaction): boolean {
    const ops = transaction.operations;
    
    for (let i = 0; i < ops.length; i++) {
      for (let j = i + 1; j < ops.length; j++) {
        if (OperationUtils.conflictsWith(ops[i], ops[j])) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Validate transaction structure
   */
  static validate(transaction: Transaction): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!transaction.id) {
      errors.push('Transaction ID is required');
    }

    if (!transaction.workspace_id) {
      errors.push('Workspace ID is required');
    }

    if (!transaction.user_id) {
      errors.push('User ID is required');
    }

    if (transaction.operations.length === 0) {
      errors.push('Transaction must have at least one operation');
    }

    // Check for internal conflicts
    if (this.hasConflicts(transaction)) {
      errors.push('Transaction has conflicting operations');
    }

    // Validate each operation has required fields
    for (const op of transaction.operations) {
      if (!op.id) {
        errors.push(`Operation missing ID: ${op.type}`);
      }
      if (!op.timestamp) {
        errors.push(`Operation missing timestamp: ${op.type}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Requires tree integrity check?
   */
  static requiresTreeCheck(transaction: Transaction): boolean {
    return transaction.operations.some(op => OperationUtils.requiresTreeCheck(op));
  }

  /**
   * Clone transaction
   */
  static clone(transaction: Transaction): Transaction {
    return JSON.parse(JSON.stringify(transaction));
  }

  /**
   * Serialize transaction for storage
   */
  static serialize(transaction: Transaction): string {
    return JSON.stringify(transaction);
  }

  /**
   * Deserialize transaction from storage
   */
  static deserialize(json: string): Transaction {
    return JSON.parse(json) as Transaction;
  }

  /**
   * Get transaction size (for metrics)
   */
  static getSize(transaction: Transaction): number {
    return transaction.operations.length;
  }

  /**
   * Get operation types in transaction
   */
  static getOperationTypes(transaction: Transaction): string[] {
    return transaction.operations.map(op => op.type);
  }
}

/**
 * Transaction Queue (for client-side persistence)
 */
export class TransactionQueue {
  private queue: Transaction[] = [];
  private processing: Set<string> = new Set();

  /**
   * Add transaction to queue
   */
  enqueue(transaction: Transaction): void {
    this.queue.push(transaction);
  }

  /**
   * Get next transaction to process
   */
  dequeue(): Transaction | null {
    const transaction = this.queue.find(tx => !this.processing.has(tx.id));
    if (transaction) {
      this.processing.add(transaction.id);
    }
    return transaction || null;
  }

  /**
   * Mark transaction as complete
   */
  complete(transactionId: string): void {
    this.processing.delete(transactionId);
    this.queue = this.queue.filter(tx => tx.id !== transactionId);
  }

  /**
   * Mark transaction as failed (keep in queue for retry)
   */
  fail(transactionId: string): void {
    this.processing.delete(transactionId);
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get pending transactions
   */
  getPending(): Transaction[] {
    return this.queue.filter(tx => !this.processing.has(tx.id));
  }

  /**
   * Get processing transactions
   */
  getProcessing(): Transaction[] {
    return this.queue.filter(tx => this.processing.has(tx.id));
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
  }
}
