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
