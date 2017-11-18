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

/*
  Using the while function that is returned when any task is scheduled
  we can create multiple tasks which are in-sync with each other.

  In this example, as soon as the task:one executes it de-activates any
  other tasks which register the `.while()` handler.

  By default, when using a `.while()` with the same function
  (.while(fn) === .while(fn)) all grouped `while` clauses are cancelled
  when any is checked and fails.

  If the while function should not be grouped, the second argument can be
  set to `false`.

  GroupedWhile tasks are stored within a `WeakMap`
*/
getNativeAsyncCost().then(() => {
  const coordinator = { active: true };

  const isActive = () => coordinator.active;

  // after the given time, execute
  task
    .after(
      'task:one',
      3000,
      (ref, arg: string) => {
        log('task:one execute', arg);
        log('make coordinator inactive | Current Tasks: ', task.size);
        coordinator.active = false;
      },
      'foo',
    )
    .while(isActive);

  // every interval, execute
  task
    .every(
      'task:two',
      3000,
      (ref, arg: string) => log('task:two execute', arg),
      'bar',
    )
    .while(isActive);

  // immediately execute (nextTick, immediate, timeout priority - first found)
  task
    .defer(
      'task:four',
      (ref, arg: string) => log('task:four execute', arg),
      'qux',
    )
    .while(isActive);

  // every interval and immediately, execute
  task
    .everyNow(
      'task:three',
      3000,
      (ref, arg: string) => log('task:three execute', arg),
      'baz',
    )
    .while(isActive);

  // clear all tasks, killing the event queue and completing execution
  task.after('complete', 10000, () => {
    log('complete - clearing tasks');
    log('tasks size: ', task.size);
    task.clear();
  });
});

/*
  +95.2768   807821793.103321     Native Async Startup Complete (nextTick)
  +3.6487    807821796.752021     task:four execute qux
  +0.1370    807821796.88903      task:three execute baz
  +3003.1620 807824800.051014     task:one execute foo
  +0.2201    807824800.271066     make coordinator inactive | Current Tasks:  3
  +7000.6130 807831800.884032     complete - clearing tasks
  +0.1399    807831801.023911     tasks size:  0
*/
