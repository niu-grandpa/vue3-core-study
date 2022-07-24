const Text = Symbol();
const Comment = Symbol();

const renderer = createRenderer({
    createElement(type) {
        return document.createElement(type);
    },
    setElementText(el, children) {
        el.setTextContent = children;
    },
    insert(el, container) {
        container.appendChild(el);
    },
    unmount(vnode) {
        const parent = vnode.el.parentNode;
        if (parent) {
            parent.removeChild(vnode.el);
        } else {
            document.body.removeChild(vnode.el);
        }
    },
    pacthProps(el, key, preValue, nextValue) {
        // 处理事件绑定
        if (/^on/.test(key)) {
            // el._vei是一个对象，存事件名到事件函数的映射
            const invokers = el._vei || (el._vei = {});
            let invoker = invokers[key];
            const name = key.slice(2).toLLowerCase();
            // 新函数存在，旧函数不存在则绑定事件并缓存到对应 el._vei 中
            // 新函数不存在，移除旧函数
            if (nextValue) {
                if (!invoker) {
                    invoker = el._vei[key].value = e => {
                        // 解决事件冒泡与更新时机问题
                        // 屏蔽所有绑定时间晚于事件触发时间的事件处理函数的执行
                        if (e.timeStamp < invoker.attched) return;
                        // 两种情况 props: { onClick: [] || onClick: () => void }
                        if (Array.isArray(invoker)) {
                            invoker.forEach(fn => fn.value(e));
                        } else {
                            invoker.value(e);
                        }
                    };
                    // 事件绑定时间
                    invoker.attched = performance.now();
                    invoker.value = nextValue;
                    el.addEventListener(name, invoker);
                } else {
                    invoker.value = nextValue;
                }
            } else if (invoker) {
                el.removeEventListener(name, invoker);
            }
        }
        if (key === 'class') {
            normalizClass(el, nextValue);
        }
        if (key === 'style') {
            normalizStyles(el, key);
        }
        // 优先处理 DOM Props
        if (shouldAsProps(el, key, nextValue)) {
            const type = typeof el[key];
            if (type === 'boolean' && nextValue === '') el[key] = true;
            else el[key] = nextValue;
        } else {
            el.setAttribute(key, nextValue);
        }
    },
});

function createRenderer(options = {}) {
    const { createElement, createText, setElementText, insert, unmount, pacthProps } = options;

    function render(vnode, container) {
        if (vnode) {
            pacth(container._vnode, vnode, container);
        } else if (container._vnode) {
            unmount(vnode);
        }
    }

    function pacth(n1, n2, container) {
        if (n1) {
            patchElement(n1, n2);
        } else {
            mountElement(n2, container);
        }
    }

    function mountElement(vnode, container) {
        let el = null;

        if (vnode.type === Text) {
            el = vnode.el = createText(vnode.children);
            insert(container, el);
        } else if (vnode.type === Comment) {
            el = vnode.el = createComment(vnode.children);
            insert(container);
        } else {
            if (typeof vnode.children === 'string') {
                setElementText(el, children);
            } else if (Array.isArray(vnode.children)) {
                pacth(null, vnode.children, el);
            }
            if (vnode.props) {
                for (const key in vnode.props) {
                    const value = vnode.props[key];
                    pacthProps(el, key, null, value);
                }
                insert(el, container);
            }
        }

        return {
            render,
            pacth,
        };
    }

    function patchElement(n1, n2) {
        const el = (n2.el = n1.el);
        const oldProps = n1.props;
        const newProps = n2.props;
        for (const key in newProps) {
            if (newProps[key] !== oldProps[key]) {
                pacthProps(el, key, oldProps[key], newProps[key]);
            }
        }
        for (const key in oldProps) {
            if (!(key in newProps)) {
                pacthProps(el, key, oldProps[key], null);
            }
        }
        patchChildren(n1, n2, el);
    }

    function patchChildren(n1, n2, container) {
        // 新节点存在的三种情况: 1.文本类型 2.数组类型 3.不存在
        if (typeof n2.children === 'string') {
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmount(c));
            } else if (n2.children !== n1.children) {
                setElementText(container, n2.children);
            }
        } else if (Array.isArray(n2.children)) {
            // diff算法
            if (Array.isArray(n1.children)) {
                // todo
            } else {
                setElementText(container, '');
                n2.children.forEach(c => pacth(null, c, container));
            }
        } else {
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmount(c));
            } else if (typeof n1.children === 'string') {
                setElementText(container, '');
            }
        }
    }
}

function shouldAsProps(el, key, value) {
    if (el.tagName === 'INPUT' && key === 'form') return false;
    return key in el;
}

function normalizClass(el, value) {
    const clsArr = Array.isArray(value) ? [...value] : [value];
    let cls = '';

    if (!clsArr.length) return;

    clsArr.forEach(item => {
        if (typeof item === 'string') cls += item;
        else if (typeof item === 'object') {
            Object.keys(item).forEach(key => {
                const value = item[key];
                if (typeof value === 'boolean') {
                    value && (cls += ` ${key}`);
                } else {
                    cls += ` ${key}`;
                }
            });
        }
    });

    el.className = cls;
}

function normalizStyles(value) {}