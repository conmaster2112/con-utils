import { describe, it, expect } from 'vitest';

import {
   BooleanTypeValidator,
   NumberTypeValidator,
   IntegerTypeValidator,
   StringTypeValidator,
   StringEnumTypeValidator,
   GlobPatternTypeValidator,
} from './value-type';

describe('BooleanTypeValidator', () => {
   const validator = new BooleanTypeValidator();

   it('should validate boolean strings', () => {
      expect(validator.isValid('true')).toBe(true);
      expect(validator.isValid('false')).toBe(true);
      expect(validator.isValid('1')).toBe(true);
      expect(validator.isValid('0')).toBe(true);
      expect(validator.isValid('yes')).toBe(false);
   });

   it('should coerce boolean strings', () => {
      expect(validator.coerce('true')).toBe(true);
      expect(validator.coerce('false')).toBe(false);
      expect(validator.coerce('1')).toBe(true);
      expect(validator.coerce('0')).toBe(false);
   });
});

describe('NumberTypeValidator', () => {
   const validator = new NumberTypeValidator();

   it('should validate numbers', () => {
      expect(validator.isValid('123')).toBe(true);
      expect(validator.isValid('123.45')).toBe(true);
      expect(validator.isValid('abc')).toBe(false);
   });

   it('should coerce numbers', () => {
      expect(validator.coerce('123')).toBe(123);
      expect(validator.coerce('123.45')).toBe(123.45);
   });
});

describe('IntegerTypeValidator', () => {
   const validator = new IntegerTypeValidator();

   it('should validate integers', () => {
      expect(validator.isValid('123')).toBe(true);
      expect(validator.isValid('123.45')).toBe(false);
      expect(validator.isValid('abc')).toBe(false);
   });

   it('should coerce integers', () => {
      expect(validator.coerce('123')).toBe(123);
   });
});

describe('StringTypeValidator', () => {
   const validator = new StringTypeValidator();

   it('should validate strings', () => {
      expect(validator.isValid('hello')).toBe(true);
   });

   it('should coerce strings', () => {
      expect(validator.coerce('hello')).toBe('hello');
   });
});

describe('StringEnumTypeValidator', () => {
   const validator = new StringEnumTypeValidator(['red', 'green', 'blue']);

   it('should validate enum values', () => {
      expect(validator.isValid('red')).toBe(true);
      expect(validator.isValid('yellow')).toBe(false);
   });

   it('should coerce enum values', () => {
      expect(validator.coerce('red')).toBe('red');
      expect(validator.coerce('yellow')).toBe('red'); // Defaults to first value
   });
});

describe('GlobPatternTypeValidator', () => {
   const validator = new GlobPatternTypeValidator();

   it('should validate glob patterns', () => {
      expect(validator.isValid('*.txt')).toBe(true);
      expect(validator.isValid('file?.js')).toBe(true);
   });

   it('should coerce glob patterns to RegExp', () => {
      expect(validator.coerce('*.txt')).toEqual(/^.*\.txt$/);
      expect(validator.coerce('file?.js')).toEqual(/^file.\.js$/);
   });
});
