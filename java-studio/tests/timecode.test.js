import test from "node:test";
import assert from "node:assert/strict";
import {
  timecodeParts,
  timecodeSeconds,
  formatTimecode,
} from "../src/timecode.js";
import { audioSourceTime } from "../src/animationAudioModel.js";
test("timecode separates seconds from milliseconds without decimal-locale ambiguity", () => {
  assert.equal(
    timecodeSeconds({
      hours: "00",
      minutes: "00",
      seconds: "33",
      milliseconds: "000",
    }),
    33,
  );
  assert.equal(
    timecodeSeconds({
      hours: "00",
      minutes: "00",
      seconds: "00",
      milliseconds: "330",
    }),
    0.33,
  );
  assert.deepEqual(timecodeParts(0.33), {
    hours: "00",
    minutes: "00",
    seconds: "00",
    milliseconds: "330",
  });
  assert.equal(
    timecodeSeconds({
      hours: "00",
      minutes: "00",
      seconds: "0,33",
      milliseconds: "000",
    }),
    null,
  );
  assert.equal(
    timecodeSeconds({
      hours: "00",
      minutes: "60",
      seconds: "00",
      milliseconds: "000",
    }),
    null,
  );
  assert.equal(
    timecodeSeconds({
      hours: "01",
      minutes: "02",
      seconds: "33",
      milliseconds: "125",
    }),
    3753.125,
  );
});
test("timecode rollover, fractional precision and excerpt endpoints agree", () => {
  assert.equal(formatTimecode(59.9996), "00:01:00.000");
  assert.equal(formatTimecode(3633.125), "01:00:33.125");
  assert.equal(formatTimecode(86400), "24:00:00.000");
  assert.equal(formatTimecode(Infinity), "00:00:00.000");
  const start = timecodeSeconds({
    hours: "00",
    minutes: "00",
    seconds: "33",
    milliseconds: "125",
  });
  assert.equal(
    formatTimecode(audioSourceTime({ start }, 0, 33)),
    "00:00:33.125",
  );
  assert.equal(
    formatTimecode(audioSourceTime({ start }, 33, 33)),
    "00:01:06.125",
  );
});

test("frame timecodes use frame counts, preserve cumulative chapter starts and reject overflow", () => {
  const parts = { hours: "00", minutes: "00", seconds: "21", frames: "15" };
  assert.equal(timecodeSeconds(parts, 30), 21.5);
  assert.equal(formatTimecode(21.5, 30), "00:00:21:15");
  assert.equal(timecodeSeconds({ ...parts, frames: "30" }, 30), null);
  assert.equal(formatTimecode(59 + 29 / 30, 30), "00:00:59:29");
  assert.equal(formatTimecode(60, 30), "00:01:00:00");
  for (const fps of [24, 30, 60]) {
    for (const frames of [0, 1, fps - 1, fps, fps * 54 + 7]) {
      assert.equal(
        timecodeSeconds(timecodeParts(frames / fps, fps), fps),
        frames / fps,
      );
    }
  }
  assert.deepEqual(
    [0, 21, 21 + 33, 21 + 33 + 31].map((t) => formatTimecode(t, 30)),
    ["00:00:00:00", "00:00:21:00", "00:00:54:00", "00:01:25:00"],
  );
});
