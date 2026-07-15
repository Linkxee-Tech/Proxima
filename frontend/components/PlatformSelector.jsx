'use client';

const platforms = [['twitter', '🐦 Twitter / X'], ['linkedin', '🔗 LinkedIn'], ['facebook', '📘 Facebook'], ['whatsapp', '💬 WhatsApp']];
export default function PlatformSelector({ selected, onChange }) { const toggle = (platform) => onChange(selected.includes(platform) ? selected.filter((item) => item !== platform) : [...selected, platform]); return <div className="platform-selector"><button type="button" className="ghost" onClick={() => onChange(selected.length === platforms.length ? [] : platforms.map(([id]) => id))}>{selected.length === platforms.length ? 'Deselect all' : 'Select all'}</button>{platforms.map(([id, label]) => <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} /> {label}</label>)}</div>; }
