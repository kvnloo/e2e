import { expect,test,vi } from 'vitest';
import { withinOperation } from '../../src/operation.ts';
import type { OperationContext } from 'e2e/engine';
const context=(timeoutMs:number):OperationContext=>({timeoutMs,signal:new AbortController().signal,runId:'deadline',attemptId:'actual-budget',origin:'test'});
test('sequential inspections consume one budget and cannot dispatch after expiration',async()=>{
  vi.useFakeTimers();let dispatched=false, inspected!:()=>void;const inspection=new Promise<void>(resolve=>{inspected=resolve;});
  try{
    const pending=withinOperation(context(30),async bounded=>{const first=bounded.timeoutMs;await inspection;expect(bounded.timeoutMs).toBeLessThan(first);await new Promise<void>((_,reject)=>bounded.signal.addEventListener('abort',()=>reject(bounded.signal.reason),{once:true}));dispatched=true;});
    const rejected=expect(pending).rejects.toThrow();vi.advanceTimersByTime(15);inspected();await vi.advanceTimersByTimeAsync(20);await rejected;expect(dispatched).toBe(false);
  }finally{vi.useRealTimers();}
});
test('parent cancellation follows the same compositor dispatch signal',async()=>{
  const abort=new AbortController();let dispatched=false;
  await expect(withinOperation({...context(1000),signal:abort.signal},async bounded=>{abort.abort();bounded.signal.throwIfAborted();dispatched=true;})).rejects.toThrow();expect(dispatched).toBe(false);
});
