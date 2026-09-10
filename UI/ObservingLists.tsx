"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookmarkPlus, Plus, Trash2 } from "lucide-react";
import { targetIds, targetLabels, type TargetId } from "@/lib/observation-model";

type ObservingList = { id: string; name: string; targets: TargetId[] };
const storageKey = "astroscout.observing-lists.v1";

function validLists(value: unknown): ObservingList[] {
  if (!Array.isArray(value)) return [];
  return value.filter((list): list is ObservingList =>
    list && typeof list.id === "string" && typeof list.name === "string" &&
    list.name.trim().length > 0 && Array.isArray(list.targets) &&
    list.targets.every((target: unknown) => targetIds.includes(target as TargetId)),
  ).slice(0, 30);
}

export function ObservingLists({ selectedTarget }: { selectedTarget: TargetId }) {
  const [lists, setLists] = useState<ObservingList[]>([]);
  const [newName, setNewName] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setLists(validLists(JSON.parse(localStorage.getItem(storageKey) ?? "[]"))); } catch { /* Lists remain available for this visit. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify(lists)); } catch { /* Browser storage may be restricted. */ }
  }, [lists, ready]);
  function create(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || lists.some((list) => list.name.toLowerCase() === name.toLowerCase())) return;
    setLists((current) => [...current, { id: crypto.randomUUID(), name, targets: [] }]);
    setNewName("");
  }
  return <section className="observing-lists" aria-labelledby="observing-lists-heading">
    <div><span className="kicker">MY PLAN</span><h2 id="observing-lists-heading">Observing lists</h2></div>
    <form onSubmit={create} className="observing-list-create">
      <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={60} placeholder="Name a list, e.g. Tonight" aria-label="New observing list name" />
      <button className="button button--secondary" type="submit"><Plus size={16} /> Create</button>
    </form>
    {!lists.length && <p className="observing-list-empty">Create a list for the targets you want to come back to.</p>}
    <div className="observing-list-grid">
      {lists.map((list) => <article key={list.id}>
        <div className="observing-list-title"><input aria-label="List name" value={list.name} maxLength={60} onChange={(event) => setLists((current) => current.map((item) => item.id === list.id ? { ...item, name: event.target.value } : item))} /><button className="icon-button" type="button" aria-label={`Delete ${list.name}`} title="Delete list" onClick={() => setLists((current) => current.filter((item) => item.id !== list.id))}><Trash2 size={15} /></button></div>
        <button className="text-button" type="button" onClick={() => setLists((current) => current.map((item) => item.id === list.id && !item.targets.includes(selectedTarget) ? { ...item, targets: [...item.targets, selectedTarget] } : item))} disabled={list.targets.includes(selectedTarget)}><BookmarkPlus size={15} /> {list.targets.includes(selectedTarget) ? `${targetLabels[selectedTarget]} added` : `Add ${targetLabels[selectedTarget]}`}</button>
        {list.targets.length ? <ul>{list.targets.map((target) => <li key={target}><span>{targetLabels[target]}</span><button type="button" aria-label={`Remove ${targetLabels[target]} from ${list.name}`} onClick={() => setLists((current) => current.map((item) => item.id === list.id ? { ...item, targets: item.targets.filter((id) => id !== target) } : item))}><Trash2 size={14} /></button></li>)}</ul> : <p>No targets yet.</p>}
      </article>)}
    </div>
  </section>;
}
