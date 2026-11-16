/**
 * car-fleet — live semantic adapter (Stack / monotonic-stack).
 *
 * Walkthrough algorithm: sort cars by position ascending, scan from the car
 * closest to target backwards, keep the slowest arrival time seen (maxTime);
 * a car with time > maxTime founds a new fleet, otherwise it merges.
 * O(n log n) time, O(n) space.
 *
 * Staged source: .workers/jobs/question-owners-150/car-fleet/car-fleet.adapter.js
 * (signature, lesson, Java/C++/pseudo, buildCarFleet event emitter) — ported to
 * the live shape: shared helpers imported from semantic-core.js, no local
 * code/frame redefinitions. Signature equals the live judge signature exactly.
 *
 * Visual bound: at most 10 cars per walkthrough (judge allows far larger
 * inputs). Longer runs must supply their own slice; this module throws an
 * honest error instead of silently truncating.
 */
import { code, frame, boundedFrames } from './semantic-core.js'

// boundedFrames is applied by semantic.js (single compaction pass); the import
// keeps this adapter on the shared helper contract. Adapters return FULL lists.

const MAX_N = 10
const fmt = (t) => String(Math.round(t * 1000) / 1000)

const carFleetJava = code(`
[def] class Solution {
[def]     public int carFleet(int target, int[] position, int[] speed) {
[init]         int n = position.length;
[init]         int[][] cars = new int[n][2];
[init]         for (int i = 0; i < n; i++) { cars[i][0] = position[i]; cars[i][1] = speed[i]; }
[sort]         java.util.Arrays.sort(cars, (a, b) -> a[0] - b[0]);
[init]         double maxTime = 0.0;
[init]         int fleets = 0;
[scan]         for (int i = n - 1; i >= 0; i--) {
[time]             double time = (double)(target - cars[i][0]) / cars[i][1];
[check]             if (time > maxTime) {
[fleet]                 fleets++;
[fleet]                 maxTime = time;
[def]             } else {
[join]                 // joins the fleet ahead; fleets and maxTime stay the same.
[def]             }
[def]         }
[return]         return fleets;
[def]     }
[def] }
`)

const carFleetCpp = code(`
[def] class Solution {
[def] public:
[def]     int carFleet(int target, vector<int>& position, vector<int>& speed) {
[init]         int n = (int)position.size();
[init]         vector<array<int,2>> cars(n);
[init]         for (int i = 0; i < n; i++) { cars[i] = {position[i], speed[i]}; }
[sort]         sort(cars.begin(), cars.end());
[init]         double maxTime = 0.0;
[init]         int fleets = 0;
[scan]         for (int i = n - 1; i >= 0; i--) {
[time]             double time = (double)(target - cars[i][0]) / cars[i][1];
[check]             if (time > maxTime) {
[fleet]                 fleets++;
[fleet]                 maxTime = time;
[def]             } else {
[join]                 // joins the fleet ahead; fleets and maxTime stay the same.
[def]             }
[def]         }
[return]         return fleets;
[def]     }
[def] };
`)

const carFleetPseudo = code(`
[def] carFleet(target, position, speed):
[init]   n = len(position); cars = zip(position, speed)
[sort]   sort cars by position ascending
[init]   maxTime = 0; fleets = 0
[scan]   for i = n - 1 down to 0:
[time]     time = (target - cars[i].pos) / cars[i].speed
[check]     if time > maxTime:
[fleet]       fleets += 1; maxTime = time
[join]     else: join the fleet ahead (no new fleet)
[return]   return fleets
`)

function checkedArgs(args) {
  if (!Array.isArray(args) || args.length !== 3) throw new Error('car-fleet expects [target, position, speed]')
  const [target, position, speed] = args
  if (!Number.isSafeInteger(target) || target <= 0) throw new Error('car-fleet needs a positive integer target')
  for (const [name, arr] of [['position', position], ['speed', speed]]) {
    if (!Array.isArray(arr) || arr.length === 0 || arr.length > MAX_N) {
      throw new Error(`car-fleet walkthrough needs 1..${MAX_N} cars; got ${Array.isArray(arr) ? arr.length : 'non-array'} for ${name}`)
    }
    if (!arr.every(Number.isSafeInteger)) throw new Error(`car-fleet needs integer ${name} values`)
  }
  if (position.length !== speed.length) throw new Error('car-fleet needs position.length == speed.length')
  if (!speed.every((v) => v > 0)) throw new Error('car-fleet needs positive speeds')
  if (!position.every((p) => p >= 0 && p < target)) throw new Error('car-fleet needs 0 <= position[i] < target')
  return { target, position: position.slice(), speed: speed.slice() }
}

