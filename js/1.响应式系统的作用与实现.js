// 1.实现<effect>函数
// 2.实现<cleanup>函数，清除重更新后的副作用关联
// 3.实现<effect>函数嵌套的正确执行，利用栈模拟，副作用函数执行前进栈，
// 执行后出栈，确保<activeEffect>永远保存栈底函数
// 4.实现<scheduler>调度器功能，副作用函数的触发权通过回调传给用户执行
// 5.实现<lazy>功能，不执行<effectFn>函数，作为调用<effect>函数的返回值交由用户
// 6.实现<computed>函数，<lazy>和<scheduler>的结合使用，脏值缓存计算
// 7.实现<wacth>函数
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var bucket = new WeakMap();
    var effectStack = [];
    var activeEffect;
    function track(target, key) {
        if (!activeEffect)
            return;
        var depsMap = bucket.get(target);
        if (!depsMap)
            bucket.set(target, (depsMap = new Map()));
        var deps = depsMap.get(key);
        if (!deps)
            depsMap.set(key, (deps = new Set()));
        deps.add(activeEffect);
        activeEffect.deps.push(deps);
    }
    function trigger(target, key) {
        var depsMap = bucket.get(target);
        if (!depsMap)
            return;
        var effects = depsMap.get(key);
        var effectsToRun = new Set();
        effects &&
            effects.forEach(function (effectFn) {
                if (effectFn !== activeEffect)
                    effectsToRun.add(effectFn);
            });
        effectsToRun.forEach(function (effectFn) {
            var _a;
            if ((_a = effectFn.options) === null || _a === void 0 ? void 0 : _a.scheduler) {
                effectFn.options.scheduler(effectFn);
            }
            else {
                effectFn();
            }
        });
    }
    function effect(fn, options) {
        var result;
        var effectFn = function () {
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
        if (options === null || options === void 0 ? void 0 : options.lazy)
            return effectFn;
        effectFn();
    }
    function computed(getter) {
        var temp, dirty = true;
        // 利用scheduler手动进行触发副作用函数
        var effecFn = effect(getter, {
            lazy: true,
            scheduler: function (fn) {
                if (!dirty) {
                    dirty = true;
                    trigger(obj, 'value');
                }
            },
        });
        var obj = {
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
    function watch(source, cb, options) {
        var getter = typeof source === 'function' ? source : function () { return traverse(source); }, newVal, oldVal;
        var cleanup;
        var onInvalidate = function (fn) {
            // 存储过期回调
            cleanup = fn;
        };
        var job = function () {
            newVal = effectFn();
            // 在调用监听函数之前先执行上一次的过期回调
            cleanup && cleanup();
            cb(oldVal, newVal, onInvalidate);
            oldVal = newVal;
        };
        var effectFn = effect(getter, {
            lazy: true,
            scheduler: function () {
                if (options.flush === 'post') {
                    var p = Promise.resolve();
                    p.then(job);
                }
                else if (options.flush === 'sync') {
                    job();
                }
            },
        });
        options.immediate ? effectFn() : (oldVal = effectFn());
    }
    /** 清除重更新后的副作用关联*/
    function cleanup(fn) {
        for (var i = 0; i < fn.deps.length; i++) {
            var depsMap = fn.deps[i];
            depsMap.delete(fn);
        }
        fn.deps = [];
    }
    function traverse(value, seen) {
        if (seen === void 0) { seen = new Set(); }
        if (typeof value !== 'object' || value === null || seen.has(value))
            return;
        seen.add(value);
        for (var key in value) {
            traverse(value[key], seen);
        }
        return value;
    }
    function jobQueue(job) {
        var p = Promise.resolve();
        var stack = new Set();
        var flush = true;
        if (!flush)
            return;
        p.then(function () {
            stack.add(job);
            flush = false;
        }).finally(function () {
            flush = true;
        });
        return function () {
            stack.forEach(function (fn) { return fn(); });
            stack.clear();
        };
    }
});
