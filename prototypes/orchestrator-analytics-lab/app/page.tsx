"use client";

import { useEffect, useMemo, useState } from "react";

type Range = "Today" | "Week" | "Month";
type Category = "All" | "Focus" | "Health" | "Career" | "Personal";
type Scene = "Now" | "Today" | "Journey";

const tasks = [
  { id: 1, title: "Shape the adaptive planning engine", kind: "Deep", time: "42m", rarity: "Legendary", color: "gold" },
  { id: 2, title: "Review execution signals", kind: "Focus", time: "18m", rarity: "Epic", color: "purple" },
  { id: 3, title: "Reset with a short walk", kind: "Physical", time: "10m", rarity: "Rare", color: "blue" },
  { id: 4, title: "Clear the communication queue", kind: "Quick", time: "15m", rarity: "Common", color: "slate" },
];

const datasets = {
  All: { scheduled: 12, completed: 8, hours: 3.4, xp: 340, state: [66, 9, 17, 8], rarity: [33, 33, 25, 9] },
  Focus: { scheduled: 6, completed: 4, hours: 2.2, xp: 190, state: [67, 16, 17, 0], rarity: [17, 33, 33, 17] },
  Health: { scheduled: 3, completed: 3, hours: 0, xp: 80, state: [100, 0, 0, 0], rarity: [67, 33, 0, 0] },
  Career: { scheduled: 5, completed: 2, hours: 4.1, xp: 130, state: [40, 20, 20, 20], rarity: [20, 40, 20, 20] },
  Personal: { scheduled: 4, completed: 3, hours: 0.8, xp: 95, state: [75, 0, 25, 0], rarity: [50, 25, 25, 0] },
};

const weekly = [42, 58, 51, 74, 68, 82, 66];
const bars = [4, 7, 5, 9, 6, 11, 8];

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function ClayNumber({ value, accent = "blue" }: { value: string | number; accent?: string }) {
  const raw = String(value);
  const target = Number.parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
  const suffix = raw.replace(/[0-9.]/g, "");
  const decimals = raw.includes(".") ? 1 : 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 950;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const rendered = `${display.toFixed(decimals)}${suffix}`;
  return <span className={`clay-number ${accent}`} aria-label={raw}>{rendered.split("").map((char, index) => <span className="clay-digit" key={`${char}-${index}`} style={{ "--digit-delay": `${index * 30}ms` } as React.CSSProperties}>{char}</span>)}</span>;
}

function Donut({ values, colors, center, label }: { values: number[]; colors: string[]; center: string; label: string }) {
  return (
    <div className="donut-wrap" aria-label={label}>
      <svg className="donut" viewBox="0 0 120 120" role="img">
        <circle className="donut-track" cx="60" cy="60" r="43" />
        {values.map((value, i) => <circle key={i} className="donut-segment" cx="60" cy="60" r="43" pathLength="100" stroke={colors[i]} strokeDasharray={`${value} ${100 - value}`} strokeDashoffset={-values.slice(0, i).reduce((sum, current) => sum + current, 0)} />)}
      </svg>
      <div className="donut-center"><strong>{center}</strong><span>{label}</span></div>
    </div>
  );
}

function LineChart() {
  const points = weekly.map((v, i) => `${18 + i * 42},${110 - v}`).join(" ");
  return (
    <svg className="line-chart" viewBox="0 0 290 130" role="img" aria-label="Seven-day completion trend">
      {[25, 55, 85, 115].map(y => <line key={y} x1="12" x2="282" y1={y} y2={y} className="grid-line" />)}
      <polyline points={points} className="trend-shadow" />
      <polyline points={points} className="trend-line" />
      {weekly.map((v, i) => <circle key={i} cx={18 + i * 42} cy={110 - v} r="5" className="trend-dot"><title>{v}% complete</title></circle>)}
    </svg>
  );
}

