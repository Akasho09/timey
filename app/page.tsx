"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Lap = { id: string; lapNumber: number; durationMs: number; cumulativeMs: number; category: string; label: string | null };
type Day = { id: string; date: string; title: string | null; notes: string | null; laps: Lap[]; totalMs: number; lapCount: number; byCategory: Record<string, number> };
const sample = `1      00:01.06      00:01.06\n2      00:01.43      00:02.49\n3      00:39.29      00:41.78\n4      00:02.77      00:44.55\n5      00:02.52      00:47.07`;
const categories = ["STUDY", "DEVELOPMENT", "CAREER", "PERSONAL", "DISTRACTION", "BREAK", "OTHER"];
const categoryLabel: Record<string, string> = { STUDY: "Study", DEVELOPMENT: "Development", CAREER: "Career", PERSONAL: "Personal", DISTRACTION: "Distraction", BREAK: "Break", OTHER: "Other" };

function duration(ms: number) {
  const sec = Math.floor(ms / 1000), h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}.${String(cs).padStart(2, "0")}s`;
  return `${s}.${String(cs).padStart(2, "0")}s`;
}
function hours(ms: number) { return `${(ms / 3600000).toFixed(2)}h`; }
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function weekKey(value: string) { const d = new Date(`${value}T00:00:00`); const day = (d.getDay()+6)%7; d.setDate(d.getDate()-day); return d.toISOString().slice(0,10); }

export default function Home() {
  const [rawText, setRawText] = useState("");
  const [date, setDate] = useState(localDate());
  const [category, setCategory] = useState("STUDY");
  const [title, setTitle] = useState("Daily stopwatch import");
  const [notes, setNotes] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [days, setDays] = useState<Day[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("");

  const loadDays = useCallback(async () => {
    try {
      const response = await fetch("/api/days", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load saved records. Check your database connection.");
      const data = await response.json();
      setDays(data);
      if (!selectedDay && data.length) setSelectedDay(data[0].date.slice(0,10));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load records"); }
  }, [selectedDay]);
  useEffect(() => { void loadDays(); }, [loadDays]);

  const selected = days.find((d) => d.date.slice(0,10) === selectedDay) ?? days[0];
  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const day of days) for (const [key, value] of Object.entries(day.byCategory ?? {})) result[key] = (result[key] ?? 0) + value;
    return result;
  }, [days]);
  const overallMs = Object.values(totals).reduce((a,b)=>a+b,0);
  const weekly = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const day of days) { const key = weekKey(day.date.slice(0,10)); groups[key] = (groups[key] ?? 0) + day.totalMs; }
    return Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8);
  }, [days]);
  const monthly = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const day of days) { const key = day.date.slice(0,7); groups[key] = (groups[key] ?? 0) + day.totalMs; }
    return Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12);
  }, [days]);

  async function importData(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/import", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({date,rawText,category,title,notes,replaceExisting}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import failed");
      setMessage(`Imported ${data.importedLaps} laps. Total stopwatch time: ${duration(data.totalMs)}.`);
      setSelectedDay(date); setRawText(""); setNotes(""); setReplaceExisting(false);
      await loadDays();
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed"); }
    finally { setBusy(false); }
  }

  function exportCsv() {
    const rows = [["Date","Lap","Lap duration ms","Cumulative ms","Category","Label"]];
    for (const day of days) for (const lap of day.laps) rows.push([day.date.slice(0,10),String(lap.lapNumber),String(lap.durationMs),String(lap.cumulativeMs),lap.category,lap.label ?? ""]);
    const csv = rows.map((r)=>r.map((v)=>`"${v.replaceAll('"','""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); const a=document.createElement("a"); a.href=url; a.download="laplog-productivity.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brandMark">L</span><span>laplog</span></a><div className="topMeta"><span className="liveDot"/> Local productivity database</div></header>
    <section className="hero" id="top"><div><p className="eyebrow">STOPWATCH → PRODUCTIVITY INTELLIGENCE</p><h1>Make every lap<br/><em>count.</em></h1><p className="heroCopy">Import your daily stopwatch record. Laplog turns raw lap times into a searchable history of your focused work, breaks and distractions.</p></div><div className="heroStat"><span>YOUR STUDY TARGET</span><strong>10<span>h</span></strong><small>per day · GATE preparation</small><div className="targetLine"><i/></div><span className="mutedSmall">Development target: 2h / day</span></div></section>
    <section className="statGrid"><Stat label="Days recorded" value={String(days.length)} hint="Saved in PostgreSQL"/><Stat label="Total tracked time" value={hours(overallMs)} hint="Across all imported laps"/><Stat label="Study time" value={hours(totals.STUDY ?? 0)} hint="Categorized study laps"/><Stat label="Distraction time" value={hours(totals.DISTRACTION ?? 0)} hint="Categorized distraction laps"/></section>
    <section className="contentGrid">
      <form className="panel importPanel" onSubmit={importData}><div className="panelHead"><div><p className="eyebrow">01 / DAILY IMPORT</p><h2>Import stopwatch laps</h2></div><span className="pill">Paste data</span></div><label className="fieldLabel">Record date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label className="fieldLabel">What does this session represent?<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. GATE study session"/></label><label className="fieldLabel">Activity category<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{categoryLabel[c]}</option>)}</select></label><label className="fieldLabel">Stopwatch data<textarea value={rawText} onChange={e=>setRawText(e.target.value)} placeholder={sample} rows={8} required spellCheck={false}/></label><div className="hintBox"><strong>Expected format</strong><code>Lap number　 Lap time　 Cumulative time</code><span>Example: 3　00:39.29　00:41.78 · Supports mm:ss.cc and hh:mm:ss.cc.</span></div><label className="fieldLabel">Notes <span className="optional">optional</span><textarea className="notes" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Topics covered, questions solved, interruptions…"/></label><label className="checkLine"><input type="checkbox" checked={replaceExisting} onChange={e=>setReplaceExisting(e.target.checked)}/> Replace this date's existing record (overwrites its laps)</label><button className="primaryButton" disabled={busy}>{busy?"Importing…":"Import and save laps"}<span>↗</span></button>{message&&<p className="successMsg">✓ {message}</p>}{error&&<p className="errorMsg">{error}</p>}</form>
      <div className="rightStack"><section className="panel"><div className="panelHead"><div><p className="eyebrow">02 / SAVED HISTORY</p><h2>Daily records</h2></div><button className="textButton" onClick={exportCsv} disabled={!days.length}>Export CSV ↓</button></div>{days.length===0?<div className="empty"><div className="emptyIcon">◷</div><strong>No records yet</strong><span>Your imported days will appear here.</span></div>:<div className="dayList">{days.map(day=><button key={day.id} className={`dayRow ${selected?.id===day.id?"active":""}`} onClick={()=>setSelectedDay(day.date.slice(0,10))}><span className="dayDate"><strong>{new Date(day.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})}</strong><small>{day.lapCount} laps · {day.title ?? "Stopwatch import"}</small></span><strong className="dayTime">{duration(day.totalMs)}</strong><span className="chevron">›</span></button>)}</div>}</section>
      <section className="panel detailPanel"><div className="panelHead"><div><p className="eyebrow">03 / LAP BREAKDOWN</p><h2>{selected?new Date(selected.date).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}):"Selected day"}</h2></div>{selected&&<span className="pill">{selected.lapCount} laps</span>}</div>{selected?<><div className="detailSummary"><div><small>TOTAL LAP TIME</small><strong>{duration(selected.totalMs)}</strong></div><div><small>AVERAGE LAP</small><strong>{duration(Math.round(selected.laps.reduce((a,l)=>a+l.durationMs,0)/Math.max(1,selected.laps.length)))}</strong></div><div><small>LONGEST LAP</small><strong>{duration(Math.max(...selected.laps.map(l=>l.durationMs)))}</strong></div></div><div className="lapTableWrap"><table><thead><tr><th>Lap</th><th>Duration</th><th>Cumulative</th><th>Category</th></tr></thead><tbody>{selected.laps.map(l=><tr key={l.id}><td>#{l.lapNumber}</td><td>{duration(l.durationMs)}</td><td>{duration(l.cumulativeMs)}</td><td><span className="categoryTag">{categoryLabel[l.category]??l.category}</span></td></tr>)}</tbody></table></div>{selected.notes&&<p className="recordNotes">{selected.notes}</p>}</>:<div className="empty compact">Select a saved date to inspect its laps and metrics.</div>}</section></div>
    </section>
    <section className="analyticsSection"><div className="sectionTitle"><div><p className="eyebrow">04 / LONG-TERM VIEW</p><h2>Your time, over time.</h2></div><p>As you import more days, these summaries build a historical picture of your routine.</p></div><div className="analyticsGrid"><Analytics title="Category breakdown" subtitle="All imported records" rows={Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:categoryLabel[k]??k,value:v}))} total={overallMs}/><Analytics title="Weekly totals" subtitle="Grouped Monday–Sunday" rows={weekly.map(([k,v])=>({label:`Week of ${k}`,value:v}))} total={Math.max(1,...weekly.map(x=>x[1]))}/><Analytics title="Monthly totals" subtitle="Calendar months" rows={monthly.map(([k,v])=>({label:k,value:v}))} total={Math.max(1,...monthly.map(x=>x[1]))}/></div></section>
    <footer><span className="brand smallBrand"><span className="brandMark">L</span> laplog</span><span>Track honestly. Improve steadily.</span><span>{days.length} day{days.length===1?"":"s"} in your history</span></footer>
  </main>;
}
function Stat({label,value,hint}:{label:string;value:string;hint:string}){return <div className="statCard"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
function Analytics({title,subtitle,rows,total}:{title:string;subtitle:string;rows:{label:string;value:number}[];total:number}){return <section className="panel analyticsCard"><div className="panelHead"><div><h3>{title}</h3><small>{subtitle}</small></div></div>{rows.length?<div className="barList">{rows.map((r,i)=><div className="barItem" key={r.label}><div className="barMeta"><span>{r.label}</span><strong>{hours(r.value)}</strong></div><div className="barTrack"><i style={{width:`${Math.max(2,r.value/total*100)}%`}}/></div></div>)}</div>:<div className="empty compact">Waiting for your first import.</div>}</section>}
