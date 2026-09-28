"use client";

import { useEffect, useState } from "react";
import { PieChart } from "lucide-react";

const THEMES = [
  { id: "zola", label: "Zola" },
  { id: "ocean", label: "Ocean" },
  { id: "slate", label: "Slate" }
];

export function ThemeSelector() {
  const [theme, setTheme] = useState("zola");
  useEffect(() => { const stored = localStorage.getItem("zola_theme") ?? "zola"; setTheme(stored); document.documentElement.dataset.theme = stored; }, []);
  function choose(next: string) { setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("zola_theme", next); }
  return <label className="theme-selector" title="Colour theme"><PieChart size={16} /><select value={theme} onChange={(event) => choose(event.target.value)} aria-label="Colour theme">{THEMES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>;
}
