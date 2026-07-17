'use client';

import Icon from './Icon';
import MagicInput from './MagicInput';

export default function ChatPanel({ messages = [], value, onChange, onSubmit, busy }) {
  return <section className="panel rail"><div className="panel-header"><div><p className="eyebrow with-icon"><Icon name="message" size={14} /> Conversation</p><h2>Launch a workflow</h2></div><span className="section-icon"><Icon name="spark" /></span></div><div className="chat-history">{messages.map((message, index) => <p className={message.role === 'assistant' ? 'chat-assistant' : 'chat-user'} key={index}><span className="chat-avatar"><Icon name={message.role === 'assistant' ? 'command' : 'user'} size={14} /></span>{message.content}</p>)}</div><MagicInput value={value} onChange={onChange} onSubmit={onSubmit} busy={busy} /></section>;
}
