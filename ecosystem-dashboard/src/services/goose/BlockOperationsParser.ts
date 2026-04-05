/**
 * Block Operations Parser
 * Parses natural language messages to extract block operations
 */

import { BlockOperation } from './BlockOperations';

export interface ParsedOperation {
  operations: BlockOperation[];
  confidence: number;
  description: string;
}

export class BlockOperationsParser {
  /**
   * Parse a natural language message to extract block operations
   */
  parse(message: string, currentBlocks: any[]): ParsedOperation {
    const lowerMessage = message.toLowerCase();

    // Try different parsing strategies
    const strategies = [
      this.parseAddBullets,
      this.parseAddParagraph,
      this.parseDeleteOperation,
      this.parseUpdateOperation,
      this.parseMoveOperation,
      this.parseRenamePage,
    ];


    for (const strategy of strategies) {
      const result = strategy.call(this, lowerMessage, currentBlocks);
      if (result.operations.length > 0) {
        return result;
      }
    }

    return {
      operations: [],
      confidence: 0,
      description: 'No operations detected',
    };
  }

  /**
   * Parse "add N bullets" commands
   */
  private parseAddBullets(message: string, blocks: any[]): ParsedOperation {
    const patterns = [
      /add (\d+) bullets?/i,
      /create (\d+) bullets?/i,
      /insert (\d+) bullets?/i,
      /add (\d+) bullet points?/i,
      /(\d+) bullet points?/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const count = parseInt(match[1], 10);
        const lastBlock = blocks[blocks.length - 1];

        const operations: BlockOperation[] = [];
        for (let i = 0; i < count; i++) {
          operations.push({
            type: 'insert',
            afterBlockId: i === 0 ? lastBlock?.id : `temp-${i - 1}`, // Will be resolved
            blockType: 'bulleted_list',
            content: `Bullet point ${i + 1}`,
          });
        }

        return {
          operations,
          confidence: 0.9,
          description: `Add ${count} bullet points`,
        };
      }
    }

    // Check for generic "add bullets" without number
    if (message.includes('add bullet') || message.includes('create bullet')) {
      const lastBlock = blocks[blocks.length - 1];
      return {
        operations: [
          {
            type: 'insert',
            afterBlockId: lastBlock?.id,
            blockType: 'bulleted_list',
            content: 'New bullet point',
          },
        ],
        confidence: 0.8,
        description: 'Add 1 bullet point',
      };
    }

