import type { InputHTMLAttributes } from 'react';
export function Input({error,helperText,...props}:{error?:string;helperText?:string}&InputHTMLAttributes<HTMLInputElement>){return <label className="field"><input {...props} aria-invalid={!!error}/>{error?<small className="auth-error">{error}</small>:helperText?<small>{helperText}</small>:null}</label>}
