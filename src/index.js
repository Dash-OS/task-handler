/* @flow */

type TaskID = string;

type TaskMap = Map<TaskID, number>;

type TaskMaps = {
  +defer: DeferDescriptor,
  +[taskType: string]: TaskMap,
};

type TaskCancelFunction = () => boolean;

type TaskTypes =
  | 'timeout'
  | 'timeouts'
  | 'intervals'
  | 'interval'
  | 'defer'
  | 'defers';

type WhileConditionFn = (ref: CallbackRef, ...args: Array<any>) => boolean;

type CallbackRefShape = {
  task?: TaskHandler,
  id?: TaskID,
  cancel?: TaskCancelFunction,
  while?: (condition: WhileConditionFn) => void,
};

type CallbackRef = {
  +task: TaskHandler,
  +id: TaskID,
  +cancel: TaskCancelFunction,
  +while: (condition: WhileConditionFn) => void,
  _while?: [mixed, WhileConditionFn],
};

// type TaskTimeoutFunction = (ref: CallbackRef, ...args: Array<*>) => mixed | any;

type DeferDescriptor = {|
  id: void | ['tick', void] | ['timeout', number] | ['immediate', mixed],
  scheduled: boolean,
  +queue: Map<TaskID, [CallbackRef, CallbackFn, Array<any>]>,
|};

type CallbackFn = (ref: CallbackRef, ...args: Array<*>) => mixed;

const HANDLERS: Map<string, TaskHandler> = new Map();

function executeDefer(handler) {
  handler.types.defer.scheduled = false;
  handler.types.defer.id = undefined;
  const { queue } = handler.types.defer;
  queue.forEach(([ref, fn, args], id) => {
    // we have to delete each as we execute so that if the
    // callback schedules another execution we don't remove
    // them.
    queue.delete(id);
    try {
      executeCallback(handler, 'defer', fn, ref, args);
    } catch (e) {
      // Catch is currently impossible to cover by Flow :(
      console.error('[TaskHandler]: Execute Defer Error: ', e);
    }
  });
}

function scheduleDefer(handler) {
  handler.types.defer.scheduled = true;
  if (typeof process === 'object' && typeof process.nextTick === 'function') {
    return ['tick', process.nextTick(executeDefer, handler)];
  } else if (typeof setImmediate === 'function') {
    return ['immediate', setImmediate(executeDefer, handler)];
  }
  return ['timeout', setTimeout(executeDefer, 0, handler)];
}

// every interval, execute
// task.every(
//   'task:two',
//   3000,
//   (ref, arg: string) => log('task:two execute', arg),
//   'bar',
// ).while(() => true);
function registerWhile(handler, ref, condition, grouped) {
  ref._while = [grouped, condition];
  if (grouped !== false) {
    const refs = handler.whileConditions.get(condition) || new Set();
    refs.add(ref);
    handler.whileConditions.set(condition, refs);
  }
}

function cancelGroupedCallbacks(handler, condition) {
  const refs = handler.whileConditions.get(condition);
  if (refs instanceof Set) {
    refs.forEach(ref => {
      refs.delete(ref);
      ref.cancel();
    });
    handler.whileConditions.delete(condition);
  }
}

function registerRef(
  handler,
  id,
  refShape: CallbackRefShape = {},
): CallbackRef {
  handler.cancel(id);
  const ref: CallbackRef = {
    task: handler,
    id,
    cancel: refShape.cancel || (() => handler.cancel(id)),
    while:
      refShape.while ||
      ((condition: WhileConditionFn, grouped?: false) =>
        registerWhile(handler, ref, condition, grouped)),
  };
  handler.taskRefs.set(id, ref);
  return ref;
}

function executeCallback(
  handler: TaskHandler,
  type: TaskTypes,
  fn: CallbackFn,
  ref: CallbackRef,
  args: Array<any>,
) {
  let execute = true;
  if (Array.isArray(ref._while)) {
    if (!ref._while[1](ref, ...args)) {
      if (ref._while[0] !== false) {
        // when not grouped, we cancel all grouped listeners
        cancelGroupedCallbacks(handler, ref._while[1]);
      } else {
        ref.cancel();
      }
      execute = false;
    }
  }
  if (execute) {
    if (type === 'timeouts') {
      ref.cancel();
    }
    fn(ref, ...args);
  }
}

function resetDeferIfNeeded(handler) {
  // check if we can cancel the scheduled type since our
  // queue is empty.  We can't cancel nextTick so we will
  // just ignore it when it is called.
  const { id, queue } = handler.types.defer;
  if (!queue.size && id) {
    switch (id[0]) {
      default:
      case 'tick': {
        return;
      }
      case 'immediate': {
        clearImmediate(id[1]);
        break;
      }
      case 'timeout': {
        clearTimeout(id[1]);
        break;
      }
    }
    handler.types.defer.scheduled = false;
    handler.types.defer.id = undefined;
  }
}

class TaskHandler {
  +whileConditions: WeakMap<WhileConditionFn, Set<CallbackRef>> = new WeakMap();
  +taskRefs: Map<TaskID, CallbackRef> = new Map();

  +types: TaskMaps = {
    timeouts: new Map(),
    intervals: new Map(),
    defer: {
      id: undefined,
      scheduled: false,
      queue: new Map(),
    },
  };

