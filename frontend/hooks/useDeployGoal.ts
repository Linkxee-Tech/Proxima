'use client';
import { useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
export function useDeployGoal() { const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const deploy=async(goalText:string)=>{setLoading(true);setError('');try{return await apiFetch('/api/deploy',{method:'POST',body:JSON.stringify({goalText})});}catch(err){const message=err instanceof Error?err.message:'Deploy failed';setError(message);throw err;}finally{setLoading(false);}}; return {deploy,loading,error}; }
