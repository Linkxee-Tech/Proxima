'use client';

import Icon from './Icon';

export default function SocialPostCard({ platform, text, limit, onChange, image }) {
  const label = platform === 'twitter' ? 'Twitter / X' : platform[0].toUpperCase() + platform.slice(1);
  return <article className="social-post-card"><div className="social-preview-heading"><span className={`platform-icon platform-${platform}`}><Icon name={platform} size={16} /></span><strong>{label}</strong><span className={text.length > limit ? 'count-over' : 'muted'}>{text.length}/{limit}</span></div>{image ? <img src={image.url} alt="Campaign asset" className="social-image-preview" /> : <div className="image-placeholder"><Icon name="image" size={22} /> No image attached</div>}<textarea value={text} onChange={(event) => onChange(platform, event.target.value)} rows={6} /></article>;
}
