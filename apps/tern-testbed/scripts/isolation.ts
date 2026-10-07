import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { sway } from '@e2e-dev/sway';
import type { TernRequest,TernLease } from '@e2e-dev/tern';
import { nativeOptions } from '../native-options.ts';
import { nativeControl,nativeField,focusField,waitField } from './control.ts';
const directory=await mkdtemp(join(tmpdir(),'e2e-iso-')),runId=randomUUID(),provider=sway({...nativeOptions(),root:directory});
const request:TernRequest={runId,targetName:'two-leases',attemptId:'agent',workerSlot:0,projectRoot:fileURLToPath(new URL('..',import.meta.url)),app:{appPath:process.execPath,launchArguments:[fileURLToPath(new URL('../src/controls.mjs',import.meta.url))]},env:{PATH:process.env.PATH},artifactsDir:join(directory,'artifacts'),signal:AbortSignal.timeout(180000)};
await mkdir(request.artifactsDir,{mode:0o700});const leases:TernLease[]=[];
try {
  const results=await Promise.allSettled([provider.acquire(request),provider.acquire({...request,attemptId:'sentinel',workerSlot:1})]);
  for(const result of results)if(result.status==='fulfilled')leases.push(result.value);
  for(const result of results)if(result.status==='rejected')throw result.reason;
  const [agent,sentinel]=leases as [TernLease,TernLease];assert.notEqual(agent.id,sentinel.id);assert.notEqual(agent.env.XDG_RUNTIME_DIR,sentinel.env.XDG_RUNTIME_DIR);assert.notEqual(agent.env.HOME,sentinel.env.HOME);assert.notEqual(agent.client!.pid,sentinel.client!.pid);
  await focusField(sentinel,request.signal);await sentinel.input!.type('human-sentinel',request.signal);await waitField(sentinel,'human-sentinel',request.signal);await sentinel.input!.press('ArrowLeft',request.signal);
  const before=await nativeField(sentinel,request.signal);assert.equal(before.focused,true);
  await focusField(agent,request.signal);await agent.input!.type('original',request.signal);await agent.input!.press('Control+A',request.signal);await agent.input!.type('replaced',request.signal);await waitField(agent,'replaced',request.signal);
  assert.deepEqual(await nativeField(sentinel,request.signal),before,'other native lease value/focus is untouched');
  await sentinel.input!.type('!',request.signal);await waitField(sentinel,'human-sentine!l',request.signal); // actual insertion position proves the caret, not a draft receipt.
  await provider.release(agent,{signal:AbortSignal.timeout(30000),timeoutMs:30000});leases.splice(leases.indexOf(agent),1);
  await sentinel.input!.press('End',request.signal);await sentinel.input!.type('?',request.signal);await waitField(sentinel,'human-sentine!l?',request.signal);
  await nativeControl(sentinel,'state',request.signal);console.log('Real concurrent native leases: input/caret/focus and cleanup ownership remain separate');
} finally { for(const lease of leases)await provider.release(lease,{signal:AbortSignal.timeout(30000),timeoutMs:30000});await provider.sweep!(request,{signal:AbortSignal.timeout(30000),timeoutMs:30000});await rm(directory,{recursive:true}); }
