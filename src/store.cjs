"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const specialists = [
  "cardiologist",
  "neurologist",
  "endocrinologist",
  "orthopedist",
];
const symptoms = [
  "palpitations",
  "dizziness",
  "dyspnea",
  "headache",
  "pain",
  "fatigue",
];
const frequencies = ["none", "once", "several"];
const fail = () => {
  throw new Error("INVALID_DATA");
};
const text = (v, max = 2000) =>
  typeof v === "string" && v.length <= max ? v.trim() : fail();
const member = (v, list) => (list.includes(v) ? v : fail());
function date(v) {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) !== v
  )
    fail();
  return v;
}
function day(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function validate(s) {
  if (
    !s ||
    s.version !== 1 ||
    !["en", "pl"].includes(s.language) ||
    !Array.isArray(s.events) ||
    !Array.isArray(s.answers)
  )
    fail();
  if (s.visit) {
    if (typeof s.visit.id !== "string" || !s.visit.id) fail();
    member(s.visit.specialist, specialists);
    date(s.visit.date);
    if (!text(s.visit.reason)) fail();
  }
  const ids = new Set();
  for (const e of s.events) {
    if (
      !s.visit ||
      e.visitID !== s.visit.id ||
      typeof e.id !== "string" ||
      ids.has(e.id) ||
      !Number.isFinite(Date.parse(e.timestamp))
    )
      fail();
    ids.add(e.id);
    member(e.symptom, symptoms);
    text(e.note);
  }
  const answerIDs = new Set();
  for (const a of s.answers) {
    if (
      !s.visit ||
      a.visitID !== s.visit.id ||
      answerIDs.has(a.id) ||
      a.id !== `${a.visitID}/${a.symptom}/${a.date}`
    )
      fail();
    answerIDs.add(a.id);
    date(a.date);
    member(a.symptom, symptoms);
    member(a.frequency, frequencies);
    text(a.note);
  }
  return s;
}
class Store {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      this.state = validate(JSON.parse(fs.readFileSync(file, "utf8")));
    } catch (e) {
      if (e.code !== "ENOENT")
        throw new Error("STORE_UNREADABLE", { cause: e });
      this.state = {
        version: 1,
        language: "en",
        visit: null,
        events: [],
        answers: [],
      };
    }
  }
  read() {
    return structuredClone(this.state);
  }
  apply(command, value, now = new Date()) {
    const next = this.read();
    switch (command) {
      case "language":
        next.language = member(value, ["en", "pl"]);
        break;
      case "visit": {
        const reason = text(value.reason);
        if (!reason) fail();
        next.visit = {
          id: next.visit?.id ?? randomUUID(),
          createdAt: next.visit?.createdAt ?? now.toISOString(),
          specialist: member(value.specialist, specialists),
          date: date(value.date),
          reason,
        };
        break;
      }
      case "event": {
        if (!next.visit) fail();
        const old = value.id
          ? next.events.find((e) => e.id === value.id)
          : null;
        if (value.id && !old) fail();
        const stamp = old?.timestamp ?? value.timestamp;
        if (
          !Number.isFinite(Date.parse(stamp)) ||
          Date.parse(stamp) > now.getTime() + 60000
        )
          fail();
        const event = {
          id: old?.id ?? randomUUID(),
          visitID: next.visit.id,
          symptom: member(value.symptom, symptoms),
          timestamp: stamp,
          note: text(value.note),
        };
        next.events = [
          event,
          ...next.events.filter((e) => e.id !== event.id),
        ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        break;
      }
      case "deleteEvent":
        if (!next.events.some((e) => e.id === value)) fail();
        next.events = next.events.filter((e) => e.id !== value);
        break;
      case "checkIn": {
        if (!next.visit) fail();
        const symptom = member(value.symptom, symptoms),
          today = day(now),
          id = `${next.visit.id}/${symptom}/${today}`;
        const answer = {
          id,
          visitID: next.visit.id,
          date: today,
          symptom,
          frequency: member(value.frequency, frequencies),
          note: text(value.note),
        };
        next.answers = [
          answer,
          ...next.answers.filter((a) => a.id !== id),
        ].sort((a, b) => b.date.localeCompare(a.date));
        break;
      }
      default:
        fail();
    }
    validate(next);
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try {
      const fd = fs.openSync(temp, "wx", 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify(next, null, 2));
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(temp, this.file);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
    this.state = next;
    return this.read();
  }
}
module.exports = { Store, day, validate };