  get size(): number {
    return (
      this.types.timeouts.size +
      this.types.intervals.size +
      this.types.defer.queue.size
    );
  }

  // create a timeout, cancelling any timeouts
  // currently scheduled with the given id if any
  after = (
    id: TaskID,
    delay: number,
    fn: CallbackFn,
    ...args: Array<*>
  ): CallbackRef => {
    const ref: CallbackRef = registerRef(this, id);
    this.types.timeouts.set(
      id,
      setTimeout(executeCallback, delay, this, 'timeouts', fn, ref, args),
    );
    return ref;
  };

  defer = (id: TaskID, fn: CallbackFn, ...args: Array<*>): CallbackRef => {
    const ref: CallbackRef = registerRef(this, id, {
      cancel: () => this.cancelDefer(id),
    });
    this.types.defer.queue.set(id, [ref, fn, args]);
    if (this.types.defer.scheduled === false) {
      this.types.defer.id = scheduleDefer(this);
    }
    return ref;
  };

  every = (
    id: TaskID,
    interval: number,
    fn: CallbackFn,
    ...args: Array<*>
  ): CallbackRef => {
    const ref: CallbackRef = registerRef(this, id);
    this.types.intervals.set(
      id,
      setInterval(executeCallback, interval, this, 'intervals', fn, ref, args),
    );
    return ref;
  };

  everyNow = (
    id: TaskID,
    interval: number,
    fn: CallbackFn,
    ...args: Array<*>
  ): CallbackRef => {
    const deferralID = `${id}:defer:${Date.now()}`;
    const deferRef: CallbackRef = this.defer(deferralID, fn, ...args);
    const ref: CallbackRef = registerRef(this, id, {
      cancel: () => {
        deferRef.cancel();
        return this.cancel(id);
      },
      while: (condition: WhileConditionFn, grouped?: false) => {
        if (this.types.defer.queue.has(deferRef.id)) {
          registerWhile(this, deferRef, condition, grouped);
        }
        registerWhile(this, ref, condition, grouped);
      },
    });
    this.types.intervals.set(
      id,
      setInterval(executeCallback, interval, this, 'intervals', fn, ref, args),
    );
    return ref;
  };

  // cancel a timeout or every by the given id
  // returns true/false if anything was actually
  // cancelled
  cancel = (id: TaskID, type?: TaskTypes): boolean => {
    const ref = this.taskRefs.get(id);
    this.taskRefs.delete(id);
    if (!ref) {
      // task doesnt exist
      return false;
    }

    let timers: TaskMap;

    if (Array.isArray(ref._while) && ref._while[0] !== false) {
      // We need to clear ourselves from the grouped whileConditions
      const refs = this.whileConditions.get(ref._while[1]);
      if (refs instanceof Set) {
        refs.delete(ref);
        if (!refs.size && Array.isArray(ref._while)) {
          this.whileConditions.delete(ref._while[1]);
        }
      }
    }

    if (type) {
      switch (type) {
        case 'timeout':
        case 'timeouts': {
          type = 'timeouts';
          timers = this.types.timeouts;
          break;
        }
        case 'interval':
        case 'intervals': {
          type = 'intervals';
          timers = this.types.intervals;
          break;
        }
        case 'defer':
        case 'defers': {
          return this.cancelDefer(id);
        }
        default: {
          return false;
        }
      }
      if (!timers.has(id)) {
        return false;
      }
    } else if (this.types.timeouts.has(id)) {
      type = 'timeouts';
      timers = this.types.timeouts;
    } else if (this.types.intervals.has(id)) {
      type = 'intervals';
      timers = this.types.intervals;
    } else if (this.types.defer.queue.has(id)) {
      return this.cancelDefer(id);
    } else {
      return false;
    }

    if (type === 'timeouts') {
      clearTimeout(timers.get(id));
    } else if (type === 'intervals') {
      clearInterval(timers.get(id));
    }

    timers.delete(id);

    return true;
  };

  cancelDefer = (taskID: TaskID): boolean => {
    const { queue } = this.types.defer;
    const deferHas = queue.has(taskID);
    if (deferHas) {
      queue.delete(taskID);
      resetDeferIfNeeded(this);
    }
    return deferHas;
  };

  // cancel all currently scheduled timeouts and intervals
  // unless types is provided
  clear = (...types: Array<TaskTypes>): void => {
    if (!types.length) {
      types = ['timeouts', 'intervals', 'defer'];
    }
    return types.forEach(type => {
      if (type === 'defer') {
        this.types.defer.queue.clear();
        resetDeferIfNeeded(this);
      } else {
        return this.types[type].forEach((timerID, id) => {
          this.cancel(id, type);
        });
      }
    });
  };

  has = (...ids: Array<TaskID>): boolean =>
    ids.every(
      id =>
        this.types.intervals.has(id) ||
        this.types.timeouts.has(id) ||
        this.types.defer.queue.has(id),
    );
}

export default (id?: string = 'm') => {
  let m = HANDLERS.get(id);
  if (!m) {
    m = new TaskHandler();
    HANDLERS.set(id, m);
  }
  return m;
};

export { TaskHandler };
