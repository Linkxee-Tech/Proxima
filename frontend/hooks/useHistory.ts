'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useHistory() { const [items,setItems]=useState<any[]>([]); const load=useCallback(async(query='')=>{const result=await apiFetch(`/api/history${query?`?${query}`:''}`);setItems(result.items||[]);return result;},[]);useEffect(()=>{load();},[load]);return {items,load,rerun:(id:string)=>apiFetch(`/api/history/${id}/rerun`,{method:'POST',body:'{}'}).then(()=>load())}; }
