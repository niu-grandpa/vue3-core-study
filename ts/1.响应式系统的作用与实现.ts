// 1.实现<effect>函数
// 2.实现<cleanup>函数，清除重更新后的副作用关联
// 3.实现<effect>函数嵌套的正确执行，利用栈模拟，副作用函数执行前进栈，
// 执行后出栈，确保<activeEffect>永远保存栈底函数
// 4.实现<scheduler>调度器功能，副作用函数的触发权通过回调传给用户执行
// 5.实现<lazy>功能，不执行<effectFn>函数，作为调用<effect>函数的返回值交由用户
// 6.实现<computed>函数，<lazy>和<scheduler>的结合使用，脏值缓存计算
// 7.实现<wacth>函数

import {
  AnyFn,
  Bucket,
  EffectFn,
  EffectOptions,
  Key,
  WatchHookCallback,
  WatchHookOptions,
} from './typeing';

const bucket = new WeakMap<object, Bucket>();
const effectStack: EffectFn[] = [];
let activeEffect: EffectFn | undefined;

function track(target: object, key: Key) {
  if (!activeEffect) return;
  let depsMap = bucket.get(target);
  if (!depsMap) bucket.set(target, (depsMap = new Map()));
  let deps = depsMap.get(key);
  if (!deps) depsMap.set(key, (deps = new Set()));
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}

function trigger(target: object, key: Key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;

  const effects = depsMap.get(key);
  const effectsToRun = new Set<EffectFn>();

  effects &&
    effects.forEach(effectFn => {
      if (effectFn !== activeEffect) effectsToRun.add(effectFn);
    });

  effectsToRun.forEach(effectFn => {
    if (effectFn.options?.scheduler) {
      effectFn.options.scheduler(effectFn);
    } else {
      effectFn();
    }
  });
}

function effect(fn: AnyFn, options?: EffectOptions): any {
  let result;

  const effectFn: EffectFn = () => {
    cleanup(effectFn);

    activeEffect = effectFn;
    effectStack.push(effectFn);

    result = fn();

    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];

    return result;
  };

  effectFn.deps = [];
  effectFn.options = options;

  if (options?.lazy) return effectFn;
  effectFn();
}

function computed(getter: AnyFn) {
  let temp: any,
    dirty = true;

  // 利用scheduler手动进行触发副作用函数
  const effecFn = effect(getter, {
    lazy: true,
    scheduler(fn) {
      if (!dirty) {
        dirty = true;
        trigger(obj, 'value');
      }
    },
  });

  const obj = {
    get value() {
      if (dirty) {
        temp = effecFn();
        dirty = false;
      }
      // 每次访问value时手动追踪依赖
      track(obj, 'value');
      return temp;
    },
  };

  return obj.value;
}

function watch(source: any, cb: WatchHookCallback, options: WatchHookOptions) {
  let getter = typeof source === 'function' ? source : () => traverse(source),
    newVal: any,
    oldVal: any;

  const job = () => {
    newVal = effectFn();
    cb(oldVal, newVal);
    oldVal = newVal;
  };

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if (options.flush === 'post') {
        const p = Promise.resolve();
        p.then(job);
      } else if (options.flush === 'sync') {
        job();
      }
    },
  });

  options.immediate ? effectFn() : (oldVal = effectFn());
}

/** 清除重更新后的副作用关联*/
function cleanup(fn: EffectFn) {
  for (let i = 0; i < fn.deps.length; i++) {
    const depsMap = fn.deps[i];
    depsMap.delete(fn);
  }
  fn.deps = [];
}

function traverse(value: any, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  seen.add(value);
  for (const key in value) {
    traverse(value[key], seen);
  }
  return value;
}

function jobQueue(job: EffectFn) {
  const p = Promise.resolve();
  const stack = new Set<EffectFn>();
  let flush = true;
  if (!flush) return;
  p.then(() => {
    stack.add(job);
  }).finally(() => {
    flush = true;
  });
  return () => {
    stack.forEach(fn => fn());
    stack.clear();
  };
}
