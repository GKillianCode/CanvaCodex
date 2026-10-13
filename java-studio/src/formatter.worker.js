import { formatJava } from './formatter.js';
self.onmessage = async ({ data }) => {
  try { self.postMessage({ id: data.id, ...(await formatJava(data.code)) }); }
  catch { self.postMessage({ id: data.id, ok: false, code: data.code }); }
};
