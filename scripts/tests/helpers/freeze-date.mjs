const OriginalDate = Date;
const fixedNow = process.env.ONEAI_TEST_NOW;

if (fixedNow) {
  class FixedDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedNow);
        return;
      }

      super(...args);
    }

    static now() {
      return new OriginalDate(fixedNow).getTime();
    }

    static parse(value) {
      return OriginalDate.parse(value);
    }

    static UTC(...args) {
      return OriginalDate.UTC(...args);
    }
  }

  globalThis.Date = FixedDate;
}
