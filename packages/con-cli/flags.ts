import { ArgumentLike } from './arguments';
import { BooleanTypeValidator, ValueTypeValidator } from './value-type';

/**
 * Represents a named flag that accepts a value.
 * @template T - The type of the flag value
 */
export class ValueFlag<T = unknown> extends ArgumentLike<T> {
   public readonly long?: string | undefined;
   public readonly short?: string | undefined;
   protected isValueFlag: boolean;

   public constructor(
      name: string,
      opts: {
         validator: ValueTypeValidator<T>;
         defaultValue: T | null;
         description?: string | undefined;
         long?: string | undefined;
         short?: string | undefined;
      }
   ) {
      super(name, opts);
      this.long = opts.long?.toLowerCase();
      this.short = opts.short?.toLowerCase();
      this.isValueFlag = true;
   }

   /**
    * Determines if this flag accepts a value.
    * @returns True if this flag is value-based
    */
   public isValueBased(): boolean {
      return this.isValueFlag;
   }

   /**
    * Returns a string representation of this flag for help text.
    * @returns Formatted string like `--long, -s`
    */
   public override toString(): string {
      return [this.long && `--${this.long}`, this.short && `-${this.short}`].filter(Boolean).join(', ');
   }
}

/**
 * Represents a boolean flag (presence indicator).
 */
export class Flag extends ValueFlag<boolean> {
   public constructor(name: string, opts?: { description?: string; long?: string; short?: string }) {
      const { description, long, short } = opts ?? {};
      super(name, { validator: new BooleanTypeValidator(), defaultValue: false, description, long, short });
      this.isValueFlag = false;
   }
}

/**
 * A collection of flags with lookup capabilities by name, long form, or short form.
 */
export class FlagsGroup {
   protected readonly flags: Set<ValueFlag<unknown>> = new Set<ValueFlag<unknown>>();
   protected readonly map: Map<string, ValueFlag<unknown>> = new Map<string, ValueFlag<unknown>>();
   protected base: FlagsGroup | null = null;
   public constructor(base?: FlagsGroup | null) {
      this.base = base ?? null;
   }

   /**
    * Checks if a flag exists in this group or inherited from base groups.
    * @param valueFlag - The flag to check for
    * @returns True if the flag is registered
    */
   public hasFlag(valueFlag: ValueFlag<unknown>): boolean {
      return this.hasOwnFlag(valueFlag) || (this.base?.hasFlag(valueFlag) ?? false);
   }

   /**
    * Checks if a flag exists directly in this group (not inherited).
    * @param valueFlag - The flag to check for
    * @returns True if the flag is registered in this group
    */
   public hasOwnFlag(valueFlag: ValueFlag<unknown>): boolean {
      return this.flags.has(valueFlag);
   }

   /**
    * Adds flags and registers their searchable keys.
    * @param flags - The flags to add
    * @returns This group for chaining
    */
   public add(...flags: ValueFlag<unknown>[]): this {
      for (const flag of flags) {
         this.flags.add(flag);
         this.setGeneralInternal(flag.name, flag);
         if (flag.long) this.setLongInternal(flag.long, flag);
         if (flag.short) this.setShortInternal(flag.short, flag);
      }
      return this;
   }

   /**
    * Adds a short alias for an existing flag.
    * @param flag - The flag to add an alias for
    * @param short - The short form alias
    * @returns This group for chaining
    */
   public addShortAlias(flag: ValueFlag<unknown>, short: string): this {
      this.flags.add(flag);
      this.setGeneralInternal(flag.name, flag);
      this.setShortInternal(short, flag);
      return this;
   }

   /**
    * Adds a long alias for an existing flag.
    * @param flag - The flag to add an alias for
    * @param long - The long form alias
    * @returns This group for chaining
    */
   public addLongAlias(flag: ValueFlag<unknown>, long: string): this {
      this.flags.add(flag);
      this.setGeneralInternal(flag.name, flag);
      this.setLongInternal(long, flag);
      return this;
   }
   protected setLongInternal(key: string, flag: ValueFlag<unknown>): void {
      this.map.set(`long:${key}`, flag);
   }
   protected setShortInternal(key: string, flag: ValueFlag<unknown>): void {
      this.map.set(`short:${key}`, flag);
   }
   protected setGeneralInternal(key: string, flag: ValueFlag<unknown>): void {
      this.map.set(`flag:${key}`, flag);
   }
   public getLong(key: string): ValueFlag<unknown> | null {
      return this.map.get(`long:${key}`) ?? this.base?.getLong(key) ?? null;
   }

   /**
    * Retrieves a flag by its short form name.
    * @param key - The short form name
    * @returns The flag or null if not found
    */
   public getShort(key: string): ValueFlag<unknown> | null {
      return this.map.get(`short:${key}`) ?? this.base?.getShort(key) ?? null;
   }

   /**
    * Retrieves a flag by its primary name.
    * @param name - The flag name
    * @returns The flag or null if not found
    */
   public getByName(name: string): ValueFlag<unknown> | null {
      return this.map.get(`flag:${name}`) ?? this.base?.getByName(name) ?? null;
   }

   /**
    * Gets all flags directly registered in this group.
    * @returns A read-only set of all flags
    */
   public getAll(): ReadonlySet<ValueFlag<unknown>> {
      return this.flags;
   }
}
