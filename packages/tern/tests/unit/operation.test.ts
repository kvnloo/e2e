import { expect,test } from 'vitest';
import { setTimeout as delay } from 'node:timers/promises';
import { withinOperation } from '../../src/operation.ts';
import type { OperationContext } from 'e2e/engine';
const context=(timeoutMs:number):OperationContext=>({timeoutMs,signal:new AbortController().signal,runId:'deadline',attemptId:'actual-budget',origin:'test'});
test('sequential inspections consume one budget and cannot dispatch after expiration',async()=>{
  let dispatched=false;
  await expect(withinOperation(context(30),async bounded=>{const first=bounded.timeoutMs;await delay(15,undefined,{signal:bounded.signal});expect(bounded.timeoutMs).toBeLessThan(first);await delay(40,undefined,{signal:bounded.signal});bounded.signal.throwIfAborted();dispatched=true;})).rejects.toThrow();expect(dispatched).toBe(false);
});
test('parent cancellation follows the same compositor dispatch signal',async()=>{
  const abort=new AbortController();let dispatched=false;
  await expect(withinOperation({...context(1000),signal:abort.signal},async bounded=>{abort.abort();bounded.signal.throwIfAborted();dispatched=true;})).rejects.toThrow();expect(dispatched).toBe(false);
});
