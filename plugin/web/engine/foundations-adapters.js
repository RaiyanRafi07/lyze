import { code,frame,arrayInput } from './semantic-core.js'

function reference(javaSignature,cppSignature,javaBody,cppBody,pseudo) {
  return {
    java:code(`[structure] class Solution {\n[signature]     public ${javaSignature} {\n${javaBody}\n[structure]     }\n[structure] }`),
    cpp:code(`[structure] class Solution {\n[structure] public:\n[signature]     ${cppSignature} {\n${cppBody}\n[structure]     }\n[structure] };`),
    pseudo:code(pseudo),
  }
}

const runningCode=reference('int[] runningSum(int[] nums)','vector<int> runningSum(vector<int>& nums)',
`[init]         // The first value is already its own prefix sum.
[loop]         for (int i = 1; i < nums.length; i++) {
[update]             nums[i] += nums[i - 1];
[loop]         }
[done]         return nums;`,
`[init]         // The first value is already its own prefix sum.
[loop]         for (int i = 1; i < (int)nums.size(); i++) {
[update]             nums[i] += nums[i - 1];
[loop]         }
[done]         return nums;`,
`[init] runningSum(nums): the first value is already a prefix
[loop]   for i from 1 to length(nums)-1:
[update]     nums[i] = nums[i] + nums[i-1]
[done]   return nums`)

const pivotCode=reference('int pivotIndex(int[] nums)','int pivotIndex(vector<int>& nums)',
`[init]         int total = 0; for (int x : nums) total += x;
[init]         int left = 0;
[loop]         for (int i = 0; i < nums.length; i++) {
[compare]             int right = total - left - nums[i];
[found]             if (left == right) return i;
[advance]             left += nums[i];
[loop]         }
[done]         return -1;`,
`[init]         int total = accumulate(nums.begin(), nums.end(), 0);
[init]         int left = 0;
[loop]         for (int i = 0; i < (int)nums.size(); i++) {
[compare]             int right = total - left - nums[i];
[found]             if (left == right) return i;
[advance]             left += nums[i];
[loop]         }
[done]         return -1;`,
`[init] pivotIndex(nums): total = sum(nums); left = 0
[loop]   for i from 0 to length(nums)-1:
[compare]     right = total - left - nums[i]
[found]     if left == right: return i
[advance]     left = left + nums[i]
[done]   return -1`)

function recurrence(slug,method,bases,initialNote,max,explain,explainLines) {
  const [zero,one]=bases
  const body=`[init]         int[] dp = new int[Math.max(2, n + 1)];
[base]         dp[0] = ${zero}; dp[1] = ${one};
[loop]         for (int i = 2; i <= n; i++) {
[update]             dp[i] = dp[i - 1] + dp[i - 2];
[loop]         }
[done]         return dp[n];`
  const cpp=`[init]         vector<int> dp(max(2, n + 1));
[base]         dp[0] = ${zero}; dp[1] = ${one};
[loop]         for (int i = 2; i <= n; i++) {
[update]             dp[i] = dp[i - 1] + dp[i - 2];
[loop]         }
[done]         return dp[n];`
  return {
    signature:{name:method,params:['int'],return:'int'},
    lesson:{idea:initialNote,trap:'The base cases define the sequence. Fibonacci starts at 0,1; stair counts start at 1,1.',time:'O(n)',space:'O(n) for the displayed table'},
    // Optional per-line explanations (presentation metadata, never compiled).
    explain,
    explainLines,
    code:reference(`int ${method}(int n)`,`int ${method}(int n)`,body,cpp,
`[init] ${method}(n): allocate dp[0..n]
[base]   dp[0] = ${zero}; dp[1] = ${one}
[loop]   for i from 2 to n:
[update]     dp[i] = dp[i-1] + dp[i-2]
[done]   return dp[n]`),
    build([n]) {
      if(!Number.isInteger(n)||n<0||n>max) throw new Error(`Use n between 0 and ${max} for this visual table. The code runner supports the problem's full constraints.`)
      const values=new Array(Math.max(2,n+1)).fill(null),frames=[]
      const state=(extra={})=>({values:values.slice(),...extra})
      frames.push(frame('init','Allocate the table',initialNote,state()))
      values[0]=zero;values[1]=one
      frames.push(frame('base','Initialize the base cases',`dp[0]=${zero}; dp[1]=${one}.`,state({highlights:{0:'ok',1:'ok'}})))
      for(let i=2;i<=n;i++) {
        const a=values[i-1],b=values[i-2];values[i]=a+b
        frames.push(frame('update',`Compute dp[${i}]`,`dp[${i}] = dp[${i-1}] + dp[${i-2}] = ${a} + ${b} = ${values[i]}.`,state({pointers:{i,prev:i-1,prev2:i-2},highlights:{[i]:'accent',[i-1]:'ok',[i-2]:'ok'},vars:{i,result:values[i]}})))
      }
      frames.push(frame('done','Return the answer',`Return dp[${n}] = ${values[n]}.`,state({highlights:{[n]:'ok'},vars:{answer:values[n]}})))
      return {kind:'array',layout:{values:new Array(values.length).fill(null),label:slug==='fibonacci-number'?'dp[i] · Fibonacci number i':'dp[i] · ways to reach stair i'},frames,result:values[n]}
    }
  }
}

const robberCode=reference('int rob(int[] nums)','int rob(vector<int>& nums)',
`[init]         int[] dp = new int[nums.length + 1];
[loop]         for (int i = 1; i <= nums.length; i++) {
[compare]             int skip = dp[i - 1];
[compare]             int take = nums[i - 1] + (i > 1 ? dp[i - 2] : 0);
[update]             dp[i] = Math.max(skip, take);
[loop]         }
[done]         return dp[nums.length];`,
`[init]         vector<int> dp(nums.size() + 1);
[loop]         for (int i = 1; i <= (int)nums.size(); i++) {
[compare]             int skip = dp[i - 1];
[compare]             int take = nums[i - 1] + (i > 1 ? dp[i - 2] : 0);
[update]             dp[i] = max(skip, take);
[loop]         }
[done]         return dp[nums.size()];`,
`[init] rob(nums): dp[0..n] = zeros
[loop]   for i from 1 to n:
[compare]     skip = dp[i-1]; take = nums[i-1] + (dp[i-2] if i>1 else 0)
[update]     dp[i] = max(skip, take)
[done]   return dp[n]`)

// Visual bounds: the walkthrough renders the whole dp[0..amount] table plus
// per-amount relax notes, so it stays tiny and rejects larger inputs with a
// clear error instead of truncating. The code runner keeps full constraints.
const MAX_COIN_N = 5;
const MIN_COIN_VAL = 1;
const MAX_COIN_VAL = 20;
const MAX_COIN_AMOUNT = 12;

function decodeCoins(value) {
  if (!Array.isArray(value)) throw new Error('Provide coins as an integer array for this visual table');
  if (value.length < 1 || value.length > MAX_COIN_N) throw new Error(`Visual walkthrough needs coins length 1..${MAX_COIN_N} (${value.length} given)`);
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error(`coins[${k}] must be a safe integer`);
    if (value[k] < MIN_COIN_VAL || value[k] > MAX_COIN_VAL) throw new Error(`Visual walkthrough needs coin values 1..20 (coins[${k}]=${value[k]} given)`);
  }
  return value.slice();
}

function decodeAmount(value) {
  if (!Number.isSafeInteger(value)) throw new Error('Provide amount as an integer for this visual table');
  if (value < 0 || value > MAX_COIN_AMOUNT) throw new Error(`Visual walkthrough needs amount 0..${MAX_COIN_AMOUNT} (${value} given)`);
  return value;
}

