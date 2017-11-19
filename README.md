# task-handler

A simple, dependency-free Task Manager to make handling of your Javascript
Timers easier to work with.

Combined with [pubchan](https://www.github.com/Dash-OS/pubchan), provides a
lightweight and powerful toolkit for managing asynchronous coordination of your
applications events.

> **Note:** Documentation is currently a work in progress. However, the code
> itself is at a stable level and used in production. This module has been
> lifted from our private repositories and released to the public.

## Install

```
yarn add task-handler
```

**or**

```
npm install --save task-handler
```

## 100% Flow Coverage

Proudly built with 100% Flow Coverage and exported .flow.js files so your flow
projects will benefit!

We strongly recommend you look over the
[types](https://github.com/Dash-OS/task-handler/tree/master/src/index.js) in the
source. This will give you an idea of how the various pieces of the package
work.

> **Note:** There are certain things Flow is not capable of providing type
> coverage for, such as try/catch blocks. These are not included in our
> assessment of "100% Coverage".

## Example

### Simple

```js
/* @flow */

import createTaskHandler from 'task-handler';

const task = createTaskHandler('simple');

// after timeout
task.after('task:one', 3000, () => log('task:one execute'));

// every interval, execute
task.every('task:two', 3000, () => log('task:two execute'));

// immediately execute (nextTick, immediate, timeout priority - first found)
task.defer('task:four', () => log('task:four execute'));

// every interval and immediately (defer), execute
task.everyNow('task:three', 3000, () => log('task:three execute'));

// clear all tasks, killing the event queue and completing execution
task.after('complete', 10000, () => {
  log('complete - clearing tasks');
  task.clear();
});
```

### More Examples

For more examples you can check out the
[examples directory](https://github.com/Dash-OS/task-handler/tree/master/examples)

---

## Task Handler Concepts

Below we will document some of the common patterns that can be deployed while
using `Task Handler`.

### While Condition

A `While Condition` provides a mechanism for providing a condition that must be
true for a given task to be executed. This can cleanup our code and make it
easier to read.

Consider the following:

```js
import createTaskHandler from 'task-handler';
const task = createTaskHandler();

const state = { handshaked: false };

// check if our other code has set handshaked to true before the time is up
task.after('handshake', HANDSHAKE_TIMEOUT_MS, () => {
  if (!state.handshaked) {
    disconnect(403, 'Failed to Authenticate: Handshake Failure');
  }
});
```

While this is a simple example and is not hard to read, it can be made more
concise by separating the pieces with a `While Condition`.

```js
task
  .after('handshake', HANDSHAKE_TIMEOUT_MS, () =>
    disconnect(403, 'Failed to Authenticate: Handshake Failure'),
  )
  .while(() => !state.handshaked);
```

These can be especially helpful with `every` and `defer` timers. While also is
grouped by reference, allowing a single while condition failing to cancel other
timers automatically.

For more examples check out the
[while examples](https://github.com/Dash-OS/task-handler/tree/master/examples/while.js)

---

## Common Type Signatures

Below are a few of the common type signatures describing the values which are
used throughout the API for `task-handler`.

```js
type TaskID = string;

type TaskCancelFunction = () => boolean;

type TaskTypes =
  | 'timeout'
  | 'timeouts'
  | 'intervals'
  | 'interval'
  | 'defer'
  | 'defers';

type TaskID = string;

type TaskCancelFunction = () => boolean;

type WhileConditionFn = (ref: CallbackRef, ...args: Array<*>) => boolean;

type CallbackRef = {|
  +task: TaskHandler,
  +id: TaskID,
  +cancel: TaskCancelFunction,
  +while: (condition: WhileConditionFn) => void,
  +promise: () => Promise<*>,
|};

type CallbackFn = (ref: CallbackRef, ...args: Array<*>) => mixed;
```

## API Reference

### Module Exports

#### `createTaskHandler` (Function) (default)

##### Overview

A factory for building and retrieving `TaskHandler` instances. If an `id` is
provided as the functions argument, it will return a `TaskHandler` with the
given id. If that `TaskHandler` was previously created, it returns it, otherwise
it creates a new instance and returns that.

```js
import createTaskHandler from 'task-handler';
const task = createTaskHandler();
```

##### Type Signature

```js
declare function createTaskHandler(id?: string): TaskHandler;
```

---

### `TaskHandler` (Class)

Further Documentation coming soon...

```js
// public interface for TaskHandler
class TaskHandler {
  // how many scheduled tasks of any type do we have?
  get size(): number

  // create a timeout, cancelling any timeouts
  // currently scheduled with the given id if any
  after(
    id: TaskID,
    delay: number,
    fn: CallbackFn,
    ...args: Array<*>
  ): CallbackRef

  defer(id: TaskID, fn: CallbackFn, ...args: Array<*>): CallbackRef

  every(
    id: TaskID,
    interval: number,
    fn: CallbackFn,
    ...args: Array<*>
  ): CallbackRef

  everyNow(
    id: TaskID,
    interval: number,
    fn: CallbackFn,
    ...args: Array<*>
  ): CallbackRef

  // cancel the given timeout (optionally provide a type if it should only
  // be cancelled if its of the given type).
  // returns true if a task was cancelled.
  cancel(id: TaskID, type?: TaskTypes): boolean

  // cancel all of a given type (or all if no argument provided)
  clear(...types: Array<TaskTypes>): void

  // are the given tasks currently scheduled? returns true if all tasks
  // given are present.
  has(...ids: Array<TaskID>): boolean
}
```
