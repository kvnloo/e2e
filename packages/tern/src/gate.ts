import { EngineError } from 'e2e/engine';
/** AX may describe a hidden app beneath vendor sign-in. Unknown gates fail closed. */
export function requireNativeGate(state:Readonly<Record<string,unknown>>):void {
  const gate=state.gate;
  if(!gate||typeof gate!=='object'||Array.isArray(gate)||(gate as {applies?:unknown}).applies!==false)throw new EngineError('NOT_ACTIONABLE','Native Tern vendor gate is active or unknown; a licensed preprovisioned isolated test profile is required',{retryable:false});
}
