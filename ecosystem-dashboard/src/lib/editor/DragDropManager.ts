/**
 * DragDropManager - Notion-style drag and drop for blocks
 * Handles drag events, drop zones, and visual feedback
 */

export interface DragState {
  isDragging: boolean;
  draggedBlockId: string | null;
  dragOverBlockId: string | null;
  dropPosition: 'before' | 'after' | null;
}

export class DragDropManager {
  private dragState: DragState = {
    isDragging: false,
    draggedBlockId: null,
    dragOverBlockId: null,
    dropPosition: null,
  };

  private listeners: Set<(state: DragState) => void> = new Set();

  // Subscribe to drag state changes
  subscribe(listener: (state: DragState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  private notify() {
    this.listeners.forEach(listener => listener({ ...this.dragState }));
  }

  // Start dragging
  onDragStart(blockId: string, event: React.DragEvent) {
    this.dragState.isDragging = true;
    this.dragState.draggedBlockId = blockId;
    
    // Set drag data
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', blockId);
    
    // Add dragging class for styling
    const element = event.currentTarget as HTMLElement;
    setTimeout(() => {
      element.style.opacity = '0.5';
    }, 0);

    this.notify();
  }

  // Drag over another block
  onDragOver(blockId: string, event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const mouseY = event.clientY;

    // Determine drop position based on mouse position
    if (mouseY < midpoint) {
      this.dragState.dropPosition = 'before';
    } else {
      this.dragState.dropPosition = 'after';
    }

    this.dragState.dragOverBlockId = blockId;
    this.notify();
  }

  // Drag leave
  onDragLeave(blockId: string) {
    if (this.dragState.dragOverBlockId === blockId) {
      this.dragState.dragOverBlockId = null;
      this.dragState.dropPosition = null;
      this.notify();
    }
  }

  // Drop
  onDrop(blockId: string, event: React.DragEvent): { draggedId: string; targetId: string; position: 'before' | 'after' } | null {
    event.preventDefault();

    const draggedId = this.dragState.draggedBlockId;
    const targetId = blockId;
    const position = this.dragState.dropPosition || 'after';

    // Reset drag state
    this.dragState.isDragging = false;
    this.dragState.draggedBlockId = null;
    this.dragState.dragOverBlockId = null;
    this.dragState.dropPosition = null;

    this.notify();

    if (!draggedId || draggedId === targetId) {
      return null;
    }

    return { draggedId, targetId, position };
  }

  // Drag end
  onDragEnd(event: React.DragEvent) {
    const element = event.currentTarget as HTMLElement;
    element.style.opacity = '1';

    this.dragState.isDragging = false;
    this.dragState.draggedBlockId = null;
    this.dragState.dragOverBlockId = null;
    this.dragState.dropPosition = null;

    this.notify();
  }

  // Get current state
  getState(): DragState {
    return { ...this.dragState };
  }

  // Check if block is being dragged
  isBlockDragging(blockId: string): boolean {
    return this.dragState.draggedBlockId === blockId;
  }

  // Check if block is drop target
  isDropTarget(blockId: string): boolean {
    return this.dragState.dragOverBlockId === blockId;
  }

  // Get drop position for block
  getDropPosition(blockId: string): 'before' | 'after' | null {
    return this.dragState.dragOverBlockId === blockId ? this.dragState.dropPosition : null;
  }
}

export default DragDropManager;
