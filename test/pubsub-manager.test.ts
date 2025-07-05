// Tests for the pub/sub manager

import { PubSubManager, globalPubSub } from "../src/nodysseus/pubsub-manager";

describe("PubSubManager", () => {
  let pubsub: PubSubManager;

  beforeEach(() => {
    pubsub = new PubSubManager();
  });

  test("should subscribe and publish messages", () => {
    const messages: any[] = [];

    const unsubscribe = pubsub.subscribe("test-channel", {
      id: "test-subscriber",
      callback: (message) => {
        messages.push(message);
      },
    });

    pubsub.publish("test-channel", { hello: "world" });
    pubsub.publish("test-channel", { foo: "bar" });

    expect(messages).toHaveLength(2);
    expect(messages[0].data).toEqual({ hello: "world" });
    expect(messages[1].data).toEqual({ foo: "bar" });
    expect(messages[0].channel).toBe("test-channel");
    expect(messages[1].channel).toBe("test-channel");

    unsubscribe();
  });

  test("should handle multiple subscribers", () => {
    const messages1: any[] = [];
    const messages2: any[] = [];

    const unsubscribe1 = pubsub.subscribe("test-channel", {
      id: "subscriber1",
      callback: (message) => messages1.push(message),
    });

    const unsubscribe2 = pubsub.subscribe("test-channel", {
      id: "subscriber2",
      callback: (message) => messages2.push(message),
    });

    pubsub.publish("test-channel", "test-data");

    expect(messages1).toHaveLength(1);
    expect(messages2).toHaveLength(1);
    expect(messages1[0].data).toBe("test-data");
    expect(messages2[0].data).toBe("test-data");

    unsubscribe1();
    unsubscribe2();
  });

  test("should unsubscribe correctly", () => {
    const messages: any[] = [];

    const unsubscribe = pubsub.subscribe("test-channel", {
      id: "test-subscriber",
      callback: (message) => messages.push(message),
    });

    pubsub.publish("test-channel", "before-unsubscribe");
    unsubscribe();
    pubsub.publish("test-channel", "after-unsubscribe");

    expect(messages).toHaveLength(1);
    expect(messages[0].data).toBe("before-unsubscribe");
  });

  test("should get latest message", () => {
    pubsub.publish("test-channel", "first");
    pubsub.publish("test-channel", "second");

    const latest = pubsub.getLatestMessage("test-channel");
    expect(latest?.data).toBe("second");
  });

  test("should get message history", () => {
    pubsub.publish("test-channel", "msg1");
    pubsub.publish("test-channel", "msg2");
    pubsub.publish("test-channel", "msg3");

    const history = pubsub.getMessageHistory("test-channel");
    expect(history).toHaveLength(3);
    expect(history.map((m) => m.data)).toEqual(["msg1", "msg2", "msg3"]);

    const limitedHistory = pubsub.getMessageHistory("test-channel", 2);
    expect(limitedHistory).toHaveLength(2);
    expect(limitedHistory.map((m) => m.data)).toEqual(["msg2", "msg3"]);
  });

  test("should return active channels", () => {
    expect(pubsub.getActiveChannels()).toEqual([]);

    const unsubscribe1 = pubsub.subscribe("channel1", {
      id: "sub1",
      callback: () => {},
    });

    const unsubscribe2 = pubsub.subscribe("channel2", {
      id: "sub2",
      callback: () => {},
    });

    expect(pubsub.getActiveChannels().sort()).toEqual(["channel1", "channel2"]);

    unsubscribe1();
    expect(pubsub.getActiveChannels()).toEqual(["channel2"]);

    unsubscribe2();
    expect(pubsub.getActiveChannels()).toEqual([]);
  });

  test("should get subscriber count", () => {
    expect(pubsub.getSubscriberCount("test-channel")).toBe(0);

    const unsubscribe1 = pubsub.subscribe("test-channel", {
      id: "sub1",
      callback: () => {},
    });

    expect(pubsub.getSubscriberCount("test-channel")).toBe(1);

    const unsubscribe2 = pubsub.subscribe("test-channel", {
      id: "sub2",
      callback: () => {},
    });

    expect(pubsub.getSubscriberCount("test-channel")).toBe(2);

    unsubscribe1();
    expect(pubsub.getSubscriberCount("test-channel")).toBe(1);

    unsubscribe2();
    expect(pubsub.getSubscriberCount("test-channel")).toBe(0);
  });

  test("should handle errors in subscribers gracefully", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    pubsub.subscribe("test-channel", {
      id: "error-subscriber",
      callback: () => {
        throw new Error("Test error");
      },
    });

    // Should not throw
    expect(() => {
      pubsub.publish("test-channel", "test-data");
    }).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in pub/sub subscriber error-subscriber:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});

describe("globalPubSub", () => {
  test("should be a singleton instance", () => {
    expect(globalPubSub).toBeInstanceOf(PubSubManager);
  });
});
