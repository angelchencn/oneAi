import test from "node:test";
import assert from "node:assert/strict";

test("china-time resolves GMT+8 dates and UTC windows consistently", async () => {
  const {
    getChinaDateStamp,
    formatChinaDisplayDate,
    buildChinaDayWindow,
  } = await import("../lib/china-time.js");

  const utcMoment = new Date("2026-03-28T18:30:00.000Z");

  assert.equal(getChinaDateStamp(utcMoment), "2026-03-29");
  assert.equal(formatChinaDisplayDate(utcMoment), "2026年3月29日");
  assert.equal(formatChinaDisplayDate("2026-03-29"), "2026年3月29日");
  assert.deepEqual(buildChinaDayWindow("2026-03-29"), {
    startIso: "2026-03-28T16:00:00.000Z",
    endIso: "2026-03-29T16:00:00.000Z",
  });
});
