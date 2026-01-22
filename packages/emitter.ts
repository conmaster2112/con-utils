export type EventsMap = Record<string | number, unknown>;
type Callback = (payload: unknown) => void;

abstract class Emitter<E extends EventsMap, T> {
   protected readonly target: Record<keyof E, T> = Object.create(null);
   /**
    * Dispatch an event of the given type with the provided payload.
    * @param type The event type.
    * @param payload The payload for the event.
    */
   public abstract dispatch<K extends keyof E>(type: K, payload: E[K]): void;
}

export class EventEmitter<E extends EventsMap> extends Emitter<E, Array<Callback>> {
   /**
    * Add a listener for the specified event type.
    * @param type The event type.
    * @param listener The callback to invoke when the event is dispatched.
    */
   public add<K extends keyof E>(type: K, listener: (payload: E[K]) => void): void {
      const list = this.target[type] ?? (this.target[type] = []);
      list.push(listener as Callback);
   }

   /**
    * Remove a listener for the specified event type.
    * @param type The event type.
    * @param listener The callback to remove.
    */
   public remove<K extends keyof E>(type: K, listener: (payload: E[K]) => void): void {
      const list = this.target[type];
      if (!list) return;
      let i = list.indexOf(listener as Callback);
      if (i >= 0) this.target[type] = (list.splice(i, 1), list);
   }

   /**
    * Dispatch an event of the given type with the provided payload.
    * @param type The event type.
    * @param payload The payload for the event.
    */
   public override dispatch<K extends keyof E>(type: K, payload: E[K]): void {
      const list = this.target[type];
      if (!list) return;
      for (let i = 0; i < list.length; i++) {
         const func = list[i];
         func!(payload);
      }
   }
}

/**
 * Internal event emitter that supports only a single listener per event type.
 */
export class InternalEmitter<E extends EventsMap> extends Emitter<E, Callback> {
   /**
    * Set a listener for the specified event type, replacing any existing listener.
    * @param type The event type.
    * @param listener The callback to invoke when the event is dispatched.
    */
   public set<K extends keyof E>(type: K, listener: (payload: E[K]) => void): void {
      this.target[type] = listener as Callback;
   }

   /**
    * Delete the listener for the specified event type.
    * @param type The event type.
    * @returns True if the listener was deleted, false otherwise.
    */
   public delete<K extends keyof E>(type: K): boolean {
      return delete this.target[type];
   }
   /**
    * Dispatch an event of the given type with the provided payload.
    * @param type The event type.
    * @param payload The payload for the event.
    */
   public override dispatch<K extends keyof E>(type: K, payload: E[K]): void {
      const callback = this.target[type];
      callback?.(payload);
   }
}
