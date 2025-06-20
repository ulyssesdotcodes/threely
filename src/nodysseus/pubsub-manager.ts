// Pub/Sub manager for nodysseus nodes
// Handles event-based communication between nodes

export type PubSubMessage = {
  channel: string;
  data: any;
  timestamp: number;
};

export type PubSubSubscriber = {
  id: string;
  callback: (message: PubSubMessage) => void;
};

export class PubSubManager {
  private subscribers: Map<string, Set<PubSubSubscriber>> = new Map();
  private messageHistory: Map<string, PubSubMessage[]> = new Map();
  private maxHistorySize: number = 100;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, subscriber: PubSubSubscriber): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    
    this.subscribers.get(channel)!.add(subscriber);

    // Return unsubscribe function
    return () => {
      const channelSubscribers = this.subscribers.get(channel);
      if (channelSubscribers) {
        channelSubscribers.delete(subscriber);
        if (channelSubscribers.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  /**
   * Publish a message to a channel
   */
  publish(channel: string, data: any): void {
    const message: PubSubMessage = {
      channel,
      data,
      timestamp: Date.now()
    };

    // Add to history
    if (!this.messageHistory.has(channel)) {
      this.messageHistory.set(channel, []);
    }
    
    const history = this.messageHistory.get(channel)!;
    history.push(message);
    
    // Trim history if needed
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Notify subscribers
    const channelSubscribers = this.subscribers.get(channel);
    if (channelSubscribers) {
      channelSubscribers.forEach(subscriber => {
        try {
          subscriber.callback(message);
        } catch (error) {
          console.error(`Error in pub/sub subscriber ${subscriber.id}:`, error);
        }
      });
    }
  }

  /**
   * Get the latest message from a channel
   */
  getLatestMessage(channel: string): PubSubMessage | undefined {
    const history = this.messageHistory.get(channel);
    return history && history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * Get message history for a channel
   */
  getMessageHistory(channel: string, limit?: number): PubSubMessage[] {
    const history = this.messageHistory.get(channel) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Clear message history for a channel
   */
  clearHistory(channel: string): void {
    this.messageHistory.delete(channel);
  }

  /**
   * Clear all message history
   */
  clearAllHistory(): void {
    this.messageHistory.clear();
  }

  /**
   * Get subscriber count for a channel
   */
  getSubscriberCount(channel: string): number {
    return this.subscribers.get(channel)?.size || 0;
  }
}

// Global pub/sub manager instance
export const globalPubSub = new PubSubManager();