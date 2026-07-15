'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useMemory(query = '') { const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); useEffect(() => { let active = true; setLoading(true); apiFetch(`/api/memory/search?q=${encodeURIComponent(query)}`).then((result) => active && setItems(result.items || [])).catch(() => active && setItems([])).finally(() => active && setLoading(false)); return () => { active = false; }; }, [query]); return { items, loading }; }
