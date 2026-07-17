import Icon from './Icon';

export default function ConnectionStatus({ name, connected, scopes=[], onConnect, onDisconnect }: { name:string; connected:boolean; scopes?:string[]; onConnect:()=>void; onDisconnect:()=>void }) {
  return <article className="connection-card"><div className="with-icon"><span className={`section-icon ${connected ? 'success' : ''}`}><Icon name={connected ? 'link' : 'plug'} /></span><div><strong>{name}</strong><p className={connected?'connected':'muted'}>{connected ? 'Connected' : 'Disconnected'}</p><small>{scopes.join(', ')}</small></div></div><button className={connected?'secondary':'primary'} onClick={connected?onDisconnect:onConnect}>{connected ? <><Icon name="x" size={15} /> Disconnect</> : <><Icon name="link" size={15} /> Connect OAuth</>}</button></article>;
}
