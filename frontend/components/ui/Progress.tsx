export function Progress({value,max=100}:{value:number;max?:number}){return <progress value={value} max={max} aria-label={`${value}% complete`}/>} 