const coinChangeJava = code(`
[structure] class Solution {
[signature]     public int coinChange(int[] coins, int amount) {
[init]         int INF = amount + 1;
[init]         int[] dp = new int[amount + 1];
[base]         dp[0] = 0;
[base]         for (int i = 1; i <= amount; i++) dp[i] = INF;
[loop]         for (int i = 1; i <= amount; i++) {
[relax]             int best = INF;
[relax]             for (int coin : coins) {
[relax]                 if (coin <= i && dp[i - coin] != INF) best = Math.min(best, dp[i - coin] + 1);
[structure]             }
[relax]             dp[i] = best;
[structure]         }
[done]         return dp[amount] == INF ? -1 : dp[amount];
[structure]     }
[structure] }
`);

const coinChangeCpp = code(`
[structure] #include <algorithm>
[structure] #include <vector>
[structure] using namespace std;
[structure] class Solution {
[structure] public:
[signature]     int coinChange(vector<int>& coins, int amount) {
[init]         int INF = amount + 1;
[init]         vector<int> dp(amount + 1, INF);
[base]         dp[0] = 0;
[loop]         for (int i = 1; i <= amount; i++) {
[relax]             int best = INF;
[relax]             for (int coin : coins) {
[relax]                 if (coin <= i && dp[i - coin] != INF) best = min(best, dp[i - coin] + 1);
[structure]             }
[relax]             dp[i] = best;
[structure]         }
[done]         return dp[amount] == INF ? -1 : dp[amount];
[structure]     }
[structure] };
`);

const coinChangePseudo = code(`
[init] coinChange(coins, amount): INF = amount + 1; allocate dp[0..amount]
[base]   dp[0] = 0; dp[1..amount] = INF (unreachable so far)
[loop]   for i from 1 to amount:
[relax]     best = min of dp[i-c]+1 over coins c<=i from solved states, else INF; dp[i] = best
[done]   return -1 if dp[amount] == INF else dp[amount]
`);

function buildCoinChange(args) {
  const coins = decodeCoins(args[0]);
  const amount = decodeAmount(args[1]);
  const INF = amount + 1;
  // Uncomputed cells stay null (rendered unset), never 0 or INF: placeholders
  // would masquerade as computed entries before their relax event.
  const dp = new Array(amount + 1).fill(null);
  const frames = [];
  const state = (extra = {}) => ({ values: dp.slice(), ...extra });

  frames.push(frame('init', 'Allocate the table', `Allocate dp[0..${amount}]; nothing computed yet.`, state()));
  for (let i = 0; i <= amount; i++) dp[i] = INF;
  dp[0] = 0;
  frames.push(frame(
    'base',
    'Seed the base cases',
    amount === 0 ? 'dp[0]=0: empty amount needs no coins.' : `dp[0]=0; dp[1..${amount}]=INF=${INF} so far.`,
    state({ highlights: { 0: 'ok' } })
  ));

  for (let i = 1; i <= amount; i++) {
    frames.push(frame(
      'loop',
      `Consider amount ${i}`,
      `Try every coin c<=${i} via dp[${i}-c]+1.`,
      state({ pointers: { i }, vars: { i } })
    ));
    let best = INF;
    let via = -1;
    const parts = [];
    for (const c of coins) {
      if (c > i) continue;
      if (dp[i - c] !== INF) {
        parts.push(`c=${c}->${dp[i - c] + 1}`);
        if (dp[i - c] + 1 < best) { best = dp[i - c] + 1; via = c; }
      } else {
        parts.push(`c=${c}->INF`);
      }
    }
    dp[i] = best;
    const note = best !== INF
      ? `Best of ${parts.join(', ')}; dp[${i}]=${best} via ${via}.`
      : `Blocked (${parts.join(', ')}); dp[${i}] stays INF.`;
    frames.push(frame(
      'relax',
      `Write dp[${i}]`,
      note,
      state({
        pointers: { i },
        highlights: best !== INF ? { [i]: 'accent' } : {},
        vars: via === -1 ? { i, best: 'INF' } : { i, best, via }
      })
    ));
  }

  const answer = dp[amount] === INF ? -1 : dp[amount];
  frames.push(frame(
    'done',
    'Return the answer',
    answer === -1 ? `dp[${amount}] is INF: unreachable, return -1.` : `dp[${amount}]=${answer}: fewest coins for ${amount}.`,
    state({ highlights: { [amount]: 'ok' }, vars: { answer } })
  ));

  return {
    kind: 'array',
    layout: { values: new Array(amount + 1).fill(null), label: 'dp[i] · fewest coins for amount i' },
    frames,
    result: answer
  };
}

// Visual bounds: the walkthrough renders the whole dp[0..half] table plus
// per-sum relax notes, so it stays tiny and rejects larger inputs with a
// clear error instead of truncating. The code runner keeps full constraints.
const MAX_PART_N = 7;
const MIN_PART_VAL = 1;
const MAX_PART_VAL = 20;
const MAX_PART_HALF = 30;

function decodePartNums(value) {
  if (!Array.isArray(value)) throw new Error('Provide nums as an integer array for this visual table');
  if (value.length < 1 || value.length > MAX_PART_N) throw new Error(`Visual walkthrough needs nums length 1..${MAX_PART_N} (${value.length} given)`);
  for (let k = 0; k < value.length; k++) {
    if (!Number.isSafeInteger(value[k])) throw new Error(`nums[${k}] must be a safe integer`);
    if (value[k] < MIN_PART_VAL || value[k] > MAX_PART_VAL) throw new Error(`Visual walkthrough needs nums values 1..20 (nums[${k}]=${value[k]} given)`);
  }
  return value.slice();
}

const partitionJava = code(`
[structure] class Solution {
[signature]     public boolean canPartition(int[] nums) {
[init]         int total = 0; for (int x : nums) total += x;
[init]         if (total % 2 != 0) return false;
[init]         int half = total / 2;
[base]         boolean[] dp = new boolean[half + 1];
[base]         dp[0] = true;
[loop]         for (int num : nums) {
[relax]             for (int s = half; s >= num; s--) {
[relax]                 if (dp[s - num]) dp[s] = true;
[structure]             }
[hit]             if (dp[half]) return true;
[structure]         }
[done]         return dp[half];
[structure]     }
[structure] }
`);

const partitionCpp = code(`
[structure] #include <vector>
[structure] using namespace std;
[structure] class Solution {
[structure] public:
[signature]     bool canPartition(vector<int>& nums) {
[init]         int total = 0; for (int x : nums) total += x;
[init]         if (total % 2 != 0) return false;
[init]         int half = total / 2;
[base]         vector<char> dp(half + 1, 0);
[base]         dp[0] = 1;
[loop]         for (int num : nums) {
[relax]             for (int s = half; s >= num; s--) {
[relax]                 if (dp[s - num]) dp[s] = 1;
[structure]             }
[hit]             if (dp[half]) return true;
[structure]         }
[done]         return dp[half] != 0;
[structure]     }
[structure] };
`);

const partitionPseudo = code(`
[init] canPartition(nums): total = sum(nums); if total is odd return false; half = total / 2
[base]   dp[0..half] = false; dp[0] = true (empty subset reaches 0)
[loop]   for num in nums:
[relax]     for s from half down to num: if dp[s-num] then dp[s] = true
[hit]     if dp[half] is true: return true (early reachable hit)
[done]   return dp[half]
`);

