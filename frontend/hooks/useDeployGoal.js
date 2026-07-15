'use client';
import { useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useDeployGoal() { const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const deploy = async (goalText) => { setLoading(true); setError(''); try { return await apiFetch('/api/workflows', { method: 'POST', body: JSON.stringify({ goalText }) }); } catch (err) { setError(err.message); throw err; } finally { setLoading(false); } }; return { deploy, loading, error }; }
