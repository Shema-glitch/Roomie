export interface BackHandlerEntry {
  id: string;
  /** Higher priority runs first (modals = 100, flows/auth = 50, tabs = 10). */
  priority: number;
  handler: () => boolean | void;
}

class NavigationStackManager {
  private entries: BackHandlerEntry[] = [];
  private listeners = new Set<(hasEntries: boolean) => void>();
  private counter = 0;

  register(priority: number, handler: () => boolean | void): () => void {
    const id = `nav_${++this.counter}`;
    this.entries.push({ id, priority, handler });
    this.notify();

    return () => {
      const idx = this.entries.findIndex((e) => e.id === id);
      if (idx !== -1) {
        this.entries.splice(idx, 1);
        this.notify();
      }
    };
  }

  /**
   * Executes the highest-priority (and most recently pushed) back handler.
   * Returns true if an in-app navigation step handled the back action,
   * or false if the app is at root and should exit/minimize.
   */
  handleBack(): boolean {
    if (this.entries.length === 0) return false;

    // Pick highest priority; ties break by LIFO (latest index)
    let bestIdx = -1;
    let bestPriority = -Infinity;
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].priority >= bestPriority) {
        bestPriority = this.entries[i].priority;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) return false;

    const entry = this.entries[bestIdx];
    const result = entry.handler();
    // Returning false explicitly means "I didn't handle it" (normally void/true handles it)
    return result !== false;
  }

  hasEntries(): boolean {
    return this.entries.length > 0;
  }

  size(): number {
    return this.entries.length;
  }

  subscribe(listener: (hasEntries: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.hasEntries());
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear(): void {
    this.entries = [];
    this.notify();
  }

  private notify(): void {
    const has = this.hasEntries();
    this.listeners.forEach((fn) => fn(has));
  }
}

export const navigationStack = new NavigationStackManager();
