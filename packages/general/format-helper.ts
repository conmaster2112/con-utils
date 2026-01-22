export class FormatCode {
   private prefixes: number[];
   private suffixes: number[];
   protected constructor(prefix: number[], suffix: number[]) {
      this.prefixes = prefix;
      this.suffixes = suffix;
   }
   public static create(format: number, reset?: number): FormatCode {
      return new FormatCode([format], reset === undefined ? [] : [reset]);
   }
   public static createForegroundRGB(red: number, green: number, blue: number): FormatCode {
      return new FormatCode([38, 2, red, green, blue], [39]);
   }
   public static createBackgroundRGB(red: number, green: number, blue: number): FormatCode {
      return new FormatCode([48, 2, red, green, blue], [49]);
   }
   public get prefix(): string {
      return this.compile(this.prefixes);
   }
   public get suffix(): string {
      return this.compile(this.suffixes);
   }
   private compile(format: number[]): string {
      return `\x1b[${format.join(';')}m`;
   }
   public merge(format: FormatCode): FormatCode {
      const prefixes: number[] = [...this.prefixes];
      pushUnique(prefixes, ...format.prefixes);
      const suffixes: number[] = [...this.suffixes];
      pushUnique(suffixes, ...this.suffixes);
      return new FormatCode(this.prefixes, this.suffixes);
   }
   public get wrap(): (raw: string) => string {
      return raw => `${this.prefix}${raw}${this.suffix}`;
   }
   public get format(): (template: TemplateStringsArray, ...args: unknown[]) => string {
      return (template, ...args) =>
         this.wrap(template.reduce((acc, part, i) => acc + this.wrap(part) + (args[i] ?? ''), ''));
   }
}
export const rgb = (r: number, g: number, b: number): ((str: string) => string) =>
   FormatCode.createForegroundRGB(r, g, b).wrap;

export const CREATE_ACCENT: (
   common: FormatCode,
   accent: FormatCode
) => (template: TemplateStringsArray, ...args: unknown[]) => string = (c, a) => {
   const ACCENT_COLOR = a.wrap;
   const { prefix, suffix } = c;
   return (template: TemplateStringsArray, ...args: unknown[]): string => {
      return (
         prefix +
         template.reduce((acc, part, i) => {
            return acc + ACCENT_COLOR(args[i - 1] + '') + prefix + part;
         }) +
         suffix
      );
   };
};
export const DIM: FormatCode = FormatCode.create(2, 22);
export const ITALIC: FormatCode = FormatCode.create(3, 23);
export const UNDERLINE: FormatCode = FormatCode.create(4, 24);
export const INVERSE: FormatCode = FormatCode.create(7, 27);
export const CENSOR: FormatCode = FormatCode.create(8, 28);
export const CANCELED: FormatCode = FormatCode.create(9, 29);

export const SOFT_RESET: string = [
   //0,  // Hard Reset / Normal (all attributes off)
   21, // Bold off or Double Underline
   22, // Normal color or intensity
   23, // Not italic, not Fraktur
   24, // Underline off
   25, // Blink off
   27, // Inverse off
   28, // Reveal (conceal off)
   29, // Not crossed out
   39, // Default foreground color
   49, // Default background color
   54, // Not framed or encircled
   55, // Not overline
   65, // Ideogram attributes off
].join(';');

/**
 * Pushes value into array if it's not already present.
 * Returns true if inserted, false if already existed.
 */
function pushUnique<T>(arr: T[], ...values: T[]): void {
   for (const value of values) {
      if (arr.includes(value)) continue;
      arr.push(value);
   }
}

export class Format {
   /**
    * Wraps words in a string to fit within a specified print length.
    * @param text The input string to wrap.
    * @param printLength The maximum length of each line.
    * @returns A generator yielding wrapped lines.
    */
   public static *wrapWords(text: string, printLength: number): Generator<string> {
      const words = text.split(/\s+/);
      const currentLineWords: string[] = [];
      let currentLength = 0;

      for (const word of words) {
         const wordLength = word.length;
         if (
            currentLength + wordLength + currentLineWords.length > printLength &&
            currentLineWords.length > 0
         ) {
            yield currentLineWords.join(' ');
            currentLineWords.length = 0; // Clear the array
            currentLength = 0;
         }
         currentLineWords.push(word);
         currentLength += wordLength;
      }

      if (currentLineWords.length > 0) yield currentLineWords.join(' ');
   }
}
