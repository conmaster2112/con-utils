import type { IInformative } from './base';

export abstract class ValueTypeValidator<T = unknown> implements IInformative {
   public abstract name: string;
   public abstract description?: string | undefined;
   public abstract coerce(input: string): T;
   public abstract isValid(input: string): boolean;
   public toString(): string {
      return this.name;
   }
}

const VALID_BOOLEAN_TYPES = new Set(['false', 'true', '0', '1']);
export class BooleanTypeValidator extends ValueTypeValidator<boolean> {
   public name: string = 'bool';
   public description?: string = 'Boolean Type (true/false)';
   public isValid(input: string): boolean {
      return VALID_BOOLEAN_TYPES.has(input.toLowerCase());
   }
   public coerce(input: string): boolean {
      input = input.toLowerCase();
      return input === 'false' || input === '0' ? false : Boolean(input);
   }
}

export class NumberTypeValidator extends ValueTypeValidator<number> {
   public name: string = 'number';
   public description: string = 'Floating point number type';
   public isValid(input: string): boolean {
      return !isNaN(Number(input));
   }
   public coerce(input: string): number {
      return Number(input);
   }
}

export class IntegerTypeValidator extends ValueTypeValidator<number> {
   public name: string = 'int';
   public description: string = 'Integer number type';
   public isValid(input: string): boolean {
      const n = Number(input);
      return Number.isInteger(n);
   }
   public coerce(input: string): number {
      return parseInt(input, 10);
   }
}

export class StringTypeValidator extends ValueTypeValidator<string> {
   public name: string = 'string';
   public description: string = 'Raw string type';
   public isValid(input: string): boolean {
      return typeof input === 'string';
   }
   public coerce(input: string): string {
      return input;
   }
}

export class StringEnumTypeValidator<T extends string[]> extends ValueTypeValidator<T[number]> {
   public name: string = 'enum';
   public description: string;
   private readonly allowedValues: Set<string>;

   public constructor(values: [...T], description?: string) {
      if (!values.length) throw new ReferenceError('Enums needs at least one possible value');
      super();
      this.allowedValues = new Set(values.map(e => e.toLowerCase()));
      this.description = description ?? `String enum with allowed values: ${values.join(', ')}`;
   }

   public isValid(input: string): boolean {
      return this.allowedValues.has(input.toLowerCase());
   }

   public coerce(input: string): T[number] {
      if (!this.isValid(input)) return this.allowedValues.values().next().value!;
      return input;
   }
   public override toString(): string {
      return this.allowedValues.values().toArray().join('|');
   }
}

export class GlobPatternTypeValidator extends ValueTypeValidator<RegExp> {
   public name: string = 'glob';
   public description: string = 'Glob pattern type (e.g. "*.txt", "file?.js")';

   public isValid(input: string): boolean {
      try {
         GlobPatternTypeValidator.globToRegExp(input);
         return true;
      } catch {
         return false;
      }
   }

   public coerce(input: string): RegExp {
      return GlobPatternTypeValidator.globToRegExp(input);
   }

   public static globToRegExp(glob: string): RegExp {
      // Escape regex special chars except for * and ?
      let regexStr = glob.replace(/([.+^=!:${}()|[\]\\])/g, '\\$1');
      // Replace * with .*
      regexStr = regexStr.replace(/\*/g, '.*');
      // Replace ? with .
      regexStr = regexStr.replace(/\?/g, '.');
      // Anchor to start/end
      regexStr = '^' + regexStr + '$';
      return new RegExp(regexStr);
   }
}
