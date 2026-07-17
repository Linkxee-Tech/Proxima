import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Icon from '../Icon';
export function Button({variant='default',size='md',loading,children,className='',...props}:{variant?:'default'|'destructive'|'outline'|'secondary'|'ghost'|'link';size?:'sm'|'md'|'lg'|'xl';loading?:boolean;children:ReactNode}&ButtonHTMLAttributes<HTMLButtonElement>){return <button {...props} disabled={loading||props.disabled} className={`button button-${variant} button-${size} ${className}`}>{loading?<><Icon name="activity" size={15}/> Loading…</>:children}</button>}
