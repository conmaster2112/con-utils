import type { IInformative } from './base';

import { ValueTypeValidator } from './value-type';

/**
 * Represents a command-line argument with validation and type coercion.
 * @template T - The type of the argument value after validation
 */
export class ArgumentLike<T = string> implements IInformative {
   public readonly name: string;
   public readonly validator: ValueTypeValidator<T>;
   public description?: string | undefined;
   public defaultValue: T | null;

   constructor(
      name: string,
      opts: { validator: ValueTypeValidator<T>; defaultValue: T | null; description?: string | undefined }
   ) {
      this.name = name.toLowerCase();
      this.validator = opts.validator;
      this.description = opts?.description ?? undefined;
      this.defaultValue = opts.defaultValue;
   }

   /**
    * Determines if this argument is required (has no default value).
    * @returns True if the argument must be provided
    */
   public isRequired(): boolean {
      return this.defaultValue === null;
   }

   /**
    * Validates and coerces a string value to the argument's type.
    * @param value - The string value to enforce
    * @returns The coerced value of type T
    * @throws {Error} If the value is invalid or required argument is missing
    */
   public enforce(value: string | null): T {
      if (value === undefined || value === null)
         if (this.defaultValue === null)
            throw new Error("Following argument is required and can't be omitted! " + this.name);
         else return this.defaultValue;
      if (!this.validator.isValid(value))
         throw new Error('Following argument has not valid value! ' + this.name + ' -> ' + value);
      return this.validator.coerce(value);
   }

   /**
    * Returns a string representation of this argument for help text.
    * @returns Formatted string like `<name:type>` or `[name:type]`
    */
   public toString(): string {
      const $ = `${this.name}:${this.validator.toString()}`;
      return this.isRequired() ? `<${$}>` : `[${$}]`;
   }
}
