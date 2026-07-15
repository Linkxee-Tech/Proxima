'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useIntegrations() { const [items,setItems]=useState<any[]>([]);const load=useCallback(async()=>{const data=await apiFetch('/api/integrations');setItems(data.items||[]);return data;},[]);useEffect(()=>{load();},[load]);return {items,load,connect:(name:string)=>apiFetch(`/api/tools/${name}/connect`,{method:'POST',body:'{}'}),disconnect:(name:string)=>apiFetch(`/api/tools/${name}/disconnect`,{method:'DELETE'}).then(load)}; }
