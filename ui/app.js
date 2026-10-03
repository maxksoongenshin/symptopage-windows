import { copy, specialists, symptoms } from "./i18n.js";
let state = { language: "en", visit: null, events: [], answers: [] },
  page = "overview",
  selected = "palpitations",
  noteOpen = false,
  busy = false,
  broken = false;
const root = document.querySelector("#app"),
  modal = document.querySelector("#modal");
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const t = (k) => copy[k]?.[state.language === "pl" ? 1 : 0] ?? k;
const label = (map, key) => map[key]?.[state.language === "pl" ? 1 : 0] ?? key;
const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const date = (v, time = false) =>
  new Intl.DateTimeFormat(state.language === "pl" ? "pl-PL" : "en-GB", {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" } : {}),
  }).format(new Date(v.length === 10 ? v + "T12:00:00" : v));
const days = (v) =>
  Math.round(
    (Date.parse(v + "T12:00:00Z") - Date.parse(localDay() + "T12:00:00Z")) /
      86400000,
  );
const todayAnswer = () =>
  state.answers.find((a) => a.date === localDay() && a.symptom === selected);
const icon =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M7 33h13l7-20 9 39 8-27 6 8h8"/></svg>';
const button = (key, action, cls = "quiet") =>
  `<button type="button" class="${cls}" data-action="${action}">${t(key)}</button>`;
const languagePicker = () =>
  `<select aria-label="${t("language")}" id="language"><option value="en" ${state.language === "en" ? "selected" : ""}>English</option><option value="pl" ${state.language === "pl" ? "selected" : ""}>Polski</option></select>`;
