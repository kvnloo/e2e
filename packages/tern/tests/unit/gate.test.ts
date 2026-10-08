import { expect,test } from 'vitest';
import { requireNativeGate } from '../../src/gate.ts';
test('only an explicitly non-applying native vendor gate permits app semantics',()=>{expect(()=>requireNativeGate({gate:{applies:false}})).not.toThrow();for(const state of [null,false,[],{},{gate:null},{gate:{}},{gate:{applies:true,phase:'signed-out',signed_in:false}},{gate:{applies:'false'}}])expect(()=>requireNativeGate(state)).toThrow();});
