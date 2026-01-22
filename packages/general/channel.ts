import { EventEmitter, type EventsMap, InternalEmitter } from './emitter';

export abstract class Channel<I extends EventsMap, O extends EventsMap> {
   public readonly outgoing: InternalEmitter<O> = new InternalEmitter();
   public readonly incoming: EventEmitter<I> = new EventEmitter();
}
