/**
 * Manages concurrent execution of tasks with a maximum concurrency limit.
 */
export class TaskConcurrencyChannel {
   /**
    * Set of promises currently being tracked.
    */
   public readonly stack: Set<Promise<void>> = new Set();
   /**
    * Maximum number of concurrent tasks allowed.
    */
   public readonly concurrency: number;
   /**
    * Create a new TaskConcurrencyChannel.
    * @param maxConcurrency The maximum number of tasks to run concurrently.
    */
   public constructor(maxConcurrency: number) {
      this.concurrency = maxConcurrency;
   }
   /**
    * Add a task to the queue. Waits if concurrency limit is reached.
    * @param task The task to execute.
    */
   public async push(task: PromiseLike<unknown>): Promise<void> {
      const promise = Promise.resolve(task).then(
         _ => void this.stack.delete(promise),
         _ => void null
      );
      this.stack.add(promise);
      if (this.stack.size >= this.concurrency) await Promise.any(this.stack);
   }
   /**
    * Get a promise that resolves when all tasks complete.
    * @returns A promise that resolves when the stack is empty.
    */
   public getAwaiter(): Promise<void> {
      return Promise.all(this.stack).then(_ => void null);
   }
}
