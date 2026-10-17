import {ref,onScopeDispose} from 'vue';
export function createUndoNotifications({duration=15000,schedule=setTimeout,cancel=clearTimeout}={}){
 const entries=ref([]),timers=new Map();let sequence=0;
 function dismiss(id){if(timers.has(id))cancel(timers.get(id));timers.delete(id);entries.value=entries.value.filter(row=>row.id!==id);}
 function push(message,action,canUndo=()=>true){const id=++sequence;entries.value.push({id,message,action,canUndo,busy:false,error:''});timers.set(id,schedule(()=>dismiss(id),duration));return id;}
 async function undo(id){const entry=entries.value.find(row=>row.id===id);if(!entry||entry.busy||!entry.canUndo())return false;entry.busy=true;entry.error='';try{if(await entry.action()===false)return false;dismiss(id);return true;}catch(error){entry.error=error.message||'Restauration impossible.';return false;}finally{entry.busy=false;}}
 return {entries,push,dismiss,undo,clear(){for(const id of [...timers.keys()])dismiss(id);}};
}
export const undoNotifications=createUndoNotifications();
// A callback must not restore data belonging to a view that has been left.
export function useUndoNotifications(){const own=new Set();onScopeDispose(()=>{for(const id of own)undoNotifications.dismiss(id);});return {...undoNotifications,push(...args){const id=undoNotifications.push(...args);own.add(id);return id;},clear(){for(const id of own)undoNotifications.dismiss(id);own.clear();}};}