function buildPartition(args) {
  const nums = decodePartNums(args[0]);
  const total = nums.reduce((a, b) => a + b, 0);
  const halfFloor = Math.floor(total / 2);
  if (halfFloor > MAX_PART_HALF) throw new Error(`Visual walkthrough needs half-sum <= ${MAX_PART_HALF} (total ${total} gives half ${halfFloor})`);
  if (total % 2 !== 0) {
    const layout = { values: new Array(halfFloor + 1).fill(null), label: 'dp[s] · sum s reachable' };
    const frames = [
      frame('init', 'Total is odd', `Total ${total} is odd; no equal split possible.`, { vars: { total } }),
      frame('done', 'Return false early', 'Odd total means partition is impossible; return false.', { vars: { total, answer: false } })
    ];
    return { kind: 'array', layout, frames, result: false };
  }
  const half = total / 2;
  const dp = new Array(half + 1).fill(null);
  const frames = [];
  const state = (extra = {}) => ({ values: dp.slice(), ...extra });

  frames.push(frame('init', 'Compute the total', `Total ${total} even; half ${half}. Allocate dp[0..${half}].`, state({ vars: { total, half } })));
  for (let s = 0; s <= half; s++) dp[s] = false;
  dp[0] = true;
  frames.push(frame('base', 'Seed dp[0]', 'dp[0]=true (empty subset); rest false so far.', state({ highlights: { 0: 'ok' }, vars: { half } })));

  for (let idx = 0; idx < nums.length; idx++) {
    const num = nums[idx];
    frames.push(frame('loop', `Use num ${num}`, `Use ${num} once: scan sums ${half}..${num} backward.`, state({ pointers: { num: idx }, vars: { num, idx, half } })));
    for (let s = half; s >= num; s--) {
      const need = s - num;
      const before = dp[s];
      const from = dp[need];
      if (from && !before) {
        frames.push(frame('relax', `Check sum ${s}`, `s=${s} checks dp[${need}]=true; can reach ${s} via ${num}.`, state({ pointers: { s, need }, vars: { s, need, num } })));
        dp[s] = true;
        frames.push(frame('hit', `Reach sum ${s}`, `Mark dp[${s}]=true via ${num} + dp[${need}].`, state({ pointers: { s, need }, highlights: { [s]: 'accent', [need]: 'ok' }, vars: { s, need, num } })));
      } else if (from && before) {
        frames.push(frame('relax', `Check sum ${s}`, `s=${s} needs dp[${need}]=true; dp[${s}] already true.`, state({ pointers: { s, need }, highlights: { [s]: 'ok', [need]: 'ok' }, vars: { s, need, num } })));
      } else {
        frames.push(frame('relax', `Check sum ${s}`, `s=${s} needs dp[${need}]=false; dp[${s}] stays ${before ? 'true' : 'false'}.`, state({ pointers: { s, need }, vars: { s, need, num } })));
      }
    }
    if (dp[half]) {
      frames.push(frame('done', 'Half is reachable', `dp[${half}]=true; a subset sums to half. Return true.`, state({ highlights: { [half]: 'ok' }, vars: { answer: true, half } })));
      return {
        kind: 'array',
        layout: { values: new Array(half + 1).fill(null), label: 'dp[s] · sum s reachable' },
        frames,
        result: true
      };
    }
  }

  frames.push(frame('done', 'Return the answer', dp[half] ? `dp[${half}]=true; subset sums to half. Return true.` : `dp[${half}]=false; no subset sums to half.`, state({ highlights: { [half]: dp[half] ? 'ok' : undefined }, vars: { answer: dp[half], half } })));
  return {
    kind: 'array',
    layout: { values: new Array(half + 1).fill(null), label: 'dp[s] · sum s reachable' },
    frames,
    result: dp[half]
  };
}

// Visual bit helpers for sum-of-two-integers (additive; no existing names reused).
// Staged source: .workers/jobs/question-owners-150/sum-of-two-integers/adapter.js
// (selfcheck 332/0; faster carry loop verified against the a+b oracle).
function toSumBits(value,width) {
  const out=new Array(width).fill(0),u=value>>>0;
  for(let k=width-1,s=0;k>=0;k--,s++) out[k]=(u>>>s)&1;
  return out;
}
function sumBitLen(n) {
  n=Math.abs(n);
  if(n===0) return 1;
  return Math.floor(Math.log2(n))+1;
}
function buildSumOfTwo(args) {
  if(!Array.isArray(args)||args.length!==2) throw new Error('sum-of-two-integers expects [a, b] as its two walkthrough inputs');
  const [a,b]=args;
  if(!Number.isInteger(a)||!Number.isInteger(b)) throw new Error('sum-of-two-integers expects two integers [a, b]');
  if(Math.abs(a)>1000||Math.abs(b)>1000) throw new Error('sum-of-two-integers constraints: -1000 <= a, b <= 1000');
  const width=Math.max(5,Math.min(12,Math.max(sumBitLen(a),sumBitLen(b))+2));
  const frames=[];
  const st=(extra={})=>Object.assign({width},extra);
  let x=a|0,y=b|0,iter=0;
  frames.push(frame('init','Start with a and b',`No + or - allowed. a=${x}, b=${y} in a ${width}-bit window. carry not computed yet.`,st({
    a:x,b:y,carry:null,bitsA:toSumBits(x,width),bitsB:toSumBits(y,width),
    bitsCarry:null,changed:[],carryFrom:[],iter,vars:{a:x,b:y}
  })));
  const anchors=[0];
  while(y!==0) {
    if(iter>=32) throw new Error('carry loop did not settle within 32 rounds');
    const and=(x&y)|0,carry=(and<<1)|0;
    const prevA=toSumBits(x,width),prevB=toSumBits(y,width),from=[];
    for(let i=0;i<width;i++) if(prevA[i]===1&&prevB[i]===1) from.push(i);
    frames.push(frame('read',`Read carry sources (round ${iter+1})`,`(a & b) = ${and}; shifted carry = ${carry}. ${from.length===0?'No 1&1 column — carry is 0, the loop will settle next.':'1&1 at cell(s) '+from.join(', ')+' spawn the next carry.'}`,st({
      a:x,b:y,carry,bitsCarry:toSumBits(carry,width),
      changed:[],carryFrom:from,iter:iter+1,vars:{a:x,b:y,and,carry}
    })));
    anchors.push(frames.length-1);
    const nx=(x^y)|0,nextA=toSumBits(nx,width),changed=[];
    for(let i=0;i<width;i++) if(nextA[i]!==prevA[i]) changed.push(i);
    x=nx;y=carry;iter+=1;
    frames.push(frame('update',`Fold carry (round ${iter})`,`a = a ^ b gives ${x}; b becomes the carry ${y}. Changed cell(s): ${changed.length?changed.join(', '):'none'}.`,st({
      a:x,b:y,carry:y,bitsA:nextA,bitsB:toSumBits(y,width),bitsCarry:toSumBits(y,width),
      changed,carryFrom:from,iter,vars:{a:x,b:y,carry:y}
    })));
  }
  frames.push(frame('done','Return a',`b == 0 after ${iter} round(s); getSum(${a}, ${b}) = ${x}.`,st({
    a:x,b:0,carry:0,bitsA:toSumBits(x,width),bitsB:toSumBits(0,width),bitsCarry:toSumBits(0,width),
    changed:[],carryFrom:[],iter,done:true,vars:{answer:x,a:x,b:0}
  })));
  anchors.push(frames.length-1);
  return {
    kind:'array',
    layout:{width,values:[a,b],label:`bits of a and b, MSB..LSB (${width}-bit window)`},
    frames,result:x,anchors:[...new Set(anchors.filter(i=>Number.isInteger(i)&&i>=0&&i<frames.length))].sort((c,d)=>c-d)
  };
}

