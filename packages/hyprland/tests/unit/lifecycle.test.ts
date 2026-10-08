import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {mkdir,mkdtemp,readdir,readFile,writeFile,symlink,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {join} from 'node:path';
import {describe,expect,test} from 'vitest';
import {hyprland,type HyprlandOptions} from '../../src/index.ts';
import {processIdentity,stillOwned} from '@e2e-dev/sway';
import type {TernRequest} from '@e2e-dev/tern';

// Protocol-only controller fixture: real files, Unix socket ownership and kernel
// generations exercise the public adapter. This is not native rendering proof.
async function fixture(){
  const directory=await mkdtemp('/tmp/hp-'),nativeRoot=await mkdtemp('/tmp/ht-'),runtime=join(directory,'run'),journals=join(directory,'journals');
  await mkdir(join(runtime,'hypr','fixture'),{recursive:true,mode:0o700});await mkdir(journals,{mode:0o700});
  const servers=[createServer(),createServer()];
  for(const [index,path]of [join(runtime,'wayland-1'),join(runtime,'hypr','fixture','.socket.sock')].entries()){const ready=once(servers[index]!,'listening');servers[index]!.listen(path);await ready;}
  const host=await processIdentity(process.pid);await writeFile(join(runtime,'hypr','fixture','hyprland.lock'),`${host.pid}\nwayland-1\n`);
  const human={id:1,name:'human',width:1920,height:1080,scale:1,x:0,y:0,activeWorkspace:{id:1,name:'1'},specialWorkspace:{id:0},focused:true,disabled:false};
  const data={version:{version:'0.56.2'},monitors:[human],clients:[],workspaces:[{id:1,name:'1',monitorID:1,windows:0,ispersistent:false}],workspacerules:[],activewindow:{address:'0xhuman'},cursorpos:{x:1,y:2}};
  const stateFile=join(directory,'ipc.json'),binary=join(directory,'controller');
  await writeFile(stateFile,JSON.stringify(data));
  await writeFile(binary,`#!${process.execPath}\nconst fs=require('node:fs');const path=require('node:path');const file=path.join(path.dirname(process.argv[1]),'ipc.json');const data=JSON.parse(fs.readFileSync(file,'utf8'));const args=process.argv.slice(2);if(args.includes('-j')){process.stdout.write(JSON.stringify(data[args.at(-1)]));}else if(args.includes('remove')){data.monitors=data.monitors.filter(m=>m.name!==args.at(-1));fs.writeFileSync(file,JSON.stringify(data));process.stdout.write('ok');}else process.exit(2);\n`,{mode:0o700});
  const input=join(directory,'input');await writeFile(input,`#!${process.execPath}\nconst fs=require('node:fs'),path=require('node:path');if(process.argv[2]!=='close')process.exit(2);fs.writeFileSync(path.join(path.dirname(process.argv[3]),'.closing'),'',{mode:0o600});\n`,{mode:0o700});
  const options:HyprlandOptions={host:{instance:'fixture',runtimeDir:runtime,waylandDisplay:'wayland-1',hyprctl:binary,process:host},protectedOutputs:['human'],protectedWorkspaces:[1],root:journals,nativeRoot,sway:{binaries:{sway:process.execPath,swaymsg:process.execPath,tern:process.execPath,grim:process.execPath,input}}};
  const request:TernRequest={runId:'lifecycle',targetName:'consumer',attemptId:'first',workerSlot:0,projectRoot:directory,app:{appPath:process.execPath},env:{},artifactsDir:join(directory,'artifacts'),signal:new AbortController().signal};
  const root=join(journals,createHash('sha256').update(request.runId).update('\0').update(request.targetName).digest('hex').slice(0,24));
  const attempt=join(root,'attempt-owned'),childRoot=join(nativeRoot,'s-abcdef');
  const record={version:1,runId:request.runId,targetName:request.targetName,directory:attempt,childRoot,host,existingWorkspaces:[1],output:`e2e-${'a'.repeat(32)}`,tag:`e2e-${'a'.repeat(32)}`,workspace:'owned',artifactsDir:request.artifactsDir};
  const save=async(extra:Record<string,unknown>={})=>{await mkdir(attempt,{recursive:true,mode:0o700});await writeFile(join(attempt,'lease.json'),JSON.stringify({...record,...extra}));};
  const close=async()=>{for(const server of servers){const closed=once(server,'close');server.close();await closed;}await rm(directory,{recursive:true});await rm(nativeRoot,{recursive:true});};
  return{directory,nativeRoot,options,request,root,attempt,childRoot,record,data,stateFile,save,close};
}
const cleanup=()=>({signal:new AbortController().signal,timeoutMs:1000});
describe.skipIf(process.platform!=='linux')('Linux public containment lifecycle',()=>{
test('artifact allocation failure removes the already-journaled empty child root',async()=>{
  const f=await fixture();try{const blocked=join(f.directory,'not-a-directory');await writeFile(blocked,'inert');await expect(hyprland(f.options).acquire({...f.request,artifactsDir:join(blocked,'artifacts')})).rejects.toThrow();expect(await readdir(f.nativeRoot)).toEqual([]);expect(await readdir(f.root)).toEqual([]);}finally{await f.close();}
});
test('pre-journal worker death and already-removed child cleanup are recoverable',async()=>{
  const f=await fixture();try{await mkdir(f.attempt,{recursive:true,mode:0o700});await writeFile(join(f.attempt,'lease.next'),'incomplete');await hyprland(f.options).sweep!(f.request,cleanup());await expect(readFile(join(f.attempt,'lease.next'))).rejects.toMatchObject({code:'ENOENT'});await f.save();await hyprland(f.options).sweep!(f.request,cleanup());expect(await readdir(f.nativeRoot)).toEqual([]);await expect(readdir(f.root)).rejects.toMatchObject({code:'ENOENT'});}finally{await f.close();}
});
test('cleanup refuses a foreign empty active workspace even without a live child',async()=>{
  const f=await fixture();try{await f.save({outputRequested:true,outputId:2,workspaceId:3,workspaceOriginalName:'3',workspaceRenamed:true});f.data.monitors.push({...f.data.monitors[0]!,id:2,name:f.record.output,focused:false,activeWorkspace:{id:4,name:'foreign-empty'}});await writeFile(f.stateFile,JSON.stringify(f.data));await expect(hyprland(f.options).sweep!(f.request,cleanup())).rejects.toThrow('workspace identity');expect(JSON.parse(await readFile(f.stateFile,'utf8')).monitors).toHaveLength(2);expect(await readFile(join(f.attempt,'lease.json'),'utf8')).toContain('owned');}finally{await f.close();}
});
test('cleanup refuses changed owned-output geometry and a forged guest generation',async()=>{
  const f=await fixture();try{const output={...f.data.monitors[0]!,id:2,name:f.record.output,focused:false,activeWorkspace:{id:3,name:'owned'}};f.data.monitors.push({...output,scale:2});await writeFile(f.stateFile,JSON.stringify(f.data));const extra={outputRequested:true,outputId:2,workspaceId:3,workspaceRenamed:true,workspaceOriginalName:'3'};await f.save({...extra,outputGeometry:{x:0,y:0,width:1920,height:1080,scale:1}});await expect(hyprland(f.options).sweep!(f.request,cleanup())).rejects.toThrow('geometry changed');f.data.monitors[1]=output;await writeFile(f.stateFile,JSON.stringify(f.data));const parent=await processIdentity(process.ppid),receipt=join(f.directory,'guest-receipt.json');await writeFile(receipt,JSON.stringify(parent));await f.save({...extra,identityFile:receipt});await expect(hyprland(f.options).sweep!(f.request,cleanup())).rejects.toThrow('independently verified descendant');expect(await stillOwned(parent)).toBe(true);}finally{await f.close();}
});
test('guest-writable ancestors and symlinks cannot become cleanup journals',async()=>{
  const f=await fixture();try{const guestJournals=join(f.nativeRoot,'journals');await mkdir(guestJournals,{mode:0o700});const alias=join(f.directory,'alias');await symlink(guestJournals,alias);for(const root of [guestJournals,alias])await expect(hyprland({...f.options,root}).acquire(f.request)).rejects.toThrow('guest-writable root');}finally{await f.close();}
});
});
