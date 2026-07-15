'use client';
import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useAnalytics() { const [data,setData]=useState<any>(null);const load=useCallback(async()=>{const next=await apiFetch('/api/social/analytics');setData(next);return next;},[]);return {data,load}; }