// Visual bit helpers for reverse-bits (additive; no existing names used).
// Staged source: .workers/jobs/question-owners-150/reverse-bits/adapter.mjs
// (selfcheck 332/0; 34 honest frames: 1 init + 32 bit + 1 done, no sampling).
const MAX32 = 4294967295;
function toBits(n) {
  const s = (n >>> 0).toString(2).padStart(32, '0');
  return s.split('').map((c) => (c === '1' ? 1 : 0));
}
function checkedN(value) {
  const what = 'reverse-bits expects [n] with an integer 0..4294967295';
  if (!Number.isInteger(value)) throw new Error(what + ' (got non-integer)');
  if (value < 0 || value > MAX32) throw new Error(what + ' (got ' + value + ')');
  return value >>> 0;
}
function buildReverseBits(args) {
  if (!Array.isArray(args) || args.length !== 1) throw new Error('reverse-bits expects [n]');
  const n = checkedN(args[0]);
  const inBits = toBits(n);
  const frames = [];
  const empty = Array(32).fill(null);
  frames.push(frame('init', 'Initialize',
    'Reverse 32 bits of n=' + n + '; start res=0, no output bit placed yet.',
    { i: -1, bit: null, prev: null, res: 0, readPos: null, writePos: null, outBits: empty.slice(), n }));
  let res = 0;
  const outBits = empty.slice();
  for (let i = 0; i < 32; i++) {
    const bit = (n >>> i) & 1;
    const prev = res >>> 0;
    res = (((res << 1) | bit) >>> 0);
    outBits[31 - i] = bit;
    frames.push(frame('bit', 'i=' + i + ': read->write',
      'n[' + i + ']=' + bit + ' -> out[' + (31 - i) + ']; res ' + prev + '->' + res + '.',
      { i, bit, prev, res, readPos: i, writePos: 31 - i, outBits: outBits.slice(), n }));
  }
  frames.push(frame('done', 'Return',
    'All 32 bits mirrored; return res=' + res + '.',
    { i: 32, bit: null, prev: null, res, readPos: null, writePos: null, outBits: outBits.slice(), n }));
  return { kind: 'bits', layout: { inBits: inBits.slice(), n }, frames, result: res };
}

