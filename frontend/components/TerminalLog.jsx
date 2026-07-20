'use client';

import Icon from './Icon';

export default function TerminalLog({ entries = [] }) { return <div className="terminal-log">{entries.length ? entries.map((entry) => <p key={entry.id || entry.at}><Icon name="chevron" size={12} /> {entry.message}</p>) : <p className="muted"><Icon name="activity" size={13} /> Waiting for work updates…</p>}</div>; }
