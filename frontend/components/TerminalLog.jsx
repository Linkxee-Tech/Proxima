'use client';
export default function TerminalLog({ entries = [] }) { return <div className="terminal-log">{entries.length ? entries.map((entry) => <p key={entry.id || entry.at}>{entry.message}</p>) : <p className="muted">Waiting for workflow events…</p>}</div>; }
