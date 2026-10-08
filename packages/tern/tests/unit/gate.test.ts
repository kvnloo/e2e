import { expect,test } from 'vitest';
import { requireNativeState } from '../../src/control.ts';

test.each([
  undefined, null, {}, {applies:true,phase:'signed-out',signed_in:false}, {applies:'false'},
])('rejects an active or unknown vendor gate despite a matching pane',gate=>{
  expect(()=>requireNativeState({gate,panes:[{id:7}],focused:{id:7}},'7')).toThrow(expect.objectContaining({code:'NOT_ACTIONABLE',retryable:false}));
});

test.each([
  {panes:[],focused:{id:7}},
  {panes:[{id:7},{id:8}],focused:{id:7}},
  {panes:[{id:8}],focused:{id:8}},
  {panes:[{id:7}],focused:{id:8}},
  {panes:[{id:7}],focused:null},
])('rejects a lost leased single-pane owner even with an inactive gate',state=>{
  expect(()=>requireNativeState({gate:{applies:false},...state},'7')).toThrow(expect.objectContaining({code:'NOT_ACTIONABLE',retryable:false}));
});
