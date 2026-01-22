import { describe, it, expect, vi } from 'vitest';

import { EventEmitter, InternalEmitter, type EventsMap } from './emitter';

describe('EventEmitter', () => {
   interface TestEvents extends EventsMap {
      event1: string;
      event2: number;
   }

   it('should add and dispatch events', () => {
      const emitter = new EventEmitter<TestEvents>();
      const callback = vi.fn();

      emitter.add('event1', callback);
      emitter.dispatch('event1', 'test payload');

      expect(callback).toHaveBeenCalledWith('test payload');
   });

   it('should remove listeners', () => {
      const emitter = new EventEmitter<TestEvents>();
      const callback = vi.fn();

      emitter.add('event1', callback);
      emitter.remove('event1', callback);
      emitter.dispatch('event1', 'test payload');

      expect(callback).not.toHaveBeenCalled();
   });
});

describe('InternalEmitter', () => {
   interface TestEvents extends EventsMap {
      event1: string;
      event2: number;
   }

   it('should set and dispatch events', () => {
      const emitter = new InternalEmitter<TestEvents>();
      const callback = vi.fn();

      emitter.set('event1', callback);
      emitter.dispatch('event1', 'test payload');

      expect(callback).toHaveBeenCalledWith('test payload');
   });

   it('should delete listeners', () => {
      const emitter = new InternalEmitter<TestEvents>();
      const callback = vi.fn();

      emitter.set('event1', callback);
      emitter.delete('event1');
      emitter.dispatch('event1', 'test payload');

      expect(callback).not.toHaveBeenCalled();
   });
});
