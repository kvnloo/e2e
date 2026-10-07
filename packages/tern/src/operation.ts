import { Deadline, type OperationContext } from 'e2e/engine';

/** One action budget, including every inspection, guard and compositor dispatch. */
export async function withinOperation<T>(context: OperationContext, perform: (bounded: OperationContext) => Promise<T>): Promise<T> {
  context.signal.throwIfAborted();
  const deadline=new Deadline(Math.max(1,context.timeoutMs));
  const timer=new AbortController();
  const handle=setTimeout(()=>timer.abort(new Error('Native operation deadline expired')),Math.max(1,context.timeoutMs));
  const signal=AbortSignal.any([context.signal,timer.signal]);
  const bounded={...context,signal,get timeoutMs(){signal.throwIfAborted();const remaining=deadline.remaining();if(!remaining){timer.abort(new Error('Native operation deadline expired'));signal.throwIfAborted();}return remaining;}};
  try{return await perform(bounded);}finally{clearTimeout(handle);}
}
