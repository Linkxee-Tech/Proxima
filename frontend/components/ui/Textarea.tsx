import type { TextareaHTMLAttributes } from 'react';
export function Textarea(props:TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea {...props} onInput={e=>{e.currentTarget.style.height='auto';e.currentTarget.style.height=`${e.currentTarget.scrollHeight}px`;props.onInput?.(e)}}/>}