    return { operations: [], confidence: 0, description: '' };
  }

  /**
   * Parse "add paragraph" commands
   */
  private parseAddParagraph(message: string, blocks: any[]): ParsedOperation {
    const patterns = [
      /add (?:a )?(?:new )?paragraph/i,
      /create (?:a )?(?:new )?paragraph/i,
      /insert (?:a )?(?:new )?paragraph/i,
      /continue writing/i,
      /write more/i,
      /keep going/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(message)) {
        const lastBlock = blocks[blocks.length - 1];
        return {
          operations: [
            {
              type: 'insert',
              afterBlockId: lastBlock?.id,
              blockType: 'paragraph',
              content: 'New paragraph content',
            },
          ],
          confidence: 0.85,
          description: 'Add new paragraph',
        };
      }
    }

    return { operations: [], confidence: 0, description: '' };
  }

  /**
   * Parse delete operations
   */
  private parseDeleteOperation(message: string, blocks: any[]): ParsedOperation {
    const patterns = [
      /delete (?:the )?last (?:\d+ )?(?:block|paragraph|bullet)/i,
      /remove (?:the )?last (?:\d+ )?(?:block|paragraph|bullet)/i,
      /delete (?:this|that)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        // Extract number if specified
        const numMatch = message.match(/(\d+)/);
        const count = numMatch ? parseInt(numMatch[1], 10) : 1;

        const operations: BlockOperation[] = [];
        for (let i = 0; i < Math.min(count, blocks.length); i++) {
          const blockToDelete = blocks[blocks.length - 1 - i];
          if (blockToDelete) {
            operations.push({
              type: 'delete',
              blockId: blockToDelete.id,
            });
          }
        }

        return {
          operations,
          confidence: 0.85,
          description: `Delete last ${count} block(s)`,
        };
      }
    }

    return { operations: [], confidence: 0, description: '' };
  }

  /**
   * Parse update/edit operations
   */
  private parseUpdateOperation(message: string, blocks: any[]): ParsedOperation {
    const patterns = [
      /(?:edit|update|change|modify) (?:the )?last (?:block|paragraph)/i,
      /rewrite (?:the )?last (?:block|paragraph)/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(message)) {
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock) {
          return {
            operations: [
              {
                type: 'update',
                blockId: lastBlock.id,
                content: 'Updated content', // Will be replaced with actual content
              },
            ],
            confidence: 0.75,
            description: 'Update last block',
          };
        }
      }
    }

    return { operations: [], confidence: 0, description: '' };
  }

  /**
   * Parse move operations
   */
  private parseMoveOperation(message: string, blocks: any[]): ParsedOperation {
    const patterns = [
      /move (?:this|it|that) up/i,
      /move (?:this|it|that) down/i,
      /move (?:this|it|that) to (?:the )?(top|bottom)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const lastBlock = blocks[blocks.length - 1];
        if (!lastBlock) return { operations: [], confidence: 0, description: '' };

        const direction = message.includes('up') || message.includes('top') ? 'up' : 'down';
        const targetPosition = direction === 'up' ? 0 : blocks.length - 1;

        return {
          operations: [
            {
              type: 'move',
              blockId: lastBlock.id,
              targetPosition,
              parentId: lastBlock.parentId || null,
            },
          ],
          confidence: 0.8,
          description: `Move block ${direction}`,
        };
      }
    }

    return { operations: [], confidence: 0, description: '' };
  }

  /**
   * Parse numbered list operations
   */
  parseAddNumberedList(message: string, blocks: any[], count: number = 3): ParsedOperation {
    const lastBlock = blocks[blocks.length - 1];
    const operations: BlockOperation[] = [];

    for (let i = 0; i < count; i++) {
      operations.push({
        type: 'insert',
        afterBlockId: i === 0 ? lastBlock?.id : `temp-${i - 1}`,
        blockType: 'numbered_list',
        content: `Step ${i + 1}`,
      });
    }

    return {
      operations,
      confidence: 0.9,
      description: `Add ${count} numbered list items`,
    };
  }

  /**
   * Parse heading operations
   */
  parseAddHeading(message: string, blocks: any[], level: number = 2): ParsedOperation {
    const lastBlock = blocks[blocks.length - 1];

    return {
      operations: [
        {
          type: 'insert',
          afterBlockId: lastBlock?.id,
          blockType: `heading_${level}` as any,
          content: 'New Section',
        },
      ],
      confidence: 0.85,
      description: `Add heading level ${level}`,
    };
  }

  /**
   * Parse quote operations
   */
  parseAddQuote(message: string, blocks: any[]): ParsedOperation {
    const lastBlock = blocks[blocks.length - 1];

    return {
      operations: [
        {
          type: 'insert',
          afterBlockId: lastBlock?.id,
          blockType: 'quote',
          content: 'Important quote or callout',
        },
      ],
      confidence: 0.85,
      description: 'Add quote block',
    };
  }

  /**
   * Parse rename page operations
   */
  private parseRenamePage(message: string, blocks: any[]): ParsedOperation {
    const patterns = [
      /rename (?:this )?page to ["']?([^"']+)["']?/i,
      /change (?:page )?title to ["']?([^"']+)["']?/i,
      /set (?:page )?title to ["']?([^"']+)["']?/i,
      /title: ["']?([^"']+)["']?/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const newTitle = match[1];

        // We use a special operation type for page renaming
        // This will need to be handled by the executor
        return {
          operations: [
            {
              type: 'update_page_title' as any, // Cast to any since we're extending the type
              content: newTitle,
            }
          ],
          confidence: 0.95,
          description: `Rename page to "${newTitle}"`,
        };
      }
    }

    return { operations: [], confidence: 0, description: '' };
  }
}

// Singleton instance
export const blockOperationsParser = new BlockOperationsParser();

export default BlockOperationsParser;