export const adapters={
  'running-sum-of-1d-array':{
    signature:{name:'runningSum',params:['int[]'],return:'int[]'},code:runningCode,
    lesson:{idea:'After processing i, nums[i] contains the sum of original elements 0 through i.',trap:'Use the already accumulated prefix on the left, not the original previous value.',time:'O(n)',space:'O(1) extra; mutates the working array'},
    // Optional per-line explanations (presentation metadata, never compiled).
    explain:{
      done:'Expose the fully accumulated array as the answer, valid even when no iteration was needed.',
      init:'Starting array state where the leading cell already holds its own prefix, covering empty and single inputs.',
      loop:'Scope for the left-to-right scan that visits each remaining cell once to extend the running total.',
      update:'Combine current value with the already accumulated prefix on the left so each cell holds the total through here.'
    },
    build([input]) {
      const nums=arrayInput(input),frames=[frame('init','Start with the input','The first cell is already the sum of its prefix.',{values:nums})]
      for(let i=1;i<nums.length;i++) {
        const original=nums[i],prefix=nums[i-1];nums[i]+=prefix
        frames.push(frame('update',`Write prefix ${i}`,`${original} + previous prefix ${prefix} = ${nums[i]}.`,{values:nums,pointers:{i,previous:i-1},highlights:{[i]:'accent',[i-1]:'ok'},vars:{prefix:nums[i]}}))
      }
      frames.push(frame('done','Return the running sums',`Result: [${nums.join(', ')}].`,{values:nums,highlights:Object.fromEntries(nums.map((_,i)=>[i,'ok']))}))
      return {kind:'array',layout:{values:input.slice(),label:'Working array · processed cells contain prefix sums'},frames,result:nums}
    }
  },
  'find-pivot-index':{
    signature:{name:'pivotIndex',params:['int[]'],return:'int'},code:pivotCode,
    lesson:{idea:'At index i, total minus left sum minus nums[i] gives the right sum. Compare the two sides.',trap:'The pivot belongs to neither side. Check equality before adding the current element to the left sum.',time:'O(n)',space:'O(1)'},
    // Optional per-line explanations (presentation metadata, never compiled).
    explain:{
      advance:'Move current value into the left sum only after the test so the next position sees correct sides.',
      compare:'Derive right sum by excluding left sum and current value from total, then test whether both sides balance.',
      done:'Signal that every position was tested without balance, so absence is reported uniformly.',
      found:'Report the earliest balanced position immediately, since left-to-right order guarantees the leftmost result.',
      init:'Compute the overall total and start with an empty left sum so each side can be derived without rescanning.',
      loop:'Scope that visits each position in order while maintaining the left sum for side comparison.'
    },
    build([input]) {
      const nums=arrayInput(input),total=nums.reduce((a,b)=>a+b,0),frames=[frame('init','Sum the array',`Total sum is ${total}; the left side starts empty.`,{vars:{total,left:0}})]
      let left=0
      for(let i=0;i<nums.length;i++) {
        const right=total-left-nums[i]
        frames.push(frame('compare',`Test index ${i}`,`Left ${left}; right ${total} − ${left} − ${nums[i]} = ${right}.`,{pointers:{i},highlights:{[i]:'accent'},vars:{left,right,current:nums[i],total}}))
        if(left===right) {
          frames.push(frame('found','The sides balance',`Return the leftmost pivot, index ${i}.`,{pointers:{i},highlights:{[i]:'ok'},vars:{left,right,answer:i}}))
          return {kind:'array',layout:{values:nums},frames,result:i}
        }
        left+=nums[i]
        frames.push(frame('advance','Move this value to the left sum',`Left sum becomes ${left}; test the next index.`,{pointers:{i},vars:{left}}))
      }
      frames.push(frame('done','No pivot exists','Every index was checked; return -1.',{vars:{answer:-1}}))
      return {kind:'array',layout:{values:nums},frames,result:-1}
    }
  },
  'fibonacci-number':recurrence('fibonacci-number','fib',[0,1],'F(i) is the sum of F(i−1) and F(i−2), with F(0)=0 and F(1)=1.',30,{
    base:'Seed the two starting values that define the whole sequence, covering the smallest inputs without special cases.',
    done:'Return the table entry for the requested position, which now holds the complete accumulated result.',
    init:'Allocate the table covering the requested range so every smaller result can be stored and reused.',
    loop:'Scope that advances through remaining positions in order so each sum builds only on finished entries.',
    update:'Form current value as the sum of the two preceding results, extending the sequence by one justified step.'
  }),
  'climbing-stairs':recurrence('climbing-stairs','climbStairs',[1,1],'The last move came from stair i−1 or i−2. These disjoint choices add.',24,{
    base:'Seed counts for the smallest staircases, since these anchors differ from Fibonacci seeds and shape all larger totals.',
    done:'Return the entry for the requested stair count as the total number of distinct ways to arrive.',
    init:'Allocate the table covering all stair counts so each smaller count can be reused for larger ones.',
    loop:'Scope that advances through remaining stairs in order so each total builds only on finished counts.',
    update:'Add the ways arriving from the two previous stairs, since the last move comes from either one without overlap.'
  },{
    java:{
      0:'Class wrapper: holds the method; performs no algorithm operation.',
      1:'Method header: receives n; the table work starts in the body below.',
      2:'Allocate dp[0..max(1,n)] (length at least 2) so dp[0] and dp[1] always exist.',
      3:'Seed dp[0]=1 (empty climb) and dp[1]=1 (single 1-step); anchors, not Fibonacci seeds.',
      4:'Loop scope: visit i=2..n in order; the guard i<=n ends the fill.',
      5:'Fill step: dp[i] sums the two finished predecessors (last move 1-step or 2-step).',
      6:'Loop scope end: advance to the next stair after the write.',
      7:'Return dp[n], the total ways to reach the top.',
      8:'Scope end: closes the method body; no operation.',
      9:'Scope end: closes the class; no operation.'
    },
    cpp:{
      0:'Class wrapper: holds the method; performs no algorithm operation.',
      1:'Access label: visibility only; performs no operation.',
      2:'Method header: receives n; the table work starts in the body below.',
      3:'Allocate dp of length max(2,n+1) zeroed so dp[0] and dp[1] always exist.',
      4:'Seed dp[0]=1 (empty climb) and dp[1]=1 (single 1-step); anchors, not Fibonacci seeds.',
      5:'Loop scope: visit i=2..n in order; the guard i<=n ends the fill.',
      6:'Fill step: dp[i] sums the two finished predecessors (last move 1-step or 2-step).',
      7:'Loop scope end: advance to the next stair after the write.',
      8:'Return dp[n], the total ways to reach the top.',
      9:'Scope end: closes the method body; no operation.',
      10:'Scope end: closes the class; no operation.'
    },
    pseudo:{
      0:'Allocate dp covering 0..max(1,n), unset until written.',
      1:'Seed dp[0]=1 (empty climb) and dp[1]=1 (single 1-step).',
      2:'Loop scope over i=2..n so each total builds on finished counts.',
      3:'Fill step: dp[i] is the sum of the two disjoint arrival choices.',
      4:'Return dp[n], the total ways to reach the top.'
    }
  }),
  'house-robber':{
    signature:{name:'rob',params:['int[]'],return:'int'},code:robberCode,
    lesson:{idea:'dp[i] is the best amount from the first i houses. Either skip house i−1 or take it and combine with dp[i−2].',trap:'Taking adjacent houses is forbidden. A greedy choice of the largest next house can lose.',time:'O(n)',space:'O(n) for the displayed table'},
    // Optional per-line explanations (presentation metadata, never compiled).
    explain:{
      compare:'Contrast skipping the house, keeping the prior best, against taking it with the best from before its neighbor.',
      done:'Return the final prefix entry holding the best total across all houses, including the empty selection case.',
      init:'Create a prefix table with an empty-selection baseline so short inputs still resolve without special cases.',
      loop:'Scope that considers houses in order while preserving optimal totals for all earlier prefixes.',
      update:'Keep the larger of skipping versus taking so each prefix stores the best achievable total to date.'
    },
    // Per-line notes for the rob() listing (P33 staged explain, re-indexed by the
    // coordinator: staged cpp assumed header lines the live reference() never emits,
    // so the bogus includes key was dropped and 3..11 shifted to 2..10 with a new
    // terminator note; staged pseudo assumed a header line, so 1..5 shifted to 0..4;
    // staged java take-branch note (152 chars) trimmed to the 140-char contract).
    explainLines:{
      java:['Class scope: owns the Solution type; no state yet.','Signature: public int rob(int[] nums) binds the house-value array; computation starts below.',"Init: dp has n+1 slots (dp[0] baseline); zeros mean 'no prefix computed yet' except dp[0]=0.",'Loop scope: i is the 1-based prefix length; house index is i-1. Preserves dp[0..i-1] while computing dp[i].','Compare (skip branch): read dp[i-1], the best total ignoring house i-1. Read-only.','Compare (take branch): read nums[i-1] and guarded dp[i-2]; take is value plus best before its neighbour.','Update: write dp[i] = max(skip, take); the max keeps the invariant that dp[i] is optimal for the first i houses.','Loop scope close: prefix i is now final; next i builds only on finished entries.','Done: return dp[n]; for n==0 this is the baseline 0 (visual only; judge n>=1).','Class scope close: no state effect.','Class scope close: no state effect.'],
      cpp:['Class scope: owns the Solution type; no state yet.','Access scope (public:): visibility only, no state effect.','Signature: int rob(vector<int>& nums) binds the house-value array by reference (read-only use here).','Init: dp sized n+1 and zeroed; dp[0]=0 baseline. Note: nums is NOT mutated.','Loop scope: i is the 1-based prefix length; house index i-1.','Compare (skip branch): read dp[i-1]. Read-only.','Compare (take branch): read nums[i-1] and guarded dp[i-2]; adjacency ban forces the gap.','Update: write dp[i] = max(skip, take); tie favours skip.','Loop scope close: prefix i final.','Done: return dp[n]; covers all-zero rows via the dp[0]=0 baseline.','Method/class scope close: no state effect.','Class terminator: closes the Solution scope; no state effect.'],
      pseudo:['Init: dp[0..n] zeros; dp[0]=0 baseline.','Loop scope: for i in 1..n, house index i-1.','Compare: skip vs take with the i>1 guard; reason is the no-adjacent rule.','Update: dp[i] = max(skip, take); records the branch choice.','Done: return dp[n].']
    },
    build([input]) {
      const nums=arrayInput(input);if(nums.some(v=>v<0)) throw new Error('House values must be nonnegative.')
      const dp=new Array(nums.length+1).fill(0),frames=[frame('init','Create the prefix table','dp[0]=0: no houses means no money.',{values:dp,vars:{houses:nums.length}})]
      for(let i=1;i<=nums.length;i++) {
        const skip=dp[i-1],take=nums[i-1]+(i>1?dp[i-2]:0)
        frames.push(frame('compare',`Consider house ${i-1}`,`Value ${nums[i-1]}; skip gives ${skip}, take gives ${take}.`,{values:dp,pointers:{i,skip:i-1,...(i>1?{previous:i-2}:{})},vars:{value:nums[i-1],skip,take}}))
        dp[i]=Math.max(skip,take)
        frames.push(frame('update',`Write dp[${i}]`,`max(${skip}, ${take}) = ${dp[i]}.`,{values:dp,pointers:{i},highlights:{[i]:'accent'},vars:{best:dp[i]}}))
      }
      frames.push(frame('done','Return the best total',`dp[${nums.length}] = ${dp[nums.length]}.`,{values:dp,highlights:{[nums.length]:'ok'},vars:{answer:dp[nums.length]}}))
      return {kind:'array',layout:{values:new Array(dp.length).fill(0),label:'dp[i] · best total from the first i houses'},frames,result:dp[nums.length]}
    }
  },
  'counting-bits':{
    signature:{name:'countBits',params:['int'],return:'int[]'},
    lesson:{idea:'Halving i drops its lowest bit, so ans[i] reuses ans[i>>1] plus (i&1).',trap:'Do not recount bits per i; seed ans[0]=0. Non-negative n only per constraints.',time:'O(n)',space:'O(n) for the answer array',invariant:'After processing i, ans[k] = popcount(k) for all 0 <= k <= i.',mistake:'Recomputing each popcount from scratch (O(n log n)) or forgetting ans[0]=0.'},
    explain:{
      init:'Allocate the answer table ans[0..n]. It doubles as the DP memory: every later cell reads an earlier one.',
      base:'Seed ans[0]=0. Zero has no 1-bits, and every halving chain bottoms out here.',
      loop:'Sweep i from 1 to n exactly once, in increasing order, so ans[i>>1] is already final when read.',
      update:'Halving i drops its lowest bit, so popcount(i) = popcount(i>>1) + (i&1). One read, one write.',
      done:'Return the finished table. Its length is n+1 and every entry is final.'
    },
    explainLines:{
      java:['Structural wrapper: the Solution class scope. No operation runs here.','Signature: countBits takes int n and returns int[]. Execution starts in the body.','Allocate ans with n+1 slots so indices 0..n are all writable.','Seed the base case: 0 in binary is "0", so its popcount is 0.','Loop header: visit i=1..n in order; the half-index i>>1 is always < i, hence already computed.','Core step: read ans[i>>1], add the dropped lowest bit (i&1: 1 when i is odd, else 0), write ans[i].','Loop footer: end of this i; the next i reuses a larger prefix of the same table.','Return the whole table; the caller receives a new array of length n+1.','Structural wrapper: close the method scope.','Structural wrapper: close the class scope.'],
      cpp:['Structural wrapper: the Solution class scope. No operation runs here.','Structural wrapper: public section opener. No operation runs here.','Signature: countBits takes int n and returns vector<int>. Execution starts in the body.','Allocate ans with n+1 slots so indices 0..n are all writable.','Seed the base case: 0 in binary is "0", so its popcount is 0.','Loop header: visit i=1..n in order; the half-index i>>1 is always < i, hence already computed.','Core step: read ans[i>>1], add the dropped lowest bit (i&1: 1 when i is odd, else 0), write ans[i].','Loop footer: end of this i; the next i reuses a larger prefix of the same table.','Return the whole vector; the caller receives a new array of length n+1.','Structural wrapper: close the class scope.','Structural wrapper: class terminator. No operation runs here.'],
      pseudo:['Allocate ans[0..n]: the output table is also the memo.','Seed ans[0]=0: the empty bit-string has popcount 0; all chains end here.','Iterate i from 1 to n ascending so each dependency ans[i>>1] is final.','Apply the invariant ans[i]=ans[i>>1]+(i&1): halve-and-add-parity, then write ans[i].','Return ans: every position 0..n now holds the popcount of its index.']
    },
    code:reference('int[] countBits(int n)','vector<int> countBits(int n)',
`[init]         int[] ans = new int[n + 1];
[base]         ans[0] = 0;
[loop]         for (int i = 1; i <= n; i++) {
[update]             ans[i] = ans[i >> 1] + (i & 1);
[loop]         }
[done]         return ans;`,
`[init]         vector<int> ans(n + 1, 0);
[base]         ans[0] = 0;
[loop]         for (int i = 1; i <= n; i++) {
[update]             ans[i] = ans[i >> 1] + (i & 1);
[loop]         }
[done]         return ans;`,
`[init] countBits(n): allocate ans[0..n] with zeros
[base]   ans[0] = 0
[loop]   for i from 1 to n:
[update]     ans[i] = ans[i >> 1] + (i & 1)
[done]   return ans`),
    build([n]) {
      // Visual bound only; the judge runner keeps the full 0..1e5 range.
      if(!Number.isInteger(n)||n<0||n>16) throw new Error('Use n between 0 and 16 for this visual table. The code runner supports the full constraints (0 <= n <= 10^5).')
      // Uncomputed cells stay null (rendered unset), never 0: a 0 placeholder would
      // masquerade as a computed popcount before its write event.
      const ans=new Array(n+1).fill(null),frames=[]
      const state=(extra={})=>({values:ans.slice(),...extra})
      frames.push(frame('init','Allocate the answer',`Allocate ans[0..${n}] for n=${n}.`,state()))
      ans[0]=0
      frames.push(frame('base','Seed ans[0]','ans[0]=0: zero has no 1-bits.',state({highlights:{0:'ok'}})))
      for(let i=1;i<=n;i++) {
        const half=i>>1,bit=i&1,prev=ans[half]
        ans[i]=prev+bit
        frames.push(frame('update',`Write ans[${i}]`,`ans[${i}]=ans[${half}]+${bit}=${prev}+${bit}=${ans[i]}.`,state({pointers:{i,half},highlights:{[i]:'accent',[half]:'ok'},vars:{i,half,bit,result:ans[i]}})))
      }
      frames.push(frame('done','Return the table',`Return [${ans.join(', ')}].`,state({highlights:Object.fromEntries(ans.map((_,k)=>[k,'ok'])),vars:{answer:ans.slice()}})))
      return {kind:'array',layout:{values:new Array(ans.length).fill(null),label:'ans[i] · popcount of i'},frames,result:ans.slice()}
    }
  },
  'number-of-1-bits':{
    signature:{name:'hammingWeight',params:['int'],return:'int'},
    lesson:{idea:'Probe each of the 32 bit positions: when the lowest bit is 1, count it, then shift right. Invariant: after i probes, count equals the number of 1s in the lowest i bits.',trap:'Java int is signed 32-bit: use >>> (unsigned shift) so zero fills from the left. A >> on a negative would replicate the sign bit and never clear. Zero needs no special case; the loop already yields 0.',time:'O(32) = O(1)',space:'O(1)'},
    explain:{
      init:'Seed the accumulator at zero; no bit positions have been examined yet.',
      loop:'Visit each of the 32 positions exactly once so every bit is classified.',
      compare:'Mask the lowest bit: a 1 means this position contributes, a 0 is skipped.',
      update:'Record the observed 1; this runs only when the mask test passed.',
      advance:'Shift right with zero fill so the next position becomes readable; the fixed bound guarantees termination.',
      done:'Return the accumulator after all 32 positions were probed.'
    },
    code:reference('int hammingWeight(int n)','int hammingWeight(int n)',
`[init]         int count = 0;
[loop]         for (int i = 0; i < 32; i++) {
[compare]             if ((n & 1) == 1) {
[update]                 count++;
[compare]             }
[advance]             n >>>= 1;
[loop]         }
[done]         return count;`,
`[init]         int count = 0;
[loop]         for (int i = 0; i < 32; i++) {
[compare]             if ((n & 1) == 1) {
[update]                 count++;
[compare]             }
[advance]             n >>= 1;
[loop]         }
[done]         return count;`,
`[init] hammingWeight(n): count = 0; view n as 32-bit unsigned
[loop]   repeat 32 times:
[compare]     if lowest bit of n is 1:
[update]       count = count + 1
[advance]     shift n right by 1 (drop the lowest bit)
[done]   return count`),
    build([n]) {
      // Visual bound only; the judge runner keeps the full 1..2^31-1 range.
      // Sub-8-bit values render in an 8-cell window (disclosed in the init note).
      if(!Number.isInteger(n)||n<0||n>2147483647) throw new Error('Use n between 0 and 2147483647 for this walkthrough. The code runner supports the problem constraints (1 <= n <= 2^31 - 1).')
      const need=n===0?1:Math.floor(Math.log2(n))+1
      const width=Math.min(32,Math.max(8,need))
      const bits=Array.from({length:width},(_,k)=>{const shift=width-1-k;return (Math.floor(n/Math.pow(2,shift))%2+2)%2})
      const frames=[]
      const anchors=[0]
      frames.push(frame('init','View n as bits','n='+n+' in a '+width+'-bit window, LSB first. count=0.',{values:bits.slice(),vars:{n,count:0,width}}))
      let count=0,remaining=n,firstOne=-1
      for(let i=0;i<width;i++) {
        const idx=width-1-i,bit=remaining%2
        if(bit===1) {
          frames.push(frame('compare','Probe bit '+i,'Bit '+i+' (cell '+idx+') is 1: branch taken, count '+count+' -> '+(count+1)+'.',{values:bits.slice(),pointers:{probe:idx},highlights:{[idx]:'accent'},vars:{n,count,i,bit,remaining}}))
          count+=1
          frames.push(frame('update','Count the 1','count becomes '+count+' after bit '+i+'.',{values:bits.slice(),pointers:{probe:idx},highlights:{[idx]:'ok'},vars:{n,count,i,bit,remaining}}))
          if(firstOne===-1) firstOne=frames.length-1
        } else {
          frames.push(frame('compare','Probe bit '+i,'Bit '+i+' (cell '+idx+') is 0: branch skipped, count stays '+count+'.',{values:bits.slice(),pointers:{probe:idx},highlights:{[idx]:'dim'},vars:{n,count,i,bit,remaining}}))
        }
        remaining=Math.floor(remaining/2)
        frames[frames.length-1].state.vars.nextRemaining=remaining
      }
      if(firstOne!==-1) anchors.push(firstOne)
      anchors.push(frames.length)
      frames.push(frame('done','Return the weight','All '+width+' bits probed; hammingWeight('+n+') = '+count+'.',{values:bits.slice(),highlights:Object.fromEntries(bits.map((b,k)=>[k,b===1?'ok':'dim'])),vars:{n,answer:count,count}}))
      return {kind:'array',layout:{values:bits.slice(),label:'bits of n, MSB..LSB ('+width+'-bit window)'},frames,result:count,anchors}
    }
  },
  'reverse-bits':{
    signature:{name:'reverseBits',params:['int'],return:'int'},
    lesson:{idea:'Read input bits LSB-first (n&1, shift right) and append each bit to the answer (shift left, OR it in). After 32 steps every source bit sits at its mirrored position.',trap:'Shifting the answer AFTER or-ing (or reading MSB-first) scrambles the mirror; the append order res=(res<<1)|bit with LSB-first reads is what places bit i at output position 31-i.',time:'O(32) = O(1)',space:'O(1)',alt:'Divide-and-conquer mask swap: exchange 16-bit halves, then 8/4/2/1-bit groups with masks (0xFFFF0000, 0xFF00FF00, 0xF0F0F0F0, 0xCCCCCCCC, 0x55555555). Same O(1) time with fewer sequential steps, but harder to verify by eye; a 256-entry byte table beats both for repeated calls.'},
    explain:{
      def:'Declares the solution scope; the method below mirrors all 32 bits.',
      init:'Seed res = 0; no output bit placed yet.',
      bit:'Read n[i] and append it to res with a left shift; res gains one more mirrored bit.',
      done:'All 32 bits mirrored; return res.'
    },
    explainLines:{
      java:['Container scope for the solution; judge instantiates it.','Entry point: n is the 32-bit input.','Accumulator; empty answer, no bits placed.','Visits each source position exactly once, LSB first.','Append: make room, OR in current LSB of n.','Expose the next source bit at the LSB.','Loop end.','All 32 bits mirrored; res is final only here.','Close method.','Close class.'],
      cpp:['Container scope for the solution; no arithmetic state lives here.','Access scope for the public method.','Entry point: receives n by value; a local uint32_t copy makes unsigned shifts explicit.','Local unsigned copy of n; all bit reads come from N, never the signed parameter.','Accumulator for the mirrored result; empty at start.','Visits each source position exactly once, LSB first.','Append: make room, OR in current LSB of N.','Expose the next source bit; unsigned shift fills with zero.','Loop end.','All 32 bits mirrored; cast back to int for the return.','Close method.','Close class.'],
      pseudo:['Task scope: mirror all 32 bits of the input.','Seed the accumulator; nothing placed yet.','Visit each source position LSB-first.','Read the i-th bit.','Append it to the answer with a left shift.','End of the per-bit step.','Return the fully mirrored value.','Close the task scope.']
    },
    code:{
      java:code(`
[def] class Solution {
[def]     public int reverseBits(int n) {
[init]         int res = 0;
[bit]         for (int i = 0; i < 32; i++) {
[bit]             res = (res << 1) | (n & 1);
[bit]             n >>= 1;
[bit]         }
[done]         return res;
[def]     }
[def] }`),
      cpp:code(`
[def] class Solution {
[def] public:
[def]     int reverseBits(int n) {
[def]         uint32_t N = (uint32_t)n;
[init]         uint32_t res = 0;
[bit]         for (int i = 0; i < 32; i++) {
[bit]             res = (res << 1) | (N & 1u);
[bit]             N >>= 1;
[bit]         }
[done]         return (int)res;
[def]     }
[def] };`),
      pseudo:code(`
[def] function reverseBits(n)
[init]   res = 0
[bit]   for i from 0 to 31
[bit]     bit = (n >> i) & 1
[bit]     res = (res << 1) | bit
[bit]   end for
[done]   return res
[def] end function`)
    },
    build: buildReverseBits
  },
  'coin-change':{
    signature:{name:'coinChange',params:['int[]','int'],return:'int'},
    lesson:{idea:'dp[i] is the fewest coins for amount i: dp[0]=0, rest INF; each i takes min over coins of dp[i-c]+1.',trap:'Greedy largest-first fails; an INF dp[amount] means unreachable, return -1, never INF.',time:'O(amount x coins)',space:'O(amount) for the dp table'},
    explain:{
      signature:'Task scope: fewest coins for amount from unlimited coins; unreachable is a defined -1 answer.',
      init:'Declare the table scope and the INF sentinel (amount+1, worse than any reachable answer).',
      base:'Seed the optimum: dp[0]=0 is the only reachable base; INF marks not-yet-reachable, not zero.',
      loop:'Open amount scope i; every coin choice for i reads only already-solved dp[i-c], never future cells.',
      relax:'Branch plus write: test coin fit and predecessor reachability, then take the minimum; this single write fixes dp[i].',
      done:'Commit the verdict: INF at dp[amount] means unreachable, so return -1, never INF itself.'
    },
    explainLines:{
      java:['Container scope for the solution; no DP state lives here.','Entry point: receives the coin set and the target amount; the table below derives from amount.','Sentinel scope: INF = amount+1 is worse than any reachable answer, so min() ignores it.','Table scope: dp[0..amount] will hold fewest-coin counts; every entry starts unset.','Base write: dp[0]=0 — the empty amount needs no coins.','Base fill: every positive amount starts INF (unreachable so far), never 0.','Amount scope: each i is solved left-to-right so every read hits an already-final cell.','Candidate scope: best tracks the minimum over the reachable predecessors for this amount.','Choice scope: try each denomination once per amount; order among coins never matters.','Branch: only a fitting coin with a solved predecessor can improve best.','Loop close: no write here; every candidate was considered inside.','Write: dp[i]=best fixes this amount forever; later amounts may now read it.','Loop close: i advances only after dp[i] is final, preserving the left-to-right order.','Verdict: INF at dp[amount] means unreachable, so return -1 instead of the sentinel.','Method close: the returned value is final; no table state changes after this.','Class close: no executable state here.'],
      cpp:['Header scope for min; no DP state lives here.','Header scope for the table type; no DP state lives here.','Namespace scope for the names used below.','Class scope holding the solution method.','Access scope for the public method.','Entry point: coins arrive by reference, amount by value; the table derives from amount.','Sentinel scope: INF = amount+1 is worse than any reachable answer.','Table scope: dp[0..amount] seeded INF; visible to both loops below.','Base write: dp[0]=0 — the empty amount needs no coins.','Amount scope: each i is solved left-to-right so every read hits an already-final cell.','Candidate scope: best tracks the minimum over the reachable predecessors for this amount.','Choice scope: try each denomination once per amount; order among coins never matters.','Branch: only a fitting coin with a solved predecessor can improve best.','Loop close: no write here; every candidate was considered inside.','Write: dp[i]=best fixes this amount forever; later amounts may now read it.','Loop close: i advances only after dp[i] is final.','Verdict: INF at dp[amount] means unreachable, so return -1 instead of the sentinel.','Class close: no executable state here.','Header close: no executable state here.'],
      pseudo:['Setup: name the sentinel and the table range before any amount is solved.','Base: the only reachable entry is dp[0]=0; INF marks not-yet-reachable, not zero.','Order: solving i ascending guarantees every predecessor read is already final.','Core: take the minimum over fitting coins from solved states, else keep INF; write dp[i].','Verdict: map a lingering INF to -1; never report the sentinel as an answer.']
    },
    code:{ java: coinChangeJava, cpp: coinChangeCpp, pseudo: coinChangePseudo },
    build: buildCoinChange
  },
  'partition-equal-subset-sum':{
    signature:{name:'canPartition',params:['int[]'],return:'boolean'},
    lesson:{idea:'Half the total; dp[s] says sum s is reachable with seen nums, each num used once via backward scan.',trap:'Odd total is impossible; scan s backward or a num is reused; seed dp[0]=true for the empty subset.',time:'O(n x half)',space:'O(half) for the dp table'},
    code:{ java: partitionJava, cpp: partitionCpp, pseudo: partitionPseudo },
    explain:{
      init: 'Sum the array; an odd total can never split, otherwise the target half is fixed before any table exists.',
      base: 'Allocate the reachable-sums table and seed dp[0]=true: the empty subset reaches sum 0 and nothing else yet.',
      loop: 'Scope that incorporates each number exactly once; the backward inner scan freezes this round reads.',
      relax: 'Check whether sum s becomes reachable through the current number; a relax frame never mutates state.',
      hit: 'Record a newly reached sum, or report half reached early since reachability only grows from here.',
      done: 'Return the verdict: dp[half] tells whether some subset of all numbers sums to exactly half.'
    },
    explainLines:{
      java: ['Structural wrapper: the Solution class scope. No operation runs here.', 'Signature: canPartition takes int[] nums and returns boolean. Execution starts in the body.', 'Init: total accumulates the full sum; every element is read once for the parity decision.', 'Init: odd total short-circuits to false; no integer half exists so no table is needed.', 'Init: half = total / 2 is the only sum that can certify an equal split; fixed before the table.', 'Base: allocate dp[0..half], all false: no sum is reachable before any number is used.', 'Base: seed dp[0]=true; the empty subset reaches sum 0 and anchors every later extension.', 'Loop scope: visit each num once; the inner scan runs backward so one number is never reused.', 'Relax scope: s runs from half down to num; lower sums cannot involve num and keep prior values.', 'Relax: read dp[s-num]; when true, s is reachable by appending num to that earlier subset.', 'Relax scope close: end of this s; the next lower s reads the same frozen round.', 'Hit: read dp[half]; once true it stays true, so returning now is sound (early exit).', 'Loop scope close: num is fully incorporated; the next number builds only on finished reachability.', 'Done: return dp[half]; false means no subset of all numbers sums to half.', 'Structural wrapper: close the method scope.', 'Structural wrapper: close the class scope.'],
      cpp: ['Structural wrapper: vector header for the dp table. No operation runs here.', 'Structural wrapper: std namespace opener. No operation runs here.', 'Structural wrapper: the Solution class scope. No operation runs here.', 'Structural wrapper: public section opener. No operation runs here.', 'Signature: canPartition takes vector<int>& nums and returns bool. Execution starts in the body.', 'Init: total accumulates the full sum; every element is read once for the parity decision.', 'Init: odd total short-circuits to false; no integer half exists so no table is needed.', 'Init: half = total / 2 is the only sum that can certify an equal split; fixed before the table.', 'Base: allocate dp[0..half] zeroed (char avoids vector<bool> specialization); none reachable yet.', 'Base: seed dp[0]=1; the empty subset reaches sum 0 and anchors every later extension.', 'Loop scope: visit each num once; the inner scan runs backward so one number is never reused.', 'Relax scope: s runs from half down to num; lower sums cannot involve num and keep prior values.', 'Relax: read dp[s-num]; when nonzero, s is reachable by appending num to that earlier subset.', 'Relax scope close: end of this s; the next lower s reads the same frozen round.', 'Hit: read dp[half]; once nonzero it stays nonzero, so returning now is sound (early exit).', 'Loop scope close: num is fully incorporated; the next number builds only on finished reachability.', 'Done: return dp[half] != 0; zero means no subset of all numbers sums to half.', 'Structural wrapper: close the method and class scopes.', 'Structural wrapper: class terminator. No operation runs here.'],
      pseudo: ['Init: total, parity guard, and half target in one header step before any table exists.', 'Base: dp[0..half] false with dp[0]=true; the empty subset is the only reachability seed.', 'Loop scope: each num is incorporated exactly once into the reachable set.', 'Relax: backward scan extends reachability by num without reusing it in the same round.', 'Hit: half reached means a certifying subset exists; later numbers cannot undo it.', 'Done: return dp[half], the verdict over all numbers.']
    },
    build: buildPartition
  },
  'sum-of-two-integers':{
    signature:{name:'getSum',params:['int','int'],return:'int'},
    lesson:{idea:'XOR adds without carry; (a & b) << 1 is exactly the missing carry. Repeating both folds the carry in until nothing is pending (b == 0), so a is the sum.',trap:'Loop on b != 0, not on a fixed count. Shifting the carry left is required — an unshifted (a & b) would re-add the same column forever. Negatives work because Java/C++ int arithmetic is 32-bit two\u2019s complement.',time:'O(1) — at most 32 carry rounds for 32-bit ints',space:'O(1)',alt:'Recursive form getSum(a ^ b, (a & b) << 1) with base case b == 0 expresses the same invariant; an explicit mask loop ((a & b) != 0) is the same test written differently. Log-based or string tricks are not genuine alternatives here.'},
    explain:{
      loop:'Loop while a carry is still pending; b == 0 means every column resolved.',
      read:'Read both operands at the same columns: AND finds the 1&1 positions that must carry.',
      shift:'Shift the AND left by one: a carry belongs to the next higher column, not its own.',
      update:'XOR writes the carry-free sum into a; the shifted carry becomes the new b. One read pair, two writes.',
      done:'b == 0, so a holds all columns including every propagated carry: return it.'
    },
    explainLines:{
      java:['Structural wrapper: the Solution class scope. No operation runs here.','Setup note: a and b arrive as locals; no column is resolved before the first read.','Signature: getSum takes ints a and b and returns int. Execution starts in the body.','Loop guard: b holds the still-pending carry, so b != 0 means some column is unresolved.','Read step: (a & b) marks every 1&1 column, << 1 moves each mark to the column it is owed to.','Write step 1: XOR keeps every column where exactly one input had a 1 — the carry-free partial sum.','Write step 2: the shifted carry becomes the new b, the only state the guard re-tests.','Loop close: re-tests b; termination is guaranteed because a 32-bit carry chain settles within 32 rounds.','Verdict: b == 0 proves no column is pending, so a is the full sum; return it.','Structural wrapper: close the method scope.','Structural wrapper: close the class scope.'],
      cpp:['Structural wrapper: the Solution class scope. No operation runs here.','Access scope for the public method.','Setup note: a and b arrive by value; no column is resolved before the first read.','Signature: getSum takes ints a and b by value and returns int. Execution starts in the body.','Loop guard: b holds the still-pending carry, so b != 0 means some column is unresolved.','Read step: (a & b) marks every 1&1 column, << 1 moves each mark to the column it is owed to.','Write step 1: XOR keeps every column where exactly one input had a 1 — the carry-free partial sum.','Write step 2: the shifted carry becomes the new b, the only state the guard re-tests.','Loop close: re-tests b; termination is guaranteed because a 32-bit carry chain settles within 32 rounds.','Verdict: b == 0 proves no column is pending, so a is the full sum; return it.','Structural wrapper: close the method scope.','Structural wrapper: close the class scope.'],
      pseudo:['Task scope: add without + or -; the loop below carries that contract.','Guard: repeat exactly while a carry is pending.','Read + shift: the AND finds carry sources, the shift aims them at the next column.','Partial sum: XOR writes every resolved column into a.','Re-queue: the shifted carry is the next round\u2019s work.','Commit: nothing is pending, so a is the sum.']
    },
    code:{
      java:code(`
[def] class Solution {
[init]     // a and b arrive as locals; no column is resolved before the first read.
[init]     public int getSum(int a, int b) {
[loop]         while (b != 0) {
[read]             int carry = (a & b) << 1;
[update]             a = a ^ b;
[update]             b = carry;
[loop]         }
[done]         return a;
[done]     }
[done] }`),
      cpp:code(`
[def] class Solution {
[def] public:
[init]     // a and b arrive by value; no column is resolved before the first read.
[init]     int getSum(int a, int b) {
[loop]         while (b != 0) {
[read]             int carry = (a & b) << 1;
[update]             a = a ^ b;
[update]             b = carry;
[loop]         }
[done]         return a;
[done]     }
[done] };`),
      pseudo:code(`
[init] getSum(a, b):
[loop]   while b != 0:
[read]     carry = (a AND b) shifted-left by 1
[update]     a = a XOR b
[update]     b = carry
[done]   return a`)
    },
    build: buildSumOfTwo
  }
}
