# task-handler

A simple, dependency-free Task Manager to make handling of your Javascript
Timers easier to work with.

Combined with [pubchan](https://www.github.com/Dash-OS/pubchan), provides a
lightweight and powerful toolkit for managing asynchronous coordination of your
applications events.

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
[types](https://github.com/Dash-OS/pubchan/tree/master/src/index.js) in the
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

// every interval and immediately, execute
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
