export type AnyFn = () => any;

export type EffectFn = {
  (): any;
  deps: Set<EffectFn>[];
  options?: EffectOptions;
};

export interface EffectOptions {
  lazy?: boolean;
  scheduler?: (fn: AnyFn) => void;
}
