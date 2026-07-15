'use client';
import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useSocial() { const [scheduled,setScheduled]=useState<any[]>([]);const load=useCallback(async()=>{const data=await apiFetch('/api/social/scheduled');setScheduled(data.items||[]);return data;},[]);return {scheduled,load,publish:(payload:unknown)=>apiFetch('/api/social/publish',{method:'POST',body:JSON.stringify(payload)}),cancel:(id:string)=>apiFetch(`/api/social/${id}`,{method:'DELETE'}).then(load)}; }