export default function Home() {
  const [range, setRange] = useState<Range>("Today");
  const [category, setCategory] = useState<Category>("All");
  const [mental, setMental] = useState(72);
  const [physical, setPhysical] = useState(58);
  const [focus, setFocus] = useState(81);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [animationEpoch, setAnimationEpoch] = useState(0);
  const [scene, setScene] = useState<Scene>("Today");
  const [displayMode, setDisplayMode] = useState(false);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

  useEffect(() => {
    const replay = () => {
      if (document.visibilityState === "visible") setAnimationEpoch(epoch => epoch + 1);
    };
    document.addEventListener("visibilitychange", replay);
    window.addEventListener("pageshow", replay);
    return () => {
      document.removeEventListener("visibilitychange", replay);
      window.removeEventListener("pageshow", replay);
    };
  }, []);

  useEffect(() => {
    if (!displayMode) return;
    const order: Scene[] = ["Now", "Today", "Journey"];
    const timer = window.setInterval(() => {
      setScene(current => order[(order.indexOf(current) + 1) % order.length]);
      setAnimationEpoch(epoch => epoch + 1);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [displayMode]);
  const data = datasets[category];
  const completion = Math.round((data.completed / data.scheduled) * 100);
  const rangeFactor = range === "Today" ? 1 : range === "Week" ? 5 : 18;
  const kpis = useMemo(() => [
    { label: "Tasks scheduled", value: data.scheduled * rangeFactor, meta: "+2 vs average", icon: "▦", color: "blue" },
    { label: "Tasks completed", value: data.completed * rangeFactor, meta: `${completion}% of plan`, icon: "✓", color: "green" },
    { label: "Completion rate", value: `${completion}%`, meta: "+8% this period", icon: "↗", color: "orange" },
    { label: "Work remaining", value: `${(data.hours * rangeFactor).toFixed(1)}h`, meta: "From estimates", icon: "◷", color: "purple" },
    { label: "XP earned", value: data.xp * rangeFactor, meta: "160 to next level", icon: "✦", color: "gold" },
  ], [data, completion, rangeFactor]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">▥</span><strong>Orchestrator</strong><span className="private">● Private</span></div>
        <nav className="range-tabs" aria-label="Time range">
          {(["Today", "Week", "Month"] as Range[]).map(item => <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>{item}</button>)}
        </nav>
        <div className="header-actions"><button className={displayMode ? "display-active" : ""} onClick={() => setDisplayMode(value => !value)}>◉ {displayMode ? "Exit display" : "Display mode"}</button><button onClick={() => setFiltersOpen(!filtersOpen)}>⌁ Filters</button><button aria-label="Settings">•••</button></div>
      </header>

      <section className={`dashboard scene-${scene.toLowerCase()} ${displayMode ? "cinematic" : ""}`}>
        <div className="intro">
          <div><p className="eyebrow">TODAY INTELLIGENCE</p><h1>Command your day.</h1><p>Live task signals, energy capacity and momentum in one focused surface.</p></div>
          <div className="live"><span></span> Live data · Sunday, Jul 19</div>
        </div>

        <nav className="world-tabs" aria-label="Dashboard layer">
          {(["Now", "Today", "Journey"] as Scene[]).map(item => <button key={item} className={scene === item ? "active" : ""} onClick={() => { setScene(item); setAnimationEpoch(epoch => epoch + 1); }}><i />{item}<small>{item === "Now" ? "Act" : item === "Today" ? "Balance" : "Grow"}</small></button>)}
        </nav>

        <section className="orchestrator-core-panel" aria-label="Orchestrator Core">
          <div className="core-copy"><p className="eyebrow">ORCHESTRATOR CORE</p><h2>{scene === "Now" ? "Your best next move." : scene === "Today" ? "The shape of your day." : "Momentum becoming mastery."}</h2><p>{scene === "Now" ? "High focus capacity detected. One deep block fits before your energy shifts." : scene === "Today" ? "Demand and capacity are balanced. Your plan is ambitious, but achievable." : "Eight meaningful completions are building your next reward."}</p><button onClick={() => setScene(scene === "Now" ? "Today" : "Now")}>{scene === "Now" ? "View full day" : "Focus now"} →</button></div>
          <button className="core-machine" onClick={() => setAnimationEpoch(epoch => epoch + 1)} aria-label="Replay core animation">
            <span className="core-orbit orbit-a"><i /></span><span className="core-orbit orbit-b"><i /></span><span className="core-orbit orbit-c"><i /></span>
            <span className="core-shell" style={{ "--core-progress": `${completion * 3.6}deg` } as React.CSSProperties}><span className="core-inner"><b>{completion}%</b><small>aligned</small></span></span>
            <span className="core-shadow" />
          </button>
          <div className="core-signals"><div><span>Mental</span><strong>{mental}%</strong><i><b style={{width:`${mental}%`}} /></i></div><div><span>Physical</span><strong>{physical}%</strong><i><b style={{width:`${physical}%`}} /></i></div><div><span>Focus</span><strong>{focus}%</strong><i><b style={{width:`${focus}%`}} /></i></div></div>
        </section>

        {filtersOpen && <div className="filter-panel"><span>Showing</span><strong>{category}</strong><span>tasks for</span><strong>{range}</strong><button onClick={() => { setCategory("All"); setRange("Today"); }}>Reset filters</button></div>}

        <div className="kpi-grid" key={`kpi-${animationEpoch}-${range}-${category}`}>
          {kpis.map((kpi, i) => <article role="button" tabIndex={0} onClick={() => setActiveMetric(activeMetric === kpi.label ? null : kpi.label)} className={`kpi-card ${kpi.color} ${activeMetric === kpi.label ? "metric-active" : ""}`} key={`${kpi.label}-${range}-${category}`} style={{ "--delay": `${i * 60}ms` } as React.CSSProperties}>
            <div className="kpi-face kpi-front"><div className="kpi-top"><span>{kpi.label}</span><Icon>{kpi.icon}</Icon></div><ClayNumber value={kpi.value} accent={kpi.color}/><small>{kpi.meta}</small><div className="mini-bars">{[2,4,3,6,5,8,7].map((h,j)=><i key={j} style={{height:`${h*2}px`}} />)}</div></div>
            <div className="kpi-face kpi-back"><span>INSIGHT</span><strong>{i === 0 ? "Plan is focused" : i === 1 ? "Momentum is rising" : i === 2 ? "Above your average" : i === 3 ? "One deep block" : "Reward is close"}</strong><small>Hover away to return</small></div>
          </article>)}
        </div>

        <section className="task-world" aria-label="Living task world">
          <div className="task-world-heading"><div><p className="eyebrow">NOW → NEXT</p><h2>Tasks in motion</h2></div><p>{activeMetric ? `Showing tasks connected to ${activeMetric.toLowerCase()}.` : "The plan responds to your energy and available time."}</p></div>
          <div className="task-river">
            {tasks.map((task,index) => { const done = completedTasks.includes(task.id); return <article key={task.id} className={`world-task ${task.color} ${done ? "task-done" : ""} ${index === 0 && !done ? "task-active" : ""}`}>
              <div className="task-energy"><i/><i/><i/></div><span className="task-rarity">{done ? "COMPLETE" : task.rarity}</span><h3>{task.title}</h3><div className="task-meta"><span>{task.kind}</span><strong>{task.time}</strong></div><button onClick={() => setCompletedTasks(current => current.includes(task.id) ? current.filter(id => id !== task.id) : [...current, task.id])}>{done ? "↶ Undo" : "✓ Complete"}</button>{done && <div className="completion-ripple" />}
            </article>})}
          </div>
        </section>

        <div className="control-grid" key={`control-${animationEpoch}-${range}-${category}`}>
          <article className="panel energy-panel">
            <div className="panel-heading"><div><p className="eyebrow">CAPACITY</p><h2>Energy controls</h2></div><span className="chip">LIVE INPUT</span></div>
            <div className="sliders">
              {[{name:"Mental",value:mental,set:setMental,color:"#42b8ff"},{name:"Physical",value:physical,set:setPhysical,color:"#ff4e79"},{name:"Focus",value:focus,set:setFocus,color:"#ff9d2e"}].map(item => <label className="capsule-control" key={item.name}>
                <div className="capsule"><div className="capsule-fill" style={{height:`${item.value}%`,background:item.color}}></div><div className="capsule-knob" style={{bottom:`calc(${item.value}% - 17px)`,background:item.color}}><b>{item.value}</b></div><input type="range" min="0" max="100" value={item.value} onChange={e=>item.set(Number(e.target.value))}/></div>
                <span>{item.name}</span>
              </label>)}
            </div>
          </article>

          <article className="panel bar-panel">
            <div className="panel-heading"><div><p className="eyebrow">OUTPUT</p><h2>Planned vs completed</h2></div><span className="delta">↑ 8%</span></div>
            <div className="bars" aria-label="Planned versus completed work">
              {bars.map((v,i)=><div className="bar-pair" key={i}><div className="bar planned" style={{height:`${v*9}px`}} title={`${v} planned`}></div><div className="bar complete" style={{height:`${Math.max(2,v-(i%3))*9}px`}} title={`${Math.max(2,v-(i%3))} completed`}></div><span>{["M","T","W","T","F","S","S"][i]}</span></div>)}
            </div>
            <div className="legend"><span><i className="planned-key"/>Planned</span><span><i className="complete-key"/>Completed</span></div>
          </article>

          <article className="panel donut-panel">
            <div className="panel-heading"><div><p className="eyebrow">FLOW</p><h2>Task state</h2></div><span className="chip">{data.scheduled} TOTAL</span></div>
            <Donut values={data.state} colors={["#46d9a1","#36b6ff","#59647a","#ff8a34"]} center={`${completion}%`} label="complete" />
            <div className="legend compact"><span><i style={{background:"#46d9a1"}}/>Done</span><span><i style={{background:"#36b6ff"}}/>Active</span><span><i style={{background:"#59647a"}}/>Open</span><span><i style={{background:"#ff8a34"}}/>Past due</span></div>
          </article>
        </div>

        <div className="insight-grid" key={`insight-${animationEpoch}-${range}-${category}`}>
          <article className="panel trend-panel">
            <div className="panel-heading"><div><p className="eyebrow">MOMENTUM</p><h2>Seven-day completion</h2></div><strong className="big-stat">66% <small>avg.</small></strong></div>
            <LineChart />
            <div className="days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
          </article>

          <article className="panel rarity-panel">
            <div className="panel-heading"><div><p className="eyebrow">COLLECTION</p><h2>Rarity mix</h2></div><span className="chip">THIS {range.toUpperCase()}</span></div>
            <Donut values={data.rarity} colors={["#7c879c","#3c8cff","#b35cff","#ffb42b"]} center={String(data.scheduled)} label="cards" />
            <div className="rarity-list">{[["Common","#7c879c"],["Rare","#3c8cff"],["Epic","#b35cff"],["Legendary","#ffb42b"]].map((r,i)=><button key={r[0]}><i style={{background:r[1]}}/>{r[0]}<strong>{Math.round(data.scheduled*data.rarity[i]/100)}</strong></button>)}</div>
          </article>

          <article className="panel categories-panel">
            <div className="panel-heading"><div><p className="eyebrow">CHANNEL</p><h2>Task category</h2></div><span className="chip">FILTER</span></div>
            <div className="category-controls">{(["All","Focus","Health","Career","Personal"] as Category[]).map((item,i)=><button key={item} className={category===item?"selected":""} onClick={()=>setCategory(item)}><span>{["◎","◆","✚","▲","●"][i]}</span>{item}</button>)}</div>
            <div className="xp-track"><div><span>Level 7</span><strong>{data.xp} / 500 XP</strong></div><div className="track"><i style={{width:`${Math.min(100,data.xp/5)}%`}}/></div><small>Next reward: Electric border</small></div>
          </article>
        </div>
      </section>
      <footer><span>ORCHESTRATOR ANALYTICS LAB</span><span>All systems responsive</span></footer>
    </main>
  );
}
