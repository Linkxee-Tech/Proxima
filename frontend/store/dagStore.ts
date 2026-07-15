import { create } from 'zustand';
type Node = { id:string; [key:string]: unknown }; type Edge = { id?:string; source:string; target:string; [key:string]: unknown };
type State = { nodes:Node[]; edges:Edge[]; history:{nodes:Node[];edges:Edge[]}[]; setGraph:(nodes:Node[],edges:Edge[])=>void; undo:()=>void };
export const useDAGStore = create<State>((set,get)=>({nodes:[],edges:[],history:[],setGraph:(nodes,edges)=>set((state)=>({nodes,edges,history:[...state.history,{nodes:state.nodes,edges:state.edges}].slice(-20)})),undo:()=>{const previous=get().history.at(-1);if(previous)set((state)=>({nodes:previous.nodes,edges:previous.edges,history:state.history.slice(0,-1)}));}}));
