'use client';

import Icon from './Icon';

const platforms = [['twitter', 'Twitter / X'], ['linkedin', 'LinkedIn'], ['facebook', 'Facebook'], ['whatsapp', 'WhatsApp']];
export default function PlatformSelector({ selected, onChange }) {
  const toggle = (platform) => onChange(selected.includes(platform) ? selected.filter((item) => item !== platform) : [...selected, platform]);
  return <div className="platform-selector"><button type="button" className="ghost with-icon" onClick={() => onChange(selected.length === platforms.length ? [] : platforms.map(([id]) => id))}><Icon name={selected.length === platforms.length ? 'x' : 'check'} size={15} /> {selected.length === platforms.length ? 'Deselect all' : 'Select all'}</button>{platforms.map(([id, label]) => <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} /><Icon name={id} size={16} /> <span>{label}</span></label>)}</div>;
}
