export type AnyFn = () => any;

type Bucket = Map<Key, Set<EffectFn>>;

type Key = string | number;

type EffectFn = {
  (): any;
  deps: Set<EffectFn>[];
  options?: EffectOptions;
};

interface EffectOptions {
  lazy?: boolean;
  scheduler?: (fn: AnyFn) => void;
}

type WatchHookCallback = (oldVal: any, newVal: any, onInvalidate: (fn: AnyFn) => any) => void;

interface WatchHookOptions {
  immediate?: boolean;
  flush?: 'pre' | 'post' | 'sync';
}
