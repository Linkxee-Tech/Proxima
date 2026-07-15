'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useApprovals() { const [items,setItems]=useState<any[]>([]); const load=useCallback(async(status='pending')=>{const result=await apiFetch(`/api/approvals?status=${status}`);setItems(result.items||[]);return result;},[]);useEffect(()=>{load();},[load]);const action=(id:string,type:'approve'|'reject'|'defer')=>apiFetch(`/api/approvals/${id}/${type}`,{method:'POST',body:'{}'}).then(()=>load());return {items,load,action}; }
