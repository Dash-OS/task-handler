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
  All task executions return a TaskRef.  These can be used to do a variety
  of things - namely cancellation of tasks.

  Tasks can also be cancelled by their ID which is given at the time they
  are scheduled.
*/
getNativeAsyncCost().then(() => {
  log('Schedule task:one (timeout)');
  // after the given time, execute
  const refOne = task.after('task:one', 3000, () => {
    log('task:one executed :(');
  });

  log('Schedule task:two (defer)');
  // we can even cancel process.nextTick() executions.
  task.defer('task:two', () => log('task:two executed'));

  log('Schedule task:three (every)');
  task.every('task:three', 3000, refThree => {
    log('task:three executed (every) - cancelling');
    refThree.cancel();
  });
  // we can cancel by using the ref:
  refOne.cancel();

  // we can also cancel by the id
  task.cancel('task:two');

  log('Tasks Remaining: ', task.size);
});

/*
  +96.8367   814487001.332851     Native Async Startup Complete (nextTick)
  +2.7593    814487004.092128     Schedule task:one (timeout)
  +1.1528    814487005.244885     Schedule task:two (defer)
  +0.3092    814487005.55411      Schedule task:three (every)
  +1.3082    814487006.862357     Tasks Remaining:  1
  +3001.2979 814490008.160292     task:three executed (every) - cancelling
*/
