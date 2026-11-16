/** Shared semantic adapter helpers. Pure, synchronous, dependency-free. */
export const line = (step,text) => ({step,text})
export const code = (source) => source.trim().split('\n').map(row => {
  const match=/^\s*\[([\w-]+)\]\s?(.*)$/.exec(row)
  if (!match) throw new Error('Every reference line needs a [step] marker')
  return line(match[1],match[2])
})
export const snapshot = value => JSON.parse(JSON.stringify(value))
export const frame = (step,label,note,state={}) => ({step,label,note,state:snapshot(state)})
export function arrayInput(value, max=32) {
  if (!Array.isArray(value) || value.length>max || !value.every(Number.isSafeInteger)) throw new Error('Use an integer array of at most '+max+' elements for this walkthrough')
  return value.slice()
}
export function stringInput(value,max=40) {
  if (typeof value!=='string'||value.length>max) throw new Error('Use a string of at most '+max+' characters for this walkthrough')
  return value
}
export function treeInput(level,max=31) {
  if (!Array.isArray(level)||level.length>max||!level.every(v=>v===null||Number.isSafeInteger(v))) throw new Error('Use a level-order tree of at most '+max+' entries')
  if (!level.length||level[0]===null) return {root:null,nodes:[],edges:[]}
  let id=0,cursor=1
  const root={id:id++,value:level[0],left:null,right:null},queue=[root],nodes=[root],edges=[]
  for(let head=0;head<queue.length && cursor<level.length;head++) {
    const parent=queue[head]
    for(const side of ['left','right']) {
      if(cursor>=level.length) break
      const value=level[cursor++]
      if(value===null) continue
      const child={id:id++,value,left:null,right:null}
      parent[side]=child;queue.push(child);nodes.push(child);edges.push([parent.id,child.id])
    }
  }
  return {root,nodes:nodes.map(({id,value})=>({id,value})),edges}
}

/**
 * Reduce long runs without inventing intermediate states. Single compaction point:
 * adapters return FULL frame lists (plus optional anchor indices) and this function
 * performs the only sampling pass, so skip counts are measured against the original
 * events and the "skipped" prefix is applied exactly once.
 * Preserve first/last events; anchors (pedagogical frames) survive when budget allows.
 */
function uniformPick(n,count) {
  if(count<=0) return []
  if(count>=n) return Array.from({length:n},(_,i)=>i)
  if(count===1) return [0]
  const out=[0]
  for(let i=1;i<count-1;i++) out.push(Math.floor(i*(n-1)/(count-1)))
  out.push(n-1)
  return [...new Set(out)]
}
export function boundedFrames(frames,limit=40,anchors=[]) {
 // `selected` (sorted global indices that survived sampling) is additive metadata
 // for the drilldown pager; it never changes which frames are picked.
 if(frames.length<=limit) return {frames,omitted:0,selected:frames.map((_,i)=>i)}
  const must=[...new Set([0,...anchors.filter(i=>Number.isInteger(i)&&i>=0&&i<frames.length),frames.length-1])].sort((a,b)=>a-b)
  let selected
  if(must.length>=limit) {
    // Anchors alone exceed budget: sample the anchors uniformly (first/last kept).
    selected=uniformPick(must.length,limit).map(i=>must[i])
  } else {
    const inMust=new Set(must)
    const pool=[]
    for(let i=0;i<frames.length;i++) if(!inMust.has(i)) pool.push(i)
    const take=uniformPick(pool.length,limit-must.length).map(i=>pool[i])
    selected=[...must,...take].sort((a,b)=>a-b)
  }
  const output=selected.map((index,i)=>{
    const omitted=i?index-selected[i-1]-1:0
    const original=frames[index]
    return {...original,note:(omitted?`${omitted} intermediate ${omitted===1?'event':'events'} skipped. `:'')+original.note}
  })
  return {frames:output,omitted:frames.length-output.length,selected}
}
