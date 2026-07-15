'use client';
import { useEffect, useState } from 'react';
import { ToastProvider } from '../ui/Toast';
export default function Providers({ children }) { const [ready,setReady]=useState(false); useEffect(()=>{ document.documentElement.dataset.theme=localStorage.getItem('proxima_theme') || 'dark'; setReady(true); },[]); return <ToastProvider>{ready ? children : null}</ToastProvider>; }
