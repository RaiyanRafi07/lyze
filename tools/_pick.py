import json,glob,re,collections
recs=[]
for f in sorted(glob.glob('plugin/data/shard-*.json')):
    recs.extend(json.load(open(f,encoding='utf-8'))['problems'])
jud=[r for r in recs if r['judge']]
def susp(ret,e):
    e=e.strip()
    if ret in ('int','long'): return not re.fullmatch(r'-?\d+',e)
    if ret=='double': return not re.fullmatch(r'-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?',e)
    if ret=='boolean': return e not in ('true','false')
    if ret=='char': return not (len(e)==1 or (len(e)>=3 and e[0]==e[-1] and e[0] in '"\''))
    if ret=='string': return not (len(e)>=2 and e[0]=='"' and e[-1]=='"')
    if ret in ('ListNode','TreeNode') or ret.endswith('[]'): return not (e.startswith('[') and e.endswith(']'))
    return False
bad=collections.defaultdict(list)
for r in jud:
    ret=r['judge']['signature']['return']
    for t in r['judge']['tests']:
        if susp(ret,t['expected']): bad[r['slug']].append((ret,t['expected'][:100]))
print('problems with suspicious expected:',len(bad))
for s,v in sorted(bad.items()): print(' ',s,v[:2])
