"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookmarkPlus,
  Download,
  FileText,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { eventTargets, type EventTarget } from "@/lib/event-types";
import {
  equipmentOptions,
  journalRatings,
  mergeJournalEntries,
  observingConditions,
  targetLabel,
  validJournalEntries,
  validObservingLists,
  type JournalEntry,
  type JournalRating,
  type ObservingCondition,
  type ObservingList,
} from "@/lib/journal";

const journalStorageKey = "astroscout.observations.v1";
const listStorageKey = "astroscout.observing-lists.v1";

type Draft = {
  observedAt: string;
  location: string;
  target: string;
  equipment: string;
  notes: string;
  visibility: JournalRating;
  transparency: JournalRating;
  conditions: ObservingCondition;
};

const emptyDraft: Draft = {
  observedAt: "",
  location: "",
  target: "",
  equipment: "Unaided eye",
  notes: "",
  visibility: "Not recorded",
  transparency: "Not recorded",
  conditions: "Not recorded",
};

function localDateTime(value = new Date()) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function displayDate(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function ObservationJournal({
  locationName,
  selectedTarget,
}: {
  locationName: string;
  selectedTarget: EventTarget;
}) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [lists, setLists] = useState<ObservingList[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [newListName, setNewListName] = useState("");
  const [listTarget, setListTarget] = useState<EventTarget>(selectedTarget);
  const [ready, setReady] = useState(false);
  const [storageWritable, setStorageWritable] = useState(true);
  const [message, setMessage] = useState("");
  const upload = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const journalData = JSON.parse(
        localStorage.getItem(journalStorageKey) ?? "{}",
      ) as { journalEntries?: unknown };
      setEntries(validJournalEntries(journalData.journalEntries));
      setLists(
        validObservingLists(
          JSON.parse(localStorage.getItem(listStorageKey) ?? "[]"),
        ),
      );
    } catch {
      setStorageWritable(false);
      setMessage("Saved journal data could not be read in this browser.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    setListTarget(selectedTarget === "sun" ? "moon" : selectedTarget);
    setDraft((current) => ({
      ...current,
      observedAt: current.observedAt || localDateTime(),
      location: current.location || locationName,
      target:
        current.target || targetLabel(selectedTarget === "sun" ? "moon" : selectedTarget),
    }));
  }, [locationName, selectedTarget]);

  useEffect(() => {
    if (!ready || !storageWritable) return;
    try {
      const previous = JSON.parse(
        localStorage.getItem(journalStorageKey) ?? "{}",
      );
      const record = previous && typeof previous === "object" ? previous : {};
      localStorage.setItem(
        journalStorageKey,
        JSON.stringify({
          ...record,
          schema: "astroscout.observations.v1",
          journalEntries: entries,
        }),
      );
    } catch {
      setStorageWritable(false);
      setMessage("Browser storage is unavailable. Export your journal before leaving.");
    }
  }, [entries, ready, storageWritable]);

  useEffect(() => {
    if (!ready || !storageWritable) return;
    try {
      localStorage.setItem(listStorageKey, JSON.stringify(lists));
    } catch {
      setStorageWritable(false);
      setMessage("Browser storage is unavailable. Your lists may not be retained.");
    }
  }, [lists, ready, storageWritable]);

  function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const observedAt = new Date(draft.observedAt);
    if (
      !Number.isFinite(observedAt.getTime()) ||
      !draft.location.trim() ||
      !draft.target.trim() ||
      !draft.notes.trim()
    ) {
      setMessage("Add a valid date, location, target and observation notes.");
      return;
    }
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      observedAt: observedAt.toISOString(),
      location: draft.location.trim(),
      target: draft.target.trim(),
      equipment: draft.equipment,
      notes: draft.notes.trim(),
      visibility: draft.visibility,
      transparency: draft.transparency,
      conditions: draft.conditions,
    };
    setEntries((current) => mergeJournalEntries(current, [entry]));
    setDraft((current) => ({
      ...emptyDraft,
      observedAt: localDateTime(),
      location: current.location,
      target: current.target,
      equipment: current.equipment,
    }));
    setMessage("Journal entry saved on this device.");
  }

  function createList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    if (lists.some((list) => list.name.toLowerCase() === name.toLowerCase())) {
      setMessage("An observing list with that name already exists.");
      return;
    }
    setLists((current) => [
      ...current,
      { id: crypto.randomUUID(), name, targets: [] },
    ]);
    setNewListName("");
    setMessage(`Created “${name}”.`);
  }

  function addTarget(listId: string) {
    const label = targetLabel(listTarget);
    setLists((current) =>
      current.map((list) =>
        list.id === listId && !list.targets.includes(label)
          ? { ...list, targets: [...list.targets, label] }
          : list,
      ),
    );
  }

  function exportJournal() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schema: "astroscout.observations.v1",
            exportedAt: new Date().toISOString(),
            journalEntries: entries,
            observingLists: lists,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "astroscout-journal.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importJournal(file?: File) {
    if (!file) return;
    try {
      if (file.size > 3_000_000)
        throw new Error("Choose a journal export smaller than 3 MB.");
      const data = JSON.parse(await file.text()) as {
        schema?: unknown;
        journalEntries?: unknown;
        observingLists?: unknown;
      };
      if (
        data.schema !== "astroscout.observations.v1" &&
        data.schema !== "astroscout.journal.v1"
      )
        throw new Error("This is not a recognised AstroScout journal export.");
      const importedEntries = validJournalEntries(data.journalEntries);
      const importedLists = validObservingLists(data.observingLists);
      if (!importedEntries.length && !importedLists.length)
        throw new Error("The export does not contain any usable journal data.");
      setEntries((current) => mergeJournalEntries(current, importedEntries));
      if (importedLists.length)
        setLists((current) =>
          validObservingLists([...current, ...importedLists]).filter(
            (list, index, all) =>
              all.findIndex((candidate) => candidate.id === list.id) === index,
          ),
        );
      setMessage(
        `Imported ${importedEntries.length} journal entr${importedEntries.length === 1 ? "y" : "ies"}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The journal could not be imported.",
      );
    } finally {
      if (upload.current) upload.current.value = "";
    }
  }

  return (
    <div className="journal-page">
      {message && <p className="event-notice" role="status">{message}</p>}
      <section className="journal-tools" aria-labelledby="journal-tools-heading">
        <div>
          <p className="event-kicker">SAVED ON THIS DEVICE</p>
          <h2 id="journal-tools-heading">Your observation journal</h2>
          <p>
            Entries remain in this browser. Export a backup before clearing browser data or changing phones.
          </p>
        </div>
        <div className="journal-tools__actions">
          <button type="button" className="event-secondary" onClick={exportJournal} disabled={!entries.length && !lists.length}>
            <Download size={17} /> Export
          </button>
          <button type="button" className="event-secondary" onClick={() => upload.current?.click()}>
            <Upload size={17} /> Import
          </button>
          <input ref={upload} hidden type="file" accept="application/json,.json" onChange={(event) => void importJournal(event.target.files?.[0])} />
        </div>
      </section>

      <div className="journal-layout">
        <section className="journal-card" aria-labelledby="journal-entry-heading">
          <div className="journal-card__heading">
            <FileText size={20} />
            <div>
              <h2 id="journal-entry-heading">Add an observation</h2>
              <p>Record what you actually saw and the conditions at the time.</p>
            </div>
          </div>
          <form className="journal-form" onSubmit={saveEntry}>
            <label>Date and time<input required type="datetime-local" value={draft.observedAt} onChange={(event) => setDraft({ ...draft, observedAt: event.target.value })} /></label>
            <label>Location<input required maxLength={180} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
            <label>Object<input required maxLength={100} value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })} /></label>
            <label>Equipment<select value={draft.equipment} onChange={(event) => setDraft({ ...draft, equipment: event.target.value })}>{equipmentOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Conditions<select value={draft.conditions} onChange={(event) => setDraft({ ...draft, conditions: event.target.value as ObservingCondition })}>{observingConditions.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Visibility<select value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as JournalRating })}>{journalRatings.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Transparency<select value={draft.transparency} onChange={(event) => setDraft({ ...draft, transparency: event.target.value as JournalRating })}>{journalRatings.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="journal-form__notes">Notes<textarea required maxLength={5000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="What could you see? What made the view easier or harder?" /></label>
            <button type="submit" className="event-primary">Save observation</button>
          </form>
        </section>

        <section className="journal-card" aria-labelledby="observing-lists-heading">
          <div className="journal-card__heading">
            <BookmarkPlus size={20} />
            <div>
              <h2 id="observing-lists-heading">Observing lists</h2>
              <p>Keep short lists of objects you want to revisit.</p>
            </div>
          </div>
          <form className="observing-list-create" onSubmit={createList}>
            <input aria-label="New list name" maxLength={60} value={newListName} onChange={(event) => setNewListName(event.target.value)} placeholder="List name" />
            <button type="submit" className="event-secondary"><Plus size={16} /> Create</button>
          </form>
          <label className="observing-list-target">Object to add<select value={listTarget} onChange={(event) => setListTarget(event.target.value as EventTarget)}>{eventTargets.filter((target) => target.id !== "sun").map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label>
          {!lists.length && <p className="journal-empty">Create a list for a future observing session.</p>}
          <div className="observing-list-grid">
            {lists.map((list) => (
              <article key={list.id}>
                <div className="observing-list-title">
                  <strong>{list.name}</strong>
                  <button type="button" aria-label={`Delete ${list.name}`} onClick={() => setLists((current) => current.filter((item) => item.id !== list.id))}><Trash2 size={15} /></button>
                </div>
                <button type="button" className="observing-list-add" disabled={list.targets.includes(targetLabel(listTarget))} onClick={() => addTarget(list.id)}><Plus size={14} /> {list.targets.includes(targetLabel(listTarget)) ? "Already added" : `Add ${targetLabel(listTarget)}`}</button>
                {list.targets.length ? (
                  <ul>{list.targets.map((target) => <li key={target}><span>{target}</span><button type="button" aria-label={`Remove ${target} from ${list.name}`} onClick={() => setLists((current) => current.map((item) => item.id === list.id ? { ...item, targets: item.targets.filter((value) => value !== target) } : item))}><Trash2 size={14} /></button></li>)}</ul>
                ) : <p>No objects added.</p>}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="journal-history" aria-labelledby="journal-history-heading">
        <div className="event-section-heading">
          <div><p className="event-kicker">HISTORY</p><h2 id="journal-history-heading">Past observations</h2></div>
          <span>{entries.length} saved</span>
        </div>
        {!entries.length && <p className="journal-empty">Your saved observations will appear here.</p>}
        {entries.map((entry) => (
          <article key={entry.id}>
            <div>
              <strong>{entry.target}</strong>
              <span>{displayDate(entry.observedAt)} · {entry.location}</span>
              <small>{entry.equipment} · {entry.conditions} · visibility {entry.visibility.toLowerCase()} · transparency {entry.transparency.toLowerCase()}</small>
              <p>{entry.notes}</p>
            </div>
            <button type="button" aria-label={`Delete ${entry.target} observation from ${displayDate(entry.observedAt)}`} onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}><Trash2 size={16} /></button>
          </article>
        ))}
      </section>
    </div>
  );
}
