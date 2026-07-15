'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useMemory() { const [items,setItems]=useState<any[]>([]); const [loading,setLoading]=useState(true); const load=useCallback(async(q='')=>{setLoading(true);try{const result=await apiFetch(`/api/memory?q=${encodeURIComponent(q)}`);setItems(result.items||[]);return result;}finally{setLoading(false);}},[]); useEffect(()=>{load();},[load]); return {items,loading,load,create:(text:string)=>apiFetch('/api/memory',{method:'POST',body:JSON.stringify({text})}).then(load),update:(id:string,text:string)=>apiFetch(`/api/memory/${id}`,{method:'PUT',body:JSON.stringify({text})}).then(load),remove:(id:string)=>apiFetch(`/api/memory/${id}`,{method:'DELETE'}).then(load)}; }