function notify(message) {
  const n = document.querySelector("#notice");
  n.textContent = message;
  n.classList.add("visible");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => n.classList.remove("visible"), 5000);
}
async function change(command, value) {
  if (busy) return false;
  busy = true;
  try {
    const result = await window.sympto.change(command, value);
    if (!result.ok) {
      notify(t(result.error === "INVALID_DATA" ? "invalid" : "error"));
      return false;
    }
    state = result.value;
    return true;
  } catch {
    notify(t("error"));
    return false;
  } finally {
    busy = false;
  }
}
function visitForm(edit = false) {
  const v = edit ? state.visit : null;
  return `<form id="visit-form"><h2>${t(edit ? "editVisit" : "start")}</h2><p class="muted">${t("plan")}</p><label>${t("first")}<select name="specialist" required><option value="">${t("choose")}</option>${Object.keys(
    specialists,
  )
    .map(
      (k) =>
        `<option value="${k}" ${v?.specialist === k ? "selected" : ""}>${label(specialists, k)}</option>`,
    )
    .join(
      "",
    )}</select></label><label>${t("visitDate")}<input name="date" type="date" required value="${esc(v?.date ?? localDay())}" ${edit ? "" : `min="${localDay()}"`}></label><label>${t("reason")}<textarea name="reason" required maxlength="2000" rows="3" placeholder="${t("reasonHint")}">${esc(v?.reason ?? "")}</textarea></label><p class="hint">${t("ownWords")}</p><div class="actions">${edit ? button("cancel", "close") : ""}<button class="primary" type="submit">${t(edit ? "saveChanges" : "next")} <span aria-hidden="true">→</span></button></div></form>`;
}
function onboarding() {
  return `<div class="onboarding"><div class="intro"><div class="art"><div class="art-inner">${icon}</div><span class="art-plus">+</span><span class="art-check">✓</span></div><h2>${t("story")}</h2><p>${t("storyDetail")}</p><p class="teal">✓ ${t("noAccount")}</p></div><article class="card">${visitForm()}</article></div>`;
}
function eventRows(events, editable = false) {
  if (!events.length) return `<p class="empty">${t("empty")}</p>`;
  return events
    .map(
      (e) =>
        `<div class="entry"><div><strong>${label(symptoms, e.symptom)}</strong><time>${date(e.timestamp, true)}</time>${e.note ? `<p>${esc(e.note)}</p>` : ""}</div>${editable ? `<div class="actions"><button class="quiet" data-edit="${e.id}">${t("edit")}</button><button class="quiet danger-text" data-delete="${e.id}">${t("remove")}</button></div>` : ""}</div>`,
    )
    .join("");
}
function overview() {
  const v = state.visit,
    n = days(v.date),
    answer = todayAnswer();
  return `<article class="card visit-card"><div><p class="eyebrow teal">◉ ${t("active")}</p><h2>${label(specialists, v.specialist)}</h2><p class="muted user-text">${esc(v.reason)}</p>${button("editVisit", "editVisit")}</div><div class="countdown"><strong>${n === 0 ? t("today") : Math.abs(n)}</strong><span>${t(n === 0 ? "yourVisit" : n === 1 ? "dayUntil" : n > 0 ? "until" : "since")}</span><time>${date(v.date)}</time></div></article><div class="tracking-grid"><article class="card"><p class="eyebrow">${t("daily")}</p><h2>${t(selected === "palpitations" ? "question" : "otherQuestion")}</h2><select id="symptom-select" aria-label="${t("symptom")}">${Object.keys(
    symptoms,
  )
    .map(
      (k) =>
        `<option value="${k}" ${k === selected ? "selected" : ""}>${label(symptoms, k)}</option>`,
    )
    .join(
      "",
    )}</select><div class="frequency">${["none", "once", "several"].map((k) => `<button data-frequency="${k}" aria-pressed="${answer?.frequency === k}" class="${answer?.frequency === k ? "selected" : ""}">${t(k)}</button>`).join("")}</div>${button("addNote", "note", "text-button")}${noteOpen ? `<textarea id="daily-note" maxlength="2000" rows="3" aria-label="${t("addNote")}">${esc(answer?.note ?? "")}</textarea><button class="quiet" data-action="saveNote" ${answer ? "" : "disabled"}>${t("saveNote")}</button>` : ""}${answer ? `<p class="hint teal">✓ ${t("dailySaved")}</p>` : ""}</article><aside class="now-card">${icon}<h2>${t("nowTitle")}</h2><p>${t("nowDetail")}</p>${button("now", "capture", "urgent")}<p class="hint">${t("timeHint")}</p></aside></div><article class="card"><div class="row"><h3>${t("recent")}</h3><span>${state.events.length}</span></div>${eventRows(state.events.slice(0, 3))}</article>`;
}
function dailyRows() {
  return state.answers.length
    ? state.answers
        .map(
          (a) =>
            `<div class="entry"><div><strong>${label(symptoms, a.symptom)} · ${t(a.frequency)}</strong><time>${date(a.date)}</time>${a.note ? `<p>${esc(a.note)}</p>` : ""}</div></div>`,
        )
        .join("")
    : `<p class="muted">${t("noDaily")}</p>`;
}
function reportHTML() {
  const v = state.visit;
  if (!v) return "";
  return `<h1>SymptoPage</h1><h2>${t("report")}</h2><p><strong>${label(specialists, v.specialist)}</strong> · ${date(v.date)}</p><p class="user-text">${esc(v.reason)}</p><h3>${t("events")}</h3>${eventRows(state.events)}<h3>${t("dailyEntries")}</h3>${dailyRows()}<p class="hint">${t("disclaimer")}</p>`;
}
function content() {
  if (broken)
    return `<article class="card"><h2>${t("unreadable")}</h2>${button("showData", "showData")}</article>`;
  if (!state.visit) return onboarding();
  if (page === "overview") return overview();
  if (page === "journal")
    return `<div class="row"><p class="muted">${t("ownWords")}</p>${button("add", "capture", "primary")}</div><article class="card"><h2>${t("events")}</h2>${eventRows(state.events, true)}</article><article class="card"><h2>${t("dailyEntries")}</h2>${dailyRows()}</article>`;
  if (page === "report")
    return `<article class="card"><p class="muted">${t("reportDetail")}</p><div class="actions">${button("pdf", "pdf", "primary")}${button("print", "print")}</div><div class="report-preview">${reportHTML()}</div></article>`;
  return `<article class="card"><h2>${t("settings")}</h2><h3>${t("language")}</h3><p>English / Polski</p><p class="muted">${t("language")} ↗</p><hr><h3>${t("local")}</h3><p class="muted">${t("localDetail")}</p>${button("showData", "showData")}<hr><p class="muted">${t("disclaimer")}</p></article>`;
}
function render() {
  document.documentElement.lang = state.language;
  root.innerHTML = `<aside class="sidebar"><div class="brand"><span class="brand-icon">${icon}</span>SymptoPage</div><p class="eyebrow">${t("tagline")}</p><nav>${["overview", "journal", "report", "settings"].map((p, i) => `<button data-page="${p}" ${!state.visit && p !== "overview" ? "disabled" : ""} ${p === page ? 'aria-current="page"' : ""}><span aria-hidden="true">${["◫", "▤", "▧", "☷"][i]}</span>${t(p)}</button>`).join("")}</nav><div class="sidebar-note"><span aria-hidden="true">❧</span><h3>${t("oneDay")}</h3><p>${t("little")}</p></div><small>SymptoPage · Windows</small></aside><main><header><div><p class="eyebrow">${state.visit ? date(localDay()).toUpperCase() : t("welcome")}</p><h1>${!state.visit ? t("hello") : t({ overview: "heading", journal: "journalTitle", report: "ready", settings: "settingsTitle" }[page])}</h1></div>${languagePicker()}</header><div class="content">${content()}</div><footer>♧ ${t("privacy")}</footer></main>`;
  document.querySelector("#print-report").innerHTML = reportHTML();
}
function openCapture(id) {
  const original = state.events.find((e) => e.id === id);
  const stamp = original?.timestamp ?? new Date().toISOString();
  modal.innerHTML = `<form id="capture-form"><h2>${t("captureTitle")}</h2><p class="muted">${t("captured")} · ${date(stamp, true)}</p><fieldset class="symptom-grid"><legend class="sr-only">${t("symptom")}</legend>${Object.keys(
    symptoms,
  )
    .map(
      (k) =>
        `<label class="symptom-choice"><input type="radio" name="symptom" value="${k}" required ${original?.symptom === k ? "checked" : ""}><span>${label(symptoms, k)}</span></label>`,
    )
    .join(
      "",
    )}</fieldset><label class="sr-only" for="event-note">${t("optional")}</label><textarea id="event-note" name="note" rows="3" maxlength="2000" placeholder="${t("optional")}">${esc(original?.note ?? "")}</textarea><div class="actions">${button("cancel", "close")}<button class="primary" type="submit">${t("save")}</button></div></form>`;
  modal.showModal();
  modal.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    if (
      await change("event", {
        ...(original ? { id: original.id } : {}),
        timestamp: stamp,
        symptom: d.get("symptom"),
        note: d.get("note"),
      })
    ) {
      modal.close();
      render();
      notify(t("saved"));
    }
  });
}
function openVisit() {
  modal.innerHTML = visitForm(true);
  modal.showModal();
}
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "visit-form") return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (await change("visit", data)) {
    if (modal.open) modal.close();
    render();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "language") {
    const draft = document.querySelector("#visit-form")
      ? Object.fromEntries(new FormData(document.querySelector("#visit-form")))
      : null;
    if (await change("language", e.target.value)) {
      render();
      if (draft)
        for (const [key, value] of Object.entries(draft))
          document.querySelector(`#visit-form [name="${key}"]`).value = value;
    }
  }
  if (e.target.id === "symptom-select") {
    selected = e.target.value;
    render();
  }
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.page) {
    page = b.dataset.page;
    render();
    return;
  }
  if (b.dataset.edit) {
    openCapture(b.dataset.edit);
    return;
  }
  if (b.dataset.delete) {
    modal.innerHTML = `<h2>${t("deleteQuestion")}</h2><p>${t("deleteHint")}</p><div class="actions">${button("cancel", "close")}<button class="urgent" data-confirm-delete="${b.dataset.delete}">${t("remove")}</button></div>`;
    modal.showModal();
    return;
  }
  if (b.dataset.confirmDelete) {
    if (await change("deleteEvent", b.dataset.confirmDelete)) {
      modal.close();
      render();
    }
    return;
  }
  if (b.dataset.frequency) {
    if (
      await change("checkIn", {
        symptom: selected,
        frequency: b.dataset.frequency,
        note:
          document.querySelector("#daily-note")?.value ??
          todayAnswer()?.note ??
          "",
      })
    ) {
      render();
      notify(t("dailySaved"));
    }
    return;
  }
  switch (b.dataset.action) {
    case "close":
      modal.close();
      break;
    case "capture":
      openCapture();
      break;
    case "editVisit":
      openVisit();
      break;
    case "note":
      noteOpen = !noteOpen;
      render();
      break;
    case "saveNote":
      if (
        await change("checkIn", {
          symptom: selected,
          frequency: todayAnswer()?.frequency,
          note: document.querySelector("#daily-note").value,
        })
      ) {
        render();
        notify(t("dailySaved"));
      }
      break;
    case "showData":
      await window.sympto.showData();
      break;
    case "pdf":
    case "print": {
      b.disabled = true;
      try {
        const r = await (b.dataset.action === "pdf"
          ? window.sympto.exportPDF()
          : window.sympto.print());
        if (!r.ok) notify(t("error"));
        else if (r.value && b.dataset.action === "pdf") notify(t("pdfSaved"));
      } catch {
        notify(t("error"));
      } finally {
        b.disabled = false;
      }
      break;
    }
  }
});
try {
  const r = await window.sympto.read();
  if (r.ok && !r.value.loadError) state = r.value;
  else broken = true;
} catch {
  broken = true;
}
render();
