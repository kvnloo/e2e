import assert from 'node:assert/strict';
import { execFile, fork } from 'node:child_process';
import { promisify } from 'node:util';
import { access, lstat, readlink, mkdir, mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { swayDisplay, processIdentity, stillOwned } from '@e2e-dev/sway';
import { hyprland, type HyprlandOptions } from '@e2e-dev/hyprland';
import type { TernLease, TernRequest } from '@e2e-dev/tern';
import { nativeOptions } from '../native-options.ts';
import { nativeControl, nativeField, focusField, waitField } from './control.ts';
const exec=promisify(execFile);
const required=(name:string)=>{const value=process.env[name];assert(value&&value.startsWith('/'),`explicit absolute ${name} is required`);return value;};
const binaries=nativeOptions().binaries, hyprlandBinary=required('E2E_HYPRLAND_BINARY'), hyprctl=required('E2E_HYPRCTL_BINARY'), bwrap=required('E2E_BWRAP_BINARY'), render=required('E2E_RENDER_DEVICE');
assert(/^\/dev\/dri\/renderD\d+$/.test(render));assert((await lstat(render)).isCharacterDevice());await access(render,constants.R_OK|constants.W_OK);
assert(process.getuid?.()!==0,'no root or permission changes');
const directory=await mkdtemp('/tmp/hy-'), runtime=join(directory,'run'), artifacts=resolve('apps/tern-testbed/.e2e-hyprland');
const repo=fileURLToPath(new URL('../../../',import.meta.url)), app=fileURLToPath(new URL('../src/controls.mjs',import.meta.url));
for(const name of ['run','home','config','cache','state','native'])await mkdir(join(directory,name),{mode:0o700});
await mkdir(artifacts,{recursive:true,mode:0o700});
const signal=AbortSignal.timeout(180000), cleanup=()=>({signal:AbortSignal.timeout(30000),timeoutMs:30000});
const request:TernRequest={runId:randomUUID(),targetName:'hyprland-boundary',attemptId:'real-boundary',workerSlot:0,projectRoot:repo,app:{appPath:process.execPath,launchArguments:[app]},env:{PATH:'/usr/bin:/bin'},artifactsDir:artifacts,signal};
const outer=await swayDisplay({...nativeOptions(),root:join(directory,'o'),size:{width:1920,height:1080},renderer:'gles2',renderDevice:render},request);
let provider:ReturnType<typeof hyprland>|undefined, lease:TernLease|undefined, human:TernLease|undefined;
const quote=(value:string)=>`'${value.replaceAll("'","'\\''")}'`;
let host:HyprlandOptions['host']|undefined;
const ctl=async(args:string[],json=false)=>{assert(host);const {stdout}=await exec(hyprctl,['-i',host.instance,...json?['-j']:[],...args],{env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',XDG_RUNTIME_DIR:runtime,HYPRLAND_INSTANCE_SIGNATURE:host.instance},signal,timeout:5000});if(json)return JSON.parse(stdout) as unknown;assert.equal(stdout.trim(),'ok');return undefined;};
try {
  const config=join(directory,'fixture.conf');
  await writeFile(config,'monitor = , 1920x1080@60, auto, 1\nxwayland { enabled = false }\nmisc { disable_hyprland_logo = true; disable_splash_rendering = true; focus_on_activate = false }\ngeneral { gaps_in = 0; gaps_out = 0; border_size = 0 }\n',{mode:0o600});
  // Keep host PID coordinates for lock/start-time checks. A user namespace is not a PID namespace.
  const args=['--die-with-parent','--unshare-user','--unshare-ipc','--unshare-net','--unshare-uts','--uid',String(process.getuid!()),'--gid',String(process.getgid!()),'--cap-drop','ALL','--ro-bind','/usr','/usr','--ro-bind','/proc','/proc','--ro-bind','/sys','/sys','--dev','/dev','--tmpfs','/run','--tmpfs','/tmp','--tmpfs','/etc','--bind',directory,directory,'--dev-bind',render,render];
  for(const path of ['/bin','/lib','/lib64']){try{const stat=await lstat(path);args.push(...stat.isSymbolicLink()?['--symlink',await readlink(path),path]:['--ro-bind',path,path]);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
  for(const path of ['/etc/ld.so.cache','/etc/fonts']){try{await access(path);args.push('--ro-bind',path,path);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
  const parentSocket=join(outer.env.XDG_RUNTIME_DIR!,outer.env.WAYLAND_DISPLAY!);
  args.push('--ro-bind',parentSocket,parentSocket);
  for(const path of new Set([join(repo,'packages'),join(repo,'apps','tern-testbed'),join(repo,'node_modules'),process.execPath,...Object.values(binaries),hyprlandBinary,hyprctl])){if(!path.startsWith('/usr/')&&!path.startsWith('/bin/'))args.push('--ro-bind',path,path);}
  const env={PATH:'/usr/bin:/bin',LANG:'C.UTF-8',HOME:join(directory,'home'),XDG_CONFIG_HOME:join(directory,'config'),XDG_CACHE_HOME:join(directory,'cache'),XDG_STATE_HOME:join(directory,'state'),XDG_RUNTIME_DIR:runtime,WAYLAND_DISPLAY:parentSocket,HYPRLAND_NO_RT:'1',AQ_DRM_DEVICES:render};
  args.push('--clearenv');for(const [key,value]of Object.entries(env))args.push('--setenv',key,value);
  args.push('--chdir',directory,hyprlandBinary,'--config',config);
  await outer.spawn(bwrap,args,signal);
  const deadline=Date.now()+30000;
  for(;;){let entries:string[]=[];try{entries=await readdir(join(runtime,'hypr'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    if(entries.length===1){try{const instance=entries[0]!;const lines=(await readFile(join(runtime,'hypr',instance,'hyprland.lock'),'utf8')).trim().split('\n');await access(join(runtime,'hypr',instance,'.socket.sock'));host={instance,runtimeDir:runtime,waylandDisplay:lines[1]!,hyprctl};break;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
    assert(Date.now()<deadline,'sandboxed Hyprland must become ready without a physical fallback');await delay(25,undefined,{signal});}
  const version=await ctl(['version'],true) as {version:string;commit:string};assert.equal(version.version,'0.56.2');assert.equal(version.commit,'efb50993780079460b0cbed1363e2166a2de1d9f');
  const status=await ctl(['status'],true) as {backend:string};assert.equal(status.backend,'wayland');
  const first=await ctl(['monitors'],true) as Array<{name:string;activeWorkspace:{id:number}}> ;assert.equal(first.length,1);
  await ctl(['output','create','headless','fixture-secondary']);
  const protectedMonitors=await ctl(['monitors'],true) as Array<{name:string;activeWorkspace:{id:number}}> ;assert.equal(protectedMonitors.length,2);
  const control=join(directory,'human.sock'), identityFile=join(directory,'human-process.json');
  const humanEnv={...env,WAYLAND_DISPLAY:host.waylandDisplay};
  await ctl(['dispatch','exec',`exec /usr/bin/env -i ${[...Object.entries(humanEnv).map(([k,v])=>`${k}=${v}`),binaries.input,'exec-owned',identityFile,binaries.tern,'--control',control].map(quote).join(' ')}`]);
  human={id:'inert-human',pane:'1',mode:'native',control,binary:binaries.tern,env:humanEnv};
  for(;;){try{await nativeControl(human,'state',signal);break;}catch(error){if(Date.now()>=deadline)throw error;await delay(25,undefined,{signal});}}
  await nativeControl(human,'ready',signal);await nativeControl(human,`run ${JSON.stringify([process.execPath,app].map(quote).join(' '))}`,signal);
  await waitField(human,'',signal);await focusField(human,signal);await nativeControl(human,'type "human-sentinel"',signal);await waitField(human,'human-sentinel',signal);await nativeControl(human,'key "ArrowLeft"',signal);
  const before=await nativeField(human,signal);
  const options:HyprlandOptions={host,protectedOutputs:protectedMonitors.map(m=>m.name),protectedWorkspaces:[...new Set([1,2,8,...protectedMonitors.map(m=>m.activeWorkspace.id)])],root:join(directory,'leases'),nativeRoot:directory,sway:{...nativeOptions(),size:{width:1280,height:900}}};
  assert.throws(()=>hyprland({...options,workspace:'fixture-protected',protectedWorkspaces:[...options.protectedWorkspaces,'fixture-protected']}));
  await assert.rejects(hyprland({...options,protectedOutputs:['missing-declared-output']}).acquire({...request,runId:randomUUID()}));
  const occupied='fixture-occupied';const ws=protectedMonitors[0]!.activeWorkspace.id;
  await ctl(['dispatch','renameworkspace',`${ws} ${occupied}`]);await assert.rejects(hyprland({...options,workspace:occupied}).acquire({...request,runId:randomUUID()}));await ctl(['dispatch','renameworkspace',`${ws} ${ws}`]);
  provider=hyprland(options);lease=await provider.acquire(request);await waitField(lease,'',signal);await focusField(lease,signal);
  const identity=lease.client!;assert(await stillOwned(identity));await lease.input!.type('original',signal);await waitField(lease,'original',signal);await lease.input!.press('Control+A',signal);await lease.input!.type('replaced',signal);await waitField(lease,'replaced',signal);await lease.input!.press('End',signal);await lease.input!.type('?',signal);await waitField(lease,'replaced?',signal);
  assert.deepEqual(await nativeField(human,signal),before,'protected native value/focus are unchanged');
  const dump=await nativeControl(lease,'dump button',signal) as unknown as {elements:Array<{visible:boolean;rect:number[]}>};const buttons=dump.elements.filter(e=>e.visible);assert.equal(buttons.length,1);const rect=buttons[0]!.rect;await lease.input!.tap!(rect[0]!+rect[2]!/2,rect[1]!+rect[3]!/2,signal);
  const clickedDeadline=Date.now()+30000;
  for(;;){const ax=await nativeControl(lease,'a11y',signal),tree=await nativeControl(lease,'tree',signal);if(JSON.stringify(ax).includes('Count: 1')&&JSON.stringify(tree).includes('Count: 1'))break;assert(Date.now()<clickedDeadline,'pointer must produce the actual native rendered count');await delay(25,undefined,{signal});}
  const png=Buffer.from(await lease.capture!(signal));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),900);await writeFile(join(artifacts,'owned-output.png'),png,{mode:0o600});
  const ownedOutputs=(await ctl(['monitors'],true) as Array<{name:string;activeWorkspace:{name:string}}>).filter(m=>!options.protectedOutputs.includes(m.name));assert.equal(ownedOutputs.length,1);
  const foreignRoot=join(directory,'foreign');await mkdir(foreignRoot,{mode:0o700});for(const name of ['run','home','config','cache','state'])await mkdir(join(foreignRoot,name),{mode:0o700});
  const foreignFile=join(foreignRoot,'process.json'),foreignConfig=join(foreignRoot,'sway.conf');
  await writeFile(foreignConfig,'xwayland disable\noutput WL-1 mode 1280x900 scale 1\n',{mode:0o600});
  const foreignEnv={PATH:'/usr/bin:/bin',LANG:'C.UTF-8',HOME:join(foreignRoot,'home'),XDG_CONFIG_HOME:join(foreignRoot,'config'),XDG_CACHE_HOME:join(foreignRoot,'cache'),XDG_STATE_HOME:join(foreignRoot,'state'),XDG_RUNTIME_DIR:join(foreignRoot,'run'),WAYLAND_DISPLAY:join(runtime,host.waylandDisplay),WLR_BACKENDS:'wayland',WLR_RENDERER:'pixman',WLR_WL_OUTPUTS:'1',WLR_LIBINPUT_NO_DEVICES:'1'};
  try{
    await ctl(['dispatch','exec',`[monitor ${ownedOutputs[0]!.name}; workspace name:${ownedOutputs[0]!.activeWorkspace.name} silent; tag +fixture-foreign; no_initial_focus on; no_focus on] exec /usr/bin/env -i ${[...Object.entries(foreignEnv).map(([k,v])=>`${k}=${v}`),binaries.input,'exec-owned',foreignFile,binaries.sway,'--config',foreignConfig].map(quote).join(' ')}`]);
    const foreignDeadline=Date.now()+30000;for(;;){const clients=await ctl(['clients'],true) as Array<{tags:string[];mapped:boolean}>;if(clients.some(c=>c.mapped&&c.tags.some(t=>t==='fixture-foreign'||t==='fixture-foreign*')))break;assert(Date.now()<foreignDeadline,'actual foreign client must map');await delay(25,undefined,{signal});}
    await assert.rejects(lease.guard!(signal));await assert.rejects(provider.release(lease,cleanup()));
    assert(await stillOwned(identity),'foreign cleanup refusal must not kill the leased native client');assert.deepEqual(await nativeField(human,signal),before);
  }finally{
    await exec(binaries.input,['stop',foreignFile],{env:{PATH:'/usr/bin:/bin'},signal:AbortSignal.timeout(30000),timeout:30000});
    const foreignDeadline=Date.now()+15000;while((await ctl(['clients'],true) as Array<{tags:string[]}>).some(c=>c.tags.some(t=>t==='fixture-foreign'||t==='fixture-foreign*'))){assert(Date.now()<foreignDeadline,'exact fixture foreign process must disappear');await delay(25,undefined,{signal});}
  }
  for(const workerSignal of ['SIGKILL','SIGTERM','SIGINT'] as const){
    const workerRequest={...request,runId:randomUUID(),attemptId:workerSignal,signal:undefined};
    const payload=join(directory,`worker-${workerSignal}.json`);await writeFile(payload,JSON.stringify({options,request:workerRequest}),{mode:0o600});
    const worker=fork(fileURLToPath(new URL('./hyprland-worker.ts',import.meta.url)),[payload],{env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8'},stdio:['ignore','inherit','inherit','ipc']});
    try{
      const receipt=await new Promise<TernLease>((accept,reject)=>{const timer=setTimeout(()=>reject(new Error('Real containment worker did not become ready')),90000);worker.once('message',value=>{clearTimeout(timer);accept(value as TernLease);});worker.once('error',error=>{clearTimeout(timer);reject(error);});worker.once('exit',()=>{clearTimeout(timer);reject(new Error('Real containment worker exited before native proof'));});});
      assert(receipt.client&&await stillOwned(receipt.client));assert.equal((await nativeField(receipt,signal)).value,'interrupted-owned-client');
      const exited=once(worker,'exit');worker.kill(workerSignal);await exited;
      assert(await stillOwned(receipt.client),'owned native client survives worker termination before recovery');
      await hyprland(options).sweep!({...request,runId:workerRequest.runId},cleanup());
      assert.equal(await stillOwned(receipt.client),false);assert.deepEqual(await nativeField(human,signal),before);
    }finally{if(worker.exitCode===null&&worker.signalCode===null){const exited=once(worker,'exit');worker.kill('SIGKILL');await exited;}await hyprland(options).sweep!({...request,runId:workerRequest.runId},cleanup());}
  }
  assert.deepEqual(await nativeField(human,signal),before);assert.deepEqual(await processIdentity(identity.pid),identity);
  const endedClient=join(directory,'ended-client.json');await writeFile(endedClient,JSON.stringify(identity),{mode:0o600});
  await exec(binaries.input,['stop',endedClient],{env:{PATH:'/usr/bin:/bin'},signal:AbortSignal.timeout(30000),timeout:30000});await assert.rejects(lease.guard!(signal),'actual exited native generation must refuse inspection');
  await provider.release(lease,cleanup());lease=undefined;await provider.sweep!(request,cleanup());assert.equal(await stillOwned(identity),false);
  const fixtureOptions=join(directory,'cli-options.json');await writeFile(fixtureOptions,JSON.stringify(options),{mode:0o600});
  const cli=await exec(process.execPath,[join(repo,'packages/e2e/dist/cli/bin.js'),'run','--config',join(repo,'apps/tern-testbed/e2e.hyprland.config.ts'),'--output',join(artifacts,'cli'),'--workers','2','--retries','0','--no-cache','--reporter','list,markdown'],{cwd:repo,env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',E2E_TELEMETRY_DISABLED:'1',E2E_HYPRLAND_FIXTURE_OPTIONS:fixtureOptions},signal,timeout:90000,maxBuffer:16*1024*1024});
  await writeFile(join(artifacts,'cli.txt'),`${cli.stdout}\n${cli.stderr}`,{mode:0o600});
  assert.deepEqual(await nativeField(human,signal),before);
  await nativeControl(human,'type "!"',signal);await waitField(human,'human-sentine!l',signal);
  const after=await ctl(['monitors'],true) as Array<{name:string}>;assert.deepEqual(after.map(m=>m.name).sort(),protectedMonitors.map(m=>m.name).sort());
  console.log('Real sandboxed Hyprland boundary: independent native value/caret/focus, chord, pointer, PNG and owned cleanup');
} finally {
  try {if(lease&&provider)await provider.release(lease,cleanup());if(provider)await provider.sweep!(request,cleanup());}
  finally {await outer.release(cleanup());await rm(directory,{recursive:true});}
}
