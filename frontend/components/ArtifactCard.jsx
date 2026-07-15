'use client';
export default function ArtifactCard({ artifact, onDownload }) { return <article className="artifact"><div className="artifact-head"><div><h4>{artifact.title}</h4><small>{artifact.type}</small></div><button type="button" className="ghost" onClick={() => onDownload?.(artifact)}>Download</button></div><pre>{artifact.content}</pre></article>; }
