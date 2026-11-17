let worker, requestId = 0;
const pending = new Map();
function startWorker() {
  const current = new Worker(new URL('./worker-entry.js', import.meta.url), {type: 'module'});
  worker = current;
  current.onmessage = ({data}) => {
    if (worker !== current) return;
    const task = pending.get(data.id);
    if (!task) return;
    pending.delete(data.id);
    if (data.error) task.reject(Object.assign(new Error(data.error), {name: data.aborted ? 'AbortError' : 'Error'}));
    else task.resolve(data.result);
  };
  current.onerror = () => {
    if (worker !== current) return;
    for (const task of pending.values()) task.reject(new Error('Unable to run the codec in this browser.'));
    pending.clear();
  };
}
startWorker();
export const call = (operation, fields = {}) => new Promise((resolve, reject) => {
  const id = ++requestId; pending.set(id, {resolve, reject}); worker.postMessage({id, operation, ...fields});
});
export function restartEngine() {
  worker.terminate();
  for (const task of pending.values()) task.reject(Object.assign(new Error('Loading restarted.'), {name: 'AbortError'}));
  pending.clear(); startWorker();
  return call('init');
}
