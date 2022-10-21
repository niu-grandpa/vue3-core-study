export type AnyFn = () => any;

type EffectFn = {
  (): any;
  deps: Set<EffectFn>[];
  options?: EffectOptions;
};

interface EffectOptions {
  lazy?: boolean;
  scheduler?: (fn: AnyFn) => void;
}

type WatchHookCallback = (oldVal: any, newVal: any) => void;

interface WatchHookOptions {
  immediate?: boolean;
  flush?: 'pre' | 'post' | 'sync';
}
