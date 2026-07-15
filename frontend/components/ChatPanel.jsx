'use client';
import MagicInput from './MagicInput';
export default function ChatPanel({ messages = [], value, onChange, onSubmit, busy }) { return <section className="panel rail"><div className="panel-header"><div><p className="eyebrow">Conversation</p><h2>Launch a workflow</h2></div></div><div className="chat-history">{messages.map((message, index) => <p className={message.role === 'assistant' ? 'chat-assistant' : 'chat-user'} key={index}>{message.content}</p>)}</div><MagicInput value={value} onChange={onChange} onSubmit={onSubmit} busy={busy} /></section>; }
