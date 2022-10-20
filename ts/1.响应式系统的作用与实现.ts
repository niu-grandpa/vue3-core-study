// 1.实现<effect>函数
// 2.实现<cleanup>函数，清除重更新后的副作用关联
// 3.实现<effect>函数嵌套的正确执行，利用栈模拟，副作用函数执行前进栈，
// 执行后出栈，确保<activeEffect>永远保存栈底函数
// 4.实现<scheduler>调度器功能，副作用函数的触发权通过回调传给用户执行
// 5.实现<lazy>功能，不执行<effectFn>函数，作为调用<effect>函数的返回值交由用户
// 6.实现<computed>函数，<lazy>和<scheduler>的结合使用，脏值缓存计算

import { AnyFn, EffectFn, EffectOptions } from './typeing';

const effectStack: EffectFn[] = [];
let activeEffect: EffectFn | undefined;

export function effect(fn: AnyFn, options?: EffectOptions) {
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

export function computed(getter: AnyFn) {
  let temp: any,
    dirty = true;

  const effecFn = effect(getter, {
    lazy: true,
    scheduler(fn) {
      if (!dirty) {
        dirty = true;
        trigger();
      }
    },
  });

  const obj = {
    get value() {
      if (dirty) {
        temp = (effecFn as EffectFn)();
        dirty = false;
        track();
      }
      return temp;
    },
  };

  return obj.value;
}

/** 清除重更新后的副作用关联*/
function cleanup(fn: EffectFn) {
  for (let i = 0; i < fn.deps.length; i++) {
    const depsMap = fn.deps[i];
    depsMap.delete(fn);
  }
  fn.deps = [];
}

function track() {}

function trigger() {}
