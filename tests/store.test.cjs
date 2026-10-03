const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Store } = require("../src/store.cjs");
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "symptopage-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "records.json");
  return { file, store: new Store(file) };
}
const visit = {
  specialist: "cardiologist",
  date: "2026-11-19",
  reason: "My appointment",
};
test("empty first launch and local persisted language/visit without examples", (t) => {
  const { file, store } = setup(t);
  assert.equal(store.read().visit, null);
  assert.deepEqual(store.read().events, []);
  store.apply("visit", visit);
  store.apply("language", "pl");
  const reopened = new Store(file).read();
  assert.equal(reopened.visit.reason, visit.reason);
  assert.equal(reopened.language, "pl");
  assert.deepEqual(reopened.answers, []);
  assert.deepEqual(reopened.events, []);
});
test("check-in replaces same day and symptom but never invents symptom events", (t) => {
  const { store } = setup(t);
  store.apply("visit", visit);
  const now = new Date(2026, 9, 3, 14);
  store.apply(
    "checkIn",
    { symptom: "palpitations", frequency: "none", note: "" },
    now,
  );
  store.apply(
    "checkIn",
    { symptom: "palpitations", frequency: "several", note: "note" },
    now,
  );
  store.apply(
    "checkIn",
    { symptom: "fatigue", frequency: "once", note: "" },
    now,
  );
  assert.equal(store.read().answers.length, 2);
  assert.equal(
    store.read().answers.find((a) => a.symptom === "palpitations").frequency,
    "several",
  );
  assert.equal(store.read().events.length, 0);
});
test("event edits preserve captured time, visit edits preserve associations, delete persists", (t) => {
  const { store, file } = setup(t);
  store.apply("visit", visit);
  const stamp = "2026-01-01T10:01:00.000Z";
  store.apply("event", {
    symptom: "palpitations",
    timestamp: stamp,
    note: "First",
  });
  const original = store.read().events[0];
  store.apply("event", {
    id: original.id,
    symptom: "fatigue",
    timestamp: "2000-01-01",
    note: "Edited",
  });
  store.apply("visit", { ...visit, specialist: "neurologist" });
  const reopened = new Store(file);
  assert.equal(reopened.read().events[0].timestamp, stamp);
  assert.equal(reopened.read().events[0].visitID, reopened.read().visit.id);
  reopened.apply("deleteEvent", original.id);
  assert.deepEqual(new Store(file).read().events, []);
});
test("malformed and unknown version stores are preserved", (t) => {
  const { file } = setup(t);
  for (const raw of ["broken", '{"version":99}']) {
    fs.writeFileSync(file, raw);
    assert.throws(() => new Store(file), /STORE_UNREADABLE/);
    assert.equal(fs.readFileSync(file, "utf8"), raw);
  }
});
test("invalid input never overwrites committed data", (t) => {
  const { store, file } = setup(t);
  store.apply("visit", visit);
  const before = fs.readFileSync(file, "utf8");
  for (const value of [
    { ...visit, reason: " " },
    { ...visit, date: "2026-02-30" },
    { ...visit, specialist: "fake" },
  ])
    assert.throws(() => store.apply("visit", value));
  assert.throws(() =>
    store.apply("event", { id: "missing", symptom: "fatigue", note: "" }),
  );
  assert.equal(fs.readFileSync(file, "utf8"), before);
});
test("failed writes do not update in-memory data", (t) => {
  const { store } = setup(t);
  store.apply("visit", visit);
  const before = store.read();
  store.file = path.join(store.file, "impossible");
  assert.throws(() => store.apply("language", "pl"));
  assert.deepEqual(store.read(), before);
});
