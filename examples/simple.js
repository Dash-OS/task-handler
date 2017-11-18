/* @flow */
/*
  getNativeAsyncCost() is used on any example which utilizes node.js's
  timers.  This is done to "fire up" the node.js timers which have a
  delay on their first execution.

  This gives us a more realistic look at the performance when utilizing
  the performance.now() testing that our log() command provides.
*/
import { log, getNativeAsyncCost } from '../utils/log';

import createTaskHandler from '../src';

const task = createTaskHandler('simple');

getNativeAsyncCost().then(() => {
  // after the given time, execute
  task.after(
    'task:one',
    3000,
    (ref, arg: string) => log('task:one execute', arg),
    'foo',
  );

  // every interval, execute
  task.every(
    'task:two',
    3000,
    (ref, arg: string) => log('task:two execute', arg),
    'bar',
  );

  // immediately execute (nextTick, immediate, timeout priority - first found)
  task.defer(
    'task:four',
    (ref, arg: string) => log('task:four execute', arg),
    'qux',
  );

  // every interval and immediately, execute
  task.everyNow(
    'task:three',
    3000,
    (ref, arg: string) => log('task:three execute', arg),
    'baz',
  );

  // clear all tasks, killing the event queue and completing execution
  task.after('complete', 10000, () => {
    log('complete - clearing tasks');
    task.clear();
  });
});
