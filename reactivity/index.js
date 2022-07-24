/**
 * WeakMap< key: Map< key: Set > >
 * { target: { key: [] } }
 */
const bucket = new WeakMap();
const effectStack = [];

let activeEffect;

function wacthEffect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    let res = fn && fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  };
  effectFn.deps = [];
  effectFn.options = options;
  if (!effectFn.lazy) effectFn();
  return fn;
}

function computed(getter) {
  let value,
    dirty = true;
  const effectFn = wacthEffect(getter, {
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
        dirty = false;
        value = effectFn();
        track(obj, 'value');
      }
      return value;
    },
  };
  return obj;
}

function watch(getter, cb) {
  let obj = null;
  if (typeof getter === 'function') obj = getter();
  obj = getter;
  wacthEffect(() => obj, {
    scheduler() {
      cb();
    },
  });
}

function reactive(rawData) {
  const handler = {
    get(target, key) {
      track(target, key);
      return target[key].bind(target);
    },
    set(target, key, newVal, receiver) {
      if (target[key] === newVal) return;
      const res = Reflect.set(target, key, newVal, receiver);
      trigger(target, key);
      return res;
    },
  };
  const data = new Proxy(rawData, handler);
  return data;
}

/**
 * 追踪依赖并建立和 activeEffect 的关联添加到 bucket 中
 */
function track(target, key) {
  if (!activeEffect) return;
  let depsMap = bucket.get(target);
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}

function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effect = depsMap.get(key);
  const effectToRun = new Set();
  effect && effect.forEach((fn) => fn !== activeEffect && effectToRun.add(fn));
  effectToRun.forEach((fn) => {
    if (!fn.options.lazy) {
      fn();
    }
    if (fn.options.scheduler) {
      fn.options.scheduler(fn);
      return;
    }
  });
}

function cleanup(effecFn) {
  for (let i = 0; i < effecFn.deps.length; i++) {
    const deps = effecFn.deps[i];
    deps.delete(effecFn);
  }
  effecFn.deps.length = 0;
}
