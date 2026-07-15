import { createContext, useContext, useState, type ReactNode } from 'react';
const ToastContext=createContext<(message:string)=>void>(()=>{});
export function ToastProvider({children}:{children:ReactNode}){const [message,setMessage]=useState('');return <ToastContext.Provider value={(text)=>{setMessage(text);setTimeout(()=>setMessage(''),4000)}}>{children}{message?<div role="status" className="toast">{message}</div>:null}</ToastContext.Provider>}
export const useToast=()=>useContext(ToastContext);