export function buildCarFleet(args) {
  const { target, position, speed } = checkedArgs(args)
  const n = position.length
  // Pair up, sort by position ascending, then scan from closest to target.
  const cars = position.map((pos, k) => ({ pos, spd: speed[k], time: (target - pos) / speed[k] }))
  cars.sort((a, b) => a.pos - b.pos)
  const values = cars.map((c) => c.pos)

  const leaders = [] // sorted-array indices heading a fleet (monotonic stack of slowest times)
  const resolved = {} // sorted-array index -> fleet number
  let maxTime = 0
  let fleets = 0
  const frames = []
  const anchors = []

  const hl = (current) => {
    const h = {}
    for (const l of leaders) h[l] = 'ok'
    for (const key of Object.keys(resolved)) {
      const idx = Number(key)
      if (!(idx in h)) h[idx] = 'dim'
    }
    if (current !== null && current !== undefined) h[current] = 'accent'
    return h
  }
  const state = (current, extra = {}) => ({
    pointers: current === null ? {} : { i: current },
    highlights: hl(current),
    values: values.slice(),
    stack: leaders.slice(),
    resolved: { ...resolved },
    vars: { target, n, fleets, maxTime: fmt(maxTime), ...extra },
  })
  const push = (step, label, note, current, extra) =>
    frames.push(frame(step, label, note, state(current, extra)))

  push('init', 'Pair cars', `n=${n} cars at target=${target}; pair each position with its speed.`, null)
  push('sort', 'Sort by position', `closest to target last: [${values.join(',')}].`, null)

  for (let i = n - 1; i >= 0; i--) {
    const c = cars[i]
    push('scan', `Scan car at ${c.pos}`, `pos=${c.pos}, speed=${c.spd}; fleets=${fleets} so far.`, i, { pos: c.pos, spd: c.spd })
    push('time', `Arrival time ${fmt(c.time)}`, `(${target}-${c.pos})/${c.spd} = ${fmt(c.time)}h.`, i, { pos: c.pos, spd: c.spd, time: fmt(c.time) })
    if (c.time > maxTime) {
      push('check', 'Slower than ahead', `${fmt(c.time)} > ${fmt(maxTime)}: cannot catch fleet ${fleets || 'none'}.`, i, { pos: c.pos, time: fmt(c.time) })
      fleets += 1
      maxTime = c.time
      leaders.push(i)
      resolved[i] = fleets
      anchors.push(frames.length)
      push('fleet', `New fleet ${fleets}`, `fleet ${fleets} headed at ${c.pos}; slowest=${fmt(maxTime)}.`, i, { pos: c.pos, time: fmt(c.time) })
    } else {
      push('check', 'Catches fleet ahead', `${fmt(c.time)} <= ${fmt(maxTime)}: merges before target.`, i, { pos: c.pos, time: fmt(c.time) })
      resolved[i] = fleets
      anchors.push(frames.length)
      push('join', `Join fleet ${fleets}`, `car at ${c.pos} joins fleet ${fleets}; slowest stays ${fmt(maxTime)}.`, i, { pos: c.pos, time: fmt(c.time) })
    }
  }

  anchors.push(frames.length)
  push('return', 'Return fleets', `return ${fleets}: ${fleets} fleet${fleets === 1 ? '' : 's'} reach ${target}.`, null)
  return { kind: 'array', layout: { values: values.slice() }, frames, result: fleets, anchors }
}

export const adapters = {
  'car-fleet': {
    signature: { name: 'carFleet', params: ['int', 'int[]', 'int[]'], return: 'int' },
    lesson: {
      idea: 'Sort cars by position, scan back from target, keep slowest arrival: slower starts a fleet, faster merges.',
      trap: 'A car catching a fleet exactly at target still merges (time <= maxTime); only strict > starts a fleet.',
      time: 'O(n log n)',
      space: 'O(n)',
    },
    explain: {
      def: 'Scope wrapper around the fleet count; no algorithm work happens on these lines.',
      init: 'Pair each start position with its speed and reset the slowest-fleet time and fleet count.',
      sort: 'Order cars by start position so the scan below always meets the closest-to-target car first.',
      scan: 'Visit the next car toward the start line; every car is judged exactly once against the fleets ahead.',
      time: 'Compute this car solo arrival time as remaining distance divided by its own speed.',
      check: 'Compare against the slowest fleet ahead: strictly slower escapes into a new fleet, else it merges.',
      fleet: 'Record a new fleet and raise the slowest time, since nothing behind can pass this car now.',
      join: 'Fold the car into the fleet ahead; the count and slowest time do not change.',
      return: 'Return the fleet count once every car has either founded or joined a fleet.',
    },
    explainLines: {
      java: {
        13: 'End of the new-fleet branch: control falls to the loop update when a fleet is founded.',
        15: 'End of the merge branch: nothing changes, the loop simply advances to the next car.',
        17: 'End of the backward scan: every car has founded or joined exactly one fleet.',
        18: 'Report the fleet count built by the scan above.',
      },
      cpp: {
        14: 'End of the new-fleet branch: control falls to the loop update when a fleet is founded.',
        16: 'End of the merge branch: nothing changes, the loop simply advances to the next car.',
        18: 'End of the backward scan: every car has founded or joined exactly one fleet.',
        19: 'Report the fleet count built by the scan above.',
      },
      pseudo: {
        8: 'Merge path: the car is absorbed and the scan moves on with no counter change.',
      },
    },
    code: { java: carFleetJava, cpp: carFleetCpp, pseudo: carFleetPseudo },
    build: buildCarFleet,
  },
}
