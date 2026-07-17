'use client';

import Icon from './Icon';

const iconFor = (type = '') => {
  const value = type.toLowerCase();
  if (value.includes('spread') || value.includes('csv')) return 'fileSpreadsheet';
  if (value.includes('pdf') || value.includes('report')) return 'fileChart';
  if (value.includes('zip') || value.includes('archive')) return 'fileArchive';
  if (value.includes('code') || value.includes('json')) return 'fileCode';
  return 'fileText';
};

export default function ArtifactCard({ artifact, onDownload }) {
  return <article className="artifact"><div className="artifact-head"><div className="with-icon"><span className="artifact-icon"><Icon name={iconFor(artifact.type)} /></span><div><h4>{artifact.title}</h4><small>{artifact.type}</small></div></div><button type="button" className="ghost with-icon" onClick={() => onDownload?.(artifact)}><Icon name="download" size={15} /> Download</button></div><pre>{artifact.content}</pre></article>;
}
