const worker = new Worker(new URL('../codec-worker.js', import.meta.url), { type: 'module' });
let requestId = 0;
const pending = new Map();
worker.onmessage = ({ data }) => {
  const task = pending.get(data.id);
  if (!task) return;
  pending.delete(data.id);
  if (data.error) task.reject(Object.assign(new Error(data.error), { name: data.aborted ? 'AbortError' : 'Error' }));
  else task.resolve(data.result);
};
worker.onerror = () => {
  for (const task of pending.values()) task.reject(new Error('Unable to run the codec in this browser.'));
  pending.clear();
};
export const call = (operation, fields = {}) => new Promise((resolve, reject) => {
  const id = ++requestId; pending.set(id, { resolve, reject }); worker.postMessage({ id, operation, ...fields });
});
