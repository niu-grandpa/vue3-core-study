import { track, trigger } from './1.响应式系统的作用与实现';

export const ITERATE_KEY = Symbol();

function reactive(target: object) {
  const handler: ProxyHandler<object> = {
    get(target, p, receiver) {},
    set(target, p, newValue, receiver) {},
    deleteProperty(target, p) {},
    ownKeys(target) {},
  };
  return new Proxy(target, handler);
}
