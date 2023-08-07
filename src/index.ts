import { Principal } from "azle";
import { v4 as uuidv4 } from "uuid";

type Result<T, E> = { Ok: T } | { Err: E };

type Subscription = {
  id: string;
  subscriber: Principal;
  price: number; // Changed from float32 to number
  days: number; // Changed from nat16 to number
  expiryDate: number; // Changed from int32 to number
  createdAt: number;
  updatedAt: number | null; // Changed from Opt<nat64> to number | null
};

type SubscriptionPayload = {
  price: number;
  days: number;
};

let subscriptionOwner: Principal;
let initialized: boolean = false;

export function init(): Result<string, string> {
  if (!initialized) {
    subscriptionOwner = ic.caller();
    initialized = true;
  }
  return { Ok: "initialized" };
}

const subscriptionExpiry: number = 2592000; // Changed from nat16 to number

const subscriptionStorage = new Map<string, Subscription>();

export function createSubscription(payload: SubscriptionPayload): Result<Subscription, string> {
  const subscribe: Subscription = {
    id: uuidv4(),
    subscriber: ic.caller(),
    createdAt: ic.time(),
    expiryDate: ic.time() + subscriptionExpiry,
    updatedAt: null,
    ...payload,
  };

  subscriptionStorage.set(subscribe.id, subscribe);
  return { Ok: subscribe };
}

export function getSubscription(id: string): Result<Subscription, string> {
  const subscription = subscriptionStorage.get(id);
  if (subscription) {
    if (subscription.subscriber.toString() === ic.caller().toString()) {
      return { Ok: subscription };
    }
    return { Err: "Not authorized subscriber" };
  }
  return { Err: `Subscription id=${id} not found` };
}

export function getSubscriptionsBySubscriber(subscriber: Principal): Result<Subscription[], string> {
  const subscriptions = Array.from(subscriptionStorage.values()).filter(
    (sub) => sub.subscriber.toString() === subscriber.toString()
  );
  return { Ok: subscriptions };
}

export function getAllSubscriptions(): Result<Subscription[], string> {
  const subscriptions = Array.from(subscriptionStorage.values());
  return { Ok: subscriptions };
}

export function cancelSubscription(id: string): Result<Subscription, string> {
  const subscription = subscriptionStorage.get(id);
  if (subscription) {
    if (subscription.subscriber.toString() !== ic.caller().toString()) {
      return { Err: "Not authorized subscriber" };
    }
    subscriptionStorage.delete(id);
    return { Ok: subscription };
  }
  return { Err: `Subscription cancellation id=${id} failed` };
}

export function renewSubscription(id: string, price: number): Result<Subscription, string> {
  const subscription = subscriptionStorage.get(id);
  if (subscription) {
    if (subscription.subscriber.toString() !== ic.caller().toString()) {
      return { Err: "Not authorized subscriber" };
    }
    const updateSubscription: Subscription = {
      ...subscription,
      price: subscription.price + price,
      expiryDate: subscription.expiryDate + subscriptionExpiry,
    };
    subscriptionStorage.set(updateSubscription.id, updateSubscription);
    return { Ok: updateSubscription };
  }
  return { Err: `Subscription id=${id} not found` };
}

export function withdrawFunds(id: string): Result<Subscription, string> {
  const subscription = subscriptionStorage.get(id);
  if (subscription) {
    if (subscriptionOwner.toString() !== ic.caller().toString()) {
      return { Err: "Not owner" };
    }
    const updateSubscription: Subscription = {
      ...subscription,
      price: 0,
    };
    subscriptionStorage.set(updateSubscription.id, updateSubscription);
    return { Ok: updateSubscription };
  }
  return { Err: `Subscription id=${id} not found` };
}

// Note: The workaround for UUID generation using crypto.getRandomValues is not required anymore, as we are using the "uuid" package directly.
