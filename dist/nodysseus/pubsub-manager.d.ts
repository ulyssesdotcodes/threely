export type PubSubMessage = {
    channel: string;
    data: any;
    timestamp: number;
};
export type PubSubSubscriber = {
    id: string;
    callback: (message: PubSubMessage) => void;
};
export declare class PubSubManager {
    private subscribers;
    private messageHistory;
    private maxHistorySize;
    constructor(maxHistorySize?: number);
    /**
     * Subscribe to a channel
     */
    subscribe(channel: string, subscriber: PubSubSubscriber): () => void;
    /**
     * Publish a message to a channel
     */
    publish(channel: string, data: any): void;
    /**
     * Get the latest message from a channel
     */
    getLatestMessage(channel: string): PubSubMessage | undefined;
    /**
     * Get message history for a channel
     */
    getMessageHistory(channel: string, limit?: number): PubSubMessage[];
    /**
     * Get all active channels
     */
    getActiveChannels(): string[];
    /**
     * Clear message history for a channel
     */
    clearHistory(channel: string): void;
    /**
     * Clear all message history
     */
    clearAllHistory(): void;
    /**
     * Get subscriber count for a channel
     */
    getSubscriberCount(channel: string): number;
}
export declare const globalPubSub: PubSubManager;
