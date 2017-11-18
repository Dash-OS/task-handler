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
  task
    .after(
      'task:one',
      3000,
      (ref, arg: string) => log('task:one execute', arg),
      'foo',
    )
    .promise()
    .then(result => {
      log('After Callback Result: ', result);
    });
});
