(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

module.exports = argsArray;

function argsArray(fun) {
  return function () {
    var len = arguments.length;
    if (len) {
      var args = [];
      var i = -1;
      while (++i < len) {
        args[i] = arguments[i];
      }
      return fun.call(this, args);
    } else {
      return fun.call(this, []);
    }
  };
}
},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],3:[function(require,module,exports){
(function (global){
'use strict';
var Mutation = global.MutationObserver || global.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = global.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
    var channel = new global.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = global.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      global.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

module.exports = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],5:[function(require,module,exports){
(function (process,global){
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var immediate = _interopDefault(require('immediate'));
var uuidV4 = _interopDefault(require('uuid'));
var Md5 = _interopDefault(require('spark-md5'));
var vuvuzela = _interopDefault(require('vuvuzela'));
var getArguments = _interopDefault(require('argsarray'));
var inherits = _interopDefault(require('inherits'));
var events = require('events');

function mangle(key) {
  return '$' + key;
}
function unmangle(key) {
  return key.substring(1);
}
function Map$1() {
  this._store = {};
}
Map$1.prototype.get = function (key) {
  var mangled = mangle(key);
  return this._store[mangled];
};
Map$1.prototype.set = function (key, value) {
  var mangled = mangle(key);
  this._store[mangled] = value;
  return true;
};
Map$1.prototype.has = function (key) {
  var mangled = mangle(key);
  return mangled in this._store;
};
Map$1.prototype.delete = function (key) {
  var mangled = mangle(key);
  var res = mangled in this._store;
  delete this._store[mangled];
  return res;
};
Map$1.prototype.forEach = function (cb) {
  var keys = Object.keys(this._store);
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    var value = this._store[key];
    key = unmangle(key);
    cb(value, key);
  }
};
Object.defineProperty(Map$1.prototype, 'size', {
  get: function () {
    return Object.keys(this._store).length;
  }
});

function Set$1(array) {
  this._store = new Map$1();

  // init with an array
  if (array && Array.isArray(array)) {
    for (var i = 0, len = array.length; i < len; i++) {
      this.add(array[i]);
    }
  }
}
Set$1.prototype.add = function (key) {
  return this._store.set(key, true);
};
Set$1.prototype.has = function (key) {
  return this._store.has(key);
};
Set$1.prototype.forEach = function (cb) {
  this._store.forEach(function (value, key) {
    cb(key);
  });
};
Object.defineProperty(Set$1.prototype, 'size', {
  get: function () {
    return this._store.size;
  }
});

/* global Map,Set,Symbol */
// Based on https://kangax.github.io/compat-table/es6/ we can sniff out
// incomplete Map/Set implementations which would otherwise cause our tests to fail.
// Notably they fail in IE11 and iOS 8.4, which this prevents.
function supportsMapAndSet() {
  if (typeof Symbol === 'undefined' || typeof Map === 'undefined' || typeof Set === 'undefined') {
    return false;
  }
  var prop = Object.getOwnPropertyDescriptor(Map, Symbol.species);
  return prop && 'get' in prop && Map[Symbol.species] === Map;
}

// based on https://github.com/montagejs/collections

var ExportedSet;
var ExportedMap;

{
  if (supportsMapAndSet()) { // prefer built-in Map/Set
    ExportedSet = Set;
    ExportedMap = Map;
  } else { // fall back to our polyfill
    ExportedSet = Set$1;
    ExportedMap = Map$1;
  }
}

function isBinaryObject(object) {
  return (typeof ArrayBuffer !== 'undefined' && object instanceof ArrayBuffer) ||
    (typeof Blob !== 'undefined' && object instanceof Blob);
}

function cloneArrayBuffer(buff) {
  if (typeof buff.slice === 'function') {
    return buff.slice(0);
  }
  // IE10-11 slice() polyfill
  var target = new ArrayBuffer(buff.byteLength);
  var targetArray = new Uint8Array(target);
  var sourceArray = new Uint8Array(buff);
  targetArray.set(sourceArray);
  return target;
}

function cloneBinaryObject(object) {
  if (object instanceof ArrayBuffer) {
    return cloneArrayBuffer(object);
  }
  var size = object.size;
  var type = object.type;
  // Blob
  if (typeof object.slice === 'function') {
    return object.slice(0, size, type);
  }
  // PhantomJS slice() replacement
  return object.webkitSlice(0, size, type);
}

// most of this is borrowed from lodash.isPlainObject:
// https://github.com/fis-components/lodash.isplainobject/
// blob/29c358140a74f252aeb08c9eb28bef86f2217d4a/index.js

var funcToString = Function.prototype.toString;
var objectCtorString = funcToString.call(Object);

function isPlainObject(value) {
  var proto = Object.getPrototypeOf(value);
  /* istanbul ignore if */
  if (proto === null) { // not sure when this happens, but I guess it can
    return true;
  }
  var Ctor = proto.constructor;
  return (typeof Ctor == 'function' &&
    Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
}

function clone(object) {
  var newObject;
  var i;
  var len;

  if (!object || typeof object !== 'object') {
    return object;
  }

  if (Array.isArray(object)) {
    newObject = [];
    for (i = 0, len = object.length; i < len; i++) {
      newObject[i] = clone(object[i]);
    }
    return newObject;
  }

  // special case: to avoid inconsistencies between IndexedDB
  // and other backends, we automatically stringify Dates
  if (object instanceof Date) {
    return object.toISOString();
  }

  if (isBinaryObject(object)) {
    return cloneBinaryObject(object);
  }

  if (!isPlainObject(object)) {
    return object; // don't clone objects like Workers
  }

  newObject = {};
  for (i in object) {
    /* istanbul ignore else */
    if (Object.prototype.hasOwnProperty.call(object, i)) {
      var value = clone(object[i]);
      if (typeof value !== 'undefined') {
        newObject[i] = value;
      }
    }
  }
  return newObject;
}

function once(fun) {
  var called = false;
  return getArguments(function (args) {
    /* istanbul ignore if */
    if (called) {
      // this is a smoke test and should never actually happen
      throw new Error('once called more than once');
    } else {
      called = true;
      fun.apply(this, args);
    }
  });
}

function toPromise(func) {
  //create the function we will be returning
  return getArguments(function (args) {
    // Clone arguments
    args = clone(args);
    var self = this;
    // if the last argument is a function, assume its a callback
    var usedCB = (typeof args[args.length - 1] === 'function') ? args.pop() : false;
    var promise = new Promise(function (fulfill, reject) {
      var resp;
      try {
        var callback = once(function (err, mesg) {
          if (err) {
            reject(err);
          } else {
            fulfill(mesg);
          }
        });
        // create a callback for this invocation
        // apply the function in the orig context
        args.push(callback);
        resp = func.apply(self, args);
        if (resp && typeof resp.then === 'function') {
          fulfill(resp);
        }
      } catch (e) {
        reject(e);
      }
    });
    // if there is a callback, call it back
    if (usedCB) {
      promise.then(function (result) {
        usedCB(null, result);
      }, usedCB);
    }
    return promise;
  });
}

function logApiCall(self, name, args) {
  /* istanbul ignore if */
  if (self.constructor.listeners('debug').length) {
    var logArgs = ['api', self.name, name];
    for (var i = 0; i < args.length - 1; i++) {
      logArgs.push(args[i]);
    }
    self.constructor.emit('debug', logArgs);

    // override the callback itself to log the response
    var origCallback = args[args.length - 1];
    args[args.length - 1] = function (err, res) {
      var responseArgs = ['api', self.name, name];
      responseArgs = responseArgs.concat(
        err ? ['error', err] : ['success', res]
      );
      self.constructor.emit('debug', responseArgs);
      origCallback(err, res);
    };
  }
}

function adapterFun(name, callback) {
  return toPromise(getArguments(function (args) {
    if (this._closed) {
      return Promise.reject(new Error('database is closed'));
    }
    if (this._destroyed) {
      return Promise.reject(new Error('database is destroyed'));
    }
    var self = this;
    logApiCall(self, name, args);
    if (!this.taskqueue.isReady) {
      return new Promise(function (fulfill, reject) {
        self.taskqueue.addTask(function (failed) {
          if (failed) {
            reject(failed);
          } else {
            fulfill(self[name].apply(self, args));
          }
        });
      });
    }
    return callback.apply(this, args);
  }));
}

// like underscore/lodash _.pick()
function pick(obj, arr) {
  var res = {};
  for (var i = 0, len = arr.length; i < len; i++) {
    var prop = arr[i];
    if (prop in obj) {
      res[prop] = obj[prop];
    }
  }
  return res;
}

// Most browsers throttle concurrent requests at 6, so it's silly
// to shim _bulk_get by trying to launch potentially hundreds of requests
// and then letting the majority time out. We can handle this ourselves.
var MAX_NUM_CONCURRENT_REQUESTS = 6;

function identityFunction(x) {
  return x;
}

function formatResultForOpenRevsGet(result) {
  return [{
    ok: result
  }];
}

// shim for P/CouchDB adapters that don't directly implement _bulk_get
function bulkGet(db, opts, callback) {
  var requests = opts.docs;

  // consolidate into one request per doc if possible
  var requestsById = new ExportedMap();
  requests.forEach(function (request) {
    if (requestsById.has(request.id)) {
      requestsById.get(request.id).push(request);
    } else {
      requestsById.set(request.id, [request]);
    }
  });

  var numDocs = requestsById.size;
  var numDone = 0;
  var perDocResults = new Array(numDocs);

  function collapseResultsAndFinish() {
    var results = [];
    perDocResults.forEach(function (res) {
      res.docs.forEach(function (info) {
        results.push({
          id: res.id,
          docs: [info]
        });
      });
    });
    callback(null, {results: results});
  }

  function checkDone() {
    if (++numDone === numDocs) {
      collapseResultsAndFinish();
    }
  }

  function gotResult(docIndex, id, docs) {
    perDocResults[docIndex] = {id: id, docs: docs};
    checkDone();
  }

  var allRequests = [];
  requestsById.forEach(function (value, key) {
    allRequests.push(key);
  });

  var i = 0;

  function nextBatch() {

    if (i >= allRequests.length) {
      return;
    }

    var upTo = Math.min(i + MAX_NUM_CONCURRENT_REQUESTS, allRequests.length);
    var batch = allRequests.slice(i, upTo);
    processBatch(batch, i);
    i += batch.length;
  }

  function processBatch(batch, offset) {
    batch.forEach(function (docId, j) {
      var docIdx = offset + j;
      var docRequests = requestsById.get(docId);

      // just use the first request as the "template"
      // TODO: The _bulk_get API allows for more subtle use cases than this,
      // but for now it is unlikely that there will be a mix of different
      // "atts_since" or "attachments" in the same request, since it's just
      // replicate.js that is using this for the moment.
      // Also, atts_since is aspirational, since we don't support it yet.
      var docOpts = pick(docRequests[0], ['atts_since', 'attachments']);
      docOpts.open_revs = docRequests.map(function (request) {
        // rev is optional, open_revs disallowed
        return request.rev;
      });

      // remove falsey / undefined revisions
      docOpts.open_revs = docOpts.open_revs.filter(identityFunction);

      var formatResult = identityFunction;

      if (docOpts.open_revs.length === 0) {
        delete docOpts.open_revs;

        // when fetching only the "winning" leaf,
        // transform the result so it looks like an open_revs
        // request
        formatResult = formatResultForOpenRevsGet;
      }

      // globally-supplied options
      ['revs', 'attachments', 'binary', 'ajax', 'latest'].forEach(function (param) {
        if (param in opts) {
          docOpts[param] = opts[param];
        }
      });
      db.get(docId, docOpts, function (err, res) {
        var result;
        /* istanbul ignore if */
        if (err) {
          result = [{error: err}];
        } else {
          result = formatResult(res);
        }
        gotResult(docIdx, docId, result);
        nextBatch();
      });
    });
  }

  nextBatch();

}

var hasLocal;

try {
  localStorage.setItem('_pouch_check_localstorage', 1);
  hasLocal = !!localStorage.getItem('_pouch_check_localstorage');
} catch (e) {
  hasLocal = false;
}

function hasLocalStorage() {
  return hasLocal;
}

// Custom nextTick() shim for browsers. In node, this will just be process.nextTick(). We

inherits(Changes, events.EventEmitter);

/* istanbul ignore next */
function attachBrowserEvents(self) {
  if (hasLocalStorage()) {
    addEventListener("storage", function (e) {
      self.emit(e.key);
    });
  }
}

function Changes() {
  events.EventEmitter.call(this);
  this._listeners = {};

  attachBrowserEvents(this);
}
Changes.prototype.addListener = function (dbName, id, db, opts) {
  /* istanbul ignore if */
  if (this._listeners[id]) {
    return;
  }
  var self = this;
  var inprogress = false;
  function eventFunction() {
    /* istanbul ignore if */
    if (!self._listeners[id]) {
      return;
    }
    if (inprogress) {
      inprogress = 'waiting';
      return;
    }
    inprogress = true;
    var changesOpts = pick(opts, [
      'style', 'include_docs', 'attachments', 'conflicts', 'filter',
      'doc_ids', 'view', 'since', 'query_params', 'binary', 'return_docs'
    ]);

    /* istanbul ignore next */
    function onError() {
      inprogress = false;
    }

    db.changes(changesOpts).on('change', function (c) {
      if (c.seq > opts.since && !opts.cancelled) {
        opts.since = c.seq;
        opts.onChange(c);
      }
    }).on('complete', function () {
      if (inprogress === 'waiting') {
        immediate(eventFunction);
      }
      inprogress = false;
    }).on('error', onError);
  }
  this._listeners[id] = eventFunction;
  this.on(dbName, eventFunction);
};

Changes.prototype.removeListener = function (dbName, id) {
  /* istanbul ignore if */
  if (!(id in this._listeners)) {
    return;
  }
  events.EventEmitter.prototype.removeListener.call(this, dbName,
    this._listeners[id]);
  delete this._listeners[id];
};


/* istanbul ignore next */
Changes.prototype.notifyLocalWindows = function (dbName) {
  //do a useless change on a storage thing
  //in order to get other windows's listeners to activate
  if (hasLocalStorage()) {
    localStorage[dbName] = (localStorage[dbName] === "a") ? "b" : "a";
  }
};

Changes.prototype.notify = function (dbName) {
  this.emit(dbName);
  this.notifyLocalWindows(dbName);
};

function guardedConsole(method) {
  /* istanbul ignore else */
  if (typeof console !== 'undefined' && typeof console[method] === 'function') {
    var args = Array.prototype.slice.call(arguments, 1);
    console[method].apply(console, args);
  }
}

function randomNumber(min, max) {
  var maxTimeout = 600000; // Hard-coded default of 10 minutes
  min = parseInt(min, 10) || 0;
  max = parseInt(max, 10);
  if (max !== max || max <= min) {
    max = (min || 1) << 1; //doubling
  } else {
    max = max + 1;
  }
  // In order to not exceed maxTimeout, pick a random value between half of maxTimeout and maxTimeout
  if (max > maxTimeout) {
    min = maxTimeout >> 1; // divide by two
    max = maxTimeout;
  }
  var ratio = Math.random();
  var range = max - min;

  return ~~(range * ratio + min); // ~~ coerces to an int, but fast.
}

function defaultBackOff(min) {
  var max = 0;
  if (!min) {
    max = 2000;
  }
  return randomNumber(min, max);
}

// designed to give info to browser users, who are disturbed
// when they see http errors in the console
function explainError(status, str) {
  guardedConsole('info', 'The above ' + status + ' is totally normal. ' + str);
}

var assign;
{
  if (typeof Object.assign === 'function') {
    assign = Object.assign;
  } else {
    // lite Object.assign polyfill based on
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
    assign = function (target) {
      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }
}

var $inject_Object_assign = assign;

inherits(PouchError, Error);

function PouchError(status, error, reason) {
  Error.call(this, reason);
  this.status = status;
  this.name = error;
  this.message = reason;
  this.error = true;
}

PouchError.prototype.toString = function () {
  return JSON.stringify({
    status: this.status,
    name: this.name,
    message: this.message,
    reason: this.reason
  });
};

var UNAUTHORIZED = new PouchError(401, 'unauthorized', "Name or password is incorrect.");
var MISSING_BULK_DOCS = new PouchError(400, 'bad_request', "Missing JSON list of 'docs'");
var MISSING_DOC = new PouchError(404, 'not_found', 'missing');
var REV_CONFLICT = new PouchError(409, 'conflict', 'Document update conflict');
var INVALID_ID = new PouchError(400, 'bad_request', '_id field must contain a string');
var MISSING_ID = new PouchError(412, 'missing_id', '_id is required for puts');
var RESERVED_ID = new PouchError(400, 'bad_request', 'Only reserved document ids may start with underscore.');
var NOT_OPEN = new PouchError(412, 'precondition_failed', 'Database not open');
var UNKNOWN_ERROR = new PouchError(500, 'unknown_error', 'Database encountered an unknown error');
var BAD_ARG = new PouchError(500, 'badarg', 'Some query argument is invalid');
var INVALID_REQUEST = new PouchError(400, 'invalid_request', 'Request was invalid');
var QUERY_PARSE_ERROR = new PouchError(400, 'query_parse_error', 'Some query parameter is invalid');
var DOC_VALIDATION = new PouchError(500, 'doc_validation', 'Bad special document member');
var BAD_REQUEST = new PouchError(400, 'bad_request', 'Something wrong with the request');
var NOT_AN_OBJECT = new PouchError(400, 'bad_request', 'Document must be a JSON object');
var DB_MISSING = new PouchError(404, 'not_found', 'Database not found');
var IDB_ERROR = new PouchError(500, 'indexed_db_went_bad', 'unknown');
var WSQ_ERROR = new PouchError(500, 'web_sql_went_bad', 'unknown');
var LDB_ERROR = new PouchError(500, 'levelDB_went_went_bad', 'unknown');
var FORBIDDEN = new PouchError(403, 'forbidden', 'Forbidden by design doc validate_doc_update function');
var INVALID_REV = new PouchError(400, 'bad_request', 'Invalid rev format');
var FILE_EXISTS = new PouchError(412, 'file_exists', 'The database could not be created, the file already exists.');
var MISSING_STUB = new PouchError(412, 'missing_stub', 'A pre-existing attachment stub wasn\'t found');
var INVALID_URL = new PouchError(413, 'invalid_url', 'Provided URL is invalid');

function createError(error, reason) {
  function CustomPouchError(reason) {
    // inherit error properties from our parent error manually
    // so as to allow proper JSON parsing.
    /* jshint ignore:start */
    for (var p in error) {
      if (typeof error[p] !== 'function') {
        this[p] = error[p];
      }
    }
    /* jshint ignore:end */
    if (reason !== undefined) {
      this.reason = reason;
    }
  }
  CustomPouchError.prototype = PouchError.prototype;
  return new CustomPouchError(reason);
}

function generateErrorFromResponse(err) {

  if (typeof err !== 'object') {
    var data = err;
    err = UNKNOWN_ERROR;
    err.data = data;
  }

  if ('error' in err && err.error === 'conflict') {
    err.name = 'conflict';
    err.status = 409;
  }

  if (!('name' in err)) {
    err.name = err.error || 'unknown';
  }

  if (!('status' in err)) {
    err.status = 500;
  }

  if (!('message' in err)) {
    err.message = err.message || err.reason;
  }

  return err;
}

function tryFilter(filter, doc, req) {
  try {
    return !filter(doc, req);
  } catch (err) {
    var msg = 'Filter function threw: ' + err.toString();
    return createError(BAD_REQUEST, msg);
  }
}

function filterChange(opts) {
  var req = {};
  var hasFilter = opts.filter && typeof opts.filter === 'function';
  req.query = opts.query_params;

  return function filter(change) {
    if (!change.doc) {
      // CSG sends events on the changes feed that don't have documents,
      // this hack makes a whole lot of existing code robust.
      change.doc = {};
    }

    var filterReturn = hasFilter && tryFilter(opts.filter, change.doc, req);

    if (typeof filterReturn === 'object') {
      return filterReturn;
    }

    if (filterReturn) {
      return false;
    }

    if (!opts.include_docs) {
      delete change.doc;
    } else if (!opts.attachments) {
      for (var att in change.doc._attachments) {
        /* istanbul ignore else */
        if (change.doc._attachments.hasOwnProperty(att)) {
          change.doc._attachments[att].stub = true;
        }
      }
    }
    return true;
  };
}

function flatten(arrs) {
  var res = [];
  for (var i = 0, len = arrs.length; i < len; i++) {
    res = res.concat(arrs[i]);
  }
  return res;
}

// shim for Function.prototype.name,

// Determine id an ID is valid
//   - invalid IDs begin with an underescore that does not begin '_design' or
//     '_local'
//   - any other string value is a valid id
// Returns the specific error object for each case
function invalidIdError(id) {
  var err;
  if (!id) {
    err = createError(MISSING_ID);
  } else if (typeof id !== 'string') {
    err = createError(INVALID_ID);
  } else if (/^_/.test(id) && !(/^_(design|local)/).test(id)) {
    err = createError(RESERVED_ID);
  }
  if (err) {
    throw err;
  }
}

// Checks if a PouchDB object is "remote" or not. This is

function isRemote(db) {
  if (typeof db._remote === 'boolean') {
    return db._remote;
  }
  /* istanbul ignore next */
  if (typeof db.type === 'function') {
    guardedConsole('warn',
      'db.type() is deprecated and will be removed in ' +
      'a future version of PouchDB');
    return db.type() === 'http';
  }
  /* istanbul ignore next */
  return false;
}

function listenerCount(ee, type) {
  return 'listenerCount' in ee ? ee.listenerCount(type) :
                                 events.EventEmitter.listenerCount(ee, type);
}

function parseDesignDocFunctionName(s) {
  if (!s) {
    return null;
  }
  var parts = s.split('/');
  if (parts.length === 2) {
    return parts;
  }
  if (parts.length === 1) {
    return [s, s];
  }
  return null;
}

function normalizeDesignDocFunctionName(s) {
  var normalized = parseDesignDocFunctionName(s);
  return normalized ? normalized.join('/') : null;
}

// originally parseUri 1.2.2, now patched by us
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
var keys = ["source", "protocol", "authority", "userInfo", "user", "password",
    "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
var qName ="queryKey";
var qParser = /(?:^|&)([^&=]*)=?([^&]*)/g;

// use the "loose" parser
/* eslint maxlen: 0, no-useless-escape: 0 */
var parser = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

function parseUri(str) {
  var m = parser.exec(str);
  var uri = {};
  var i = 14;

  while (i--) {
    var key = keys[i];
    var value = m[i] || "";
    var encoded = ['user', 'password'].indexOf(key) !== -1;
    uri[key] = encoded ? decodeURIComponent(value) : value;
  }

  uri[qName] = {};
  uri[keys[12]].replace(qParser, function ($0, $1, $2) {
    if ($1) {
      uri[qName][$1] = $2;
    }
  });

  return uri;
}

// Based on https://github.com/alexdavid/scope-eval v0.0.3
// (source: https://unpkg.com/scope-eval@0.0.3/scope_eval.js)
// This is basically just a wrapper around new Function()

function scopeEval(source, scope) {
  var keys = [];
  var values = [];
  for (var key in scope) {
    if (scope.hasOwnProperty(key)) {
      keys.push(key);
      values.push(scope[key]);
    }
  }
  keys.push(source);
  return Function.apply(null, keys).apply(null, values);
}

// this is essentially the "update sugar" function from daleharvey/pouchdb#1388
// the diffFun tells us what delta to apply to the doc.  it either returns
// the doc, or false if it doesn't need to do an update after all
function upsert(db, docId, diffFun) {
  return new Promise(function (fulfill, reject) {
    db.get(docId, function (err, doc) {
      if (err) {
        /* istanbul ignore next */
        if (err.status !== 404) {
          return reject(err);
        }
        doc = {};
      }

      // the user might change the _rev, so save it for posterity
      var docRev = doc._rev;
      var newDoc = diffFun(doc);

      if (!newDoc) {
        // if the diffFun returns falsy, we short-circuit as
        // an optimization
        return fulfill({updated: false, rev: docRev});
      }

      // users aren't allowed to modify these values,
      // so reset them here
      newDoc._id = docId;
      newDoc._rev = docRev;
      fulfill(tryAndPut(db, newDoc, diffFun));
    });
  });
}

function tryAndPut(db, doc, diffFun) {
  return db.put(doc).then(function (res) {
    return {
      updated: true,
      rev: res.rev
    };
  }, function (err) {
    /* istanbul ignore next */
    if (err.status !== 409) {
      throw err;
    }
    return upsert(db, doc._id, diffFun);
  });
}

var thisAtob = function (str) {
  return atob(str);
};

var thisBtoa = function (str) {
  return btoa(str);
};

// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor (e.g.
// old QtWebKit versions, Android < 4.4).
function createBlob(parts, properties) {
  /* global BlobBuilder,MSBlobBuilder,MozBlobBuilder,WebKitBlobBuilder */
  parts = parts || [];
  properties = properties || {};
  try {
    return new Blob(parts, properties);
  } catch (e) {
    if (e.name !== "TypeError") {
      throw e;
    }
    var Builder = typeof BlobBuilder !== 'undefined' ? BlobBuilder :
                  typeof MSBlobBuilder !== 'undefined' ? MSBlobBuilder :
                  typeof MozBlobBuilder !== 'undefined' ? MozBlobBuilder :
                  WebKitBlobBuilder;
    var builder = new Builder();
    for (var i = 0; i < parts.length; i += 1) {
      builder.append(parts[i]);
    }
    return builder.getBlob(properties.type);
  }
}

// From http://stackoverflow.com/questions/14967647/ (continues on next line)
// encode-decode-image-with-base64-breaks-image (2013-04-21)
function binaryStringToArrayBuffer(bin) {
  var length = bin.length;
  var buf = new ArrayBuffer(length);
  var arr = new Uint8Array(buf);
  for (var i = 0; i < length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return buf;
}

function binStringToBluffer(binString, type) {
  return createBlob([binaryStringToArrayBuffer(binString)], {type: type});
}

function b64ToBluffer(b64, type) {
  return binStringToBluffer(thisAtob(b64), type);
}

//Can't find original post, but this is close
//http://stackoverflow.com/questions/6965107/ (continues on next line)
//converting-between-strings-and-arraybuffers
function arrayBufferToBinaryString(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var length = bytes.byteLength;
  for (var i = 0; i < length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

// shim for browsers that don't support it
function readAsBinaryString(blob, callback) {
  var reader = new FileReader();
  var hasBinaryString = typeof reader.readAsBinaryString === 'function';
  reader.onloadend = function (e) {
    var result = e.target.result || '';
    if (hasBinaryString) {
      return callback(result);
    }
    callback(arrayBufferToBinaryString(result));
  };
  if (hasBinaryString) {
    reader.readAsBinaryString(blob);
  } else {
    reader.readAsArrayBuffer(blob);
  }
}

function blobToBinaryString(blobOrBuffer, callback) {
  readAsBinaryString(blobOrBuffer, function (bin) {
    callback(bin);
  });
}

function blobToBase64(blobOrBuffer, callback) {
  blobToBinaryString(blobOrBuffer, function (base64) {
    callback(thisBtoa(base64));
  });
}

// simplified API. universal browser support is assumed
function readAsArrayBuffer(blob, callback) {
  var reader = new FileReader();
  reader.onloadend = function (e) {
    var result = e.target.result || new ArrayBuffer(0);
    callback(result);
  };
  reader.readAsArrayBuffer(blob);
}

// this is not used in the browser

var setImmediateShim = global.setImmediate || global.setTimeout;
var MD5_CHUNK_SIZE = 32768;

function rawToBase64(raw) {
  return thisBtoa(raw);
}

function sliceBlob(blob, start, end) {
  if (blob.webkitSlice) {
    return blob.webkitSlice(start, end);
  }
  return blob.slice(start, end);
}

function appendBlob(buffer, blob, start, end, callback) {
  if (start > 0 || end < blob.size) {
    // only slice blob if we really need to
    blob = sliceBlob(blob, start, end);
  }
  readAsArrayBuffer(blob, function (arrayBuffer) {
    buffer.append(arrayBuffer);
    callback();
  });
}

function appendString(buffer, string, start, end, callback) {
  if (start > 0 || end < string.length) {
    // only create a substring if we really need to
    string = string.substring(start, end);
  }
  buffer.appendBinary(string);
  callback();
}

function binaryMd5(data, callback) {
  var inputIsString = typeof data === 'string';
  var len = inputIsString ? data.length : data.size;
  var chunkSize = Math.min(MD5_CHUNK_SIZE, len);
  var chunks = Math.ceil(len / chunkSize);
  var currentChunk = 0;
  var buffer = inputIsString ? new Md5() : new Md5.ArrayBuffer();

  var append = inputIsString ? appendString : appendBlob;

  function next() {
    setImmediateShim(loadNextChunk);
  }

  function done() {
    var raw = buffer.end(true);
    var base64 = rawToBase64(raw);
    callback(base64);
    buffer.destroy();
  }

  function loadNextChunk() {
    var start = currentChunk * chunkSize;
    var end = start + chunkSize;
    currentChunk++;
    if (currentChunk < chunks) {
      append(buffer, data, start, end, next);
    } else {
      append(buffer, data, start, end, done);
    }
  }
  loadNextChunk();
}

function stringMd5(string) {
  return Md5.hash(string);
}

function rev(doc, deterministic_revs) {
  var clonedDoc = clone(doc);
  if (!deterministic_revs) {
    return uuidV4.v4().replace(/-/g, '').toLowerCase();
  }

  delete clonedDoc._rev_tree;
  return stringMd5(JSON.stringify(clonedDoc));
}

var uuid = uuidV4.v4;

// We fetch all leafs of the revision tree, and sort them based on tree length
// and whether they were deleted, undeleted documents with the longest revision
// tree (most edits) win
// The final sort algorithm is slightly documented in a sidebar here:
// http://guide.couchdb.org/draft/conflicts.html
function winningRev(metadata) {
  var winningId;
  var winningPos;
  var winningDeleted;
  var toVisit = metadata.rev_tree.slice();
  var node;
  while ((node = toVisit.pop())) {
    var tree = node.ids;
    var branches = tree[2];
    var pos = node.pos;
    if (branches.length) { // non-leaf
      for (var i = 0, len = branches.length; i < len; i++) {
        toVisit.push({pos: pos + 1, ids: branches[i]});
      }
      continue;
    }
    var deleted = !!tree[1].deleted;
    var id = tree[0];
    // sort by deleted, then pos, then id
    if (!winningId || (winningDeleted !== deleted ? winningDeleted :
        winningPos !== pos ? winningPos < pos : winningId < id)) {
      winningId = id;
      winningPos = pos;
      winningDeleted = deleted;
    }
  }

  return winningPos + '-' + winningId;
}

// Pretty much all below can be combined into a higher order function to
// traverse revisions
// The return value from the callback will be passed as context to all
// children of that node
function traverseRevTree(revs, callback) {
  var toVisit = revs.slice();

  var node;
  while ((node = toVisit.pop())) {
    var pos = node.pos;
    var tree = node.ids;
    var branches = tree[2];
    var newCtx =
      callback(branches.length === 0, pos, tree[0], node.ctx, tree[1]);
    for (var i = 0, len = branches.length; i < len; i++) {
      toVisit.push({pos: pos + 1, ids: branches[i], ctx: newCtx});
    }
  }
}

function sortByPos(a, b) {
  return a.pos - b.pos;
}

function collectLeaves(revs) {
  var leaves = [];
  traverseRevTree(revs, function (isLeaf, pos, id, acc, opts) {
    if (isLeaf) {
      leaves.push({rev: pos + "-" + id, pos: pos, opts: opts});
    }
  });
  leaves.sort(sortByPos).reverse();
  for (var i = 0, len = leaves.length; i < len; i++) {
    delete leaves[i].pos;
  }
  return leaves;
}

// returns revs of all conflicts that is leaves such that
// 1. are not deleted and
// 2. are different than winning revision
function collectConflicts(metadata) {
  var win = winningRev(metadata);
  var leaves = collectLeaves(metadata.rev_tree);
  var conflicts = [];
  for (var i = 0, len = leaves.length; i < len; i++) {
    var leaf = leaves[i];
    if (leaf.rev !== win && !leaf.opts.deleted) {
      conflicts.push(leaf.rev);
    }
  }
  return conflicts;
}

// compact a tree by marking its non-leafs as missing,
// and return a list of revs to delete
function compactTree(metadata) {
  var revs = [];
  traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
                                               revHash, ctx, opts) {
    if (opts.status === 'available' && !isLeaf) {
      revs.push(pos + '-' + revHash);
      opts.status = 'missing';
    }
  });
  return revs;
}

// build up a list of all the paths to the leafs in this revision tree
function rootToLeaf(revs) {
  var paths = [];
  var toVisit = revs.slice();
  var node;
  while ((node = toVisit.pop())) {
    var pos = node.pos;
    var tree = node.ids;
    var id = tree[0];
    var opts = tree[1];
    var branches = tree[2];
    var isLeaf = branches.length === 0;

    var history = node.history ? node.history.slice() : [];
    history.push({id: id, opts: opts});
    if (isLeaf) {
      paths.push({pos: (pos + 1 - history.length), ids: history});
    }
    for (var i = 0, len = branches.length; i < len; i++) {
      toVisit.push({pos: pos + 1, ids: branches[i], history: history});
    }
  }
  return paths.reverse();
}

// for a better overview of what this is doing, read:

function sortByPos$1(a, b) {
  return a.pos - b.pos;
}

// classic binary search
function binarySearch(arr, item, comparator) {
  var low = 0;
  var high = arr.length;
  var mid;
  while (low < high) {
    mid = (low + high) >>> 1;
    if (comparator(arr[mid], item) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

// assuming the arr is sorted, insert the item in the proper place
function insertSorted(arr, item, comparator) {
  var idx = binarySearch(arr, item, comparator);
  arr.splice(idx, 0, item);
}

// Turn a path as a flat array into a tree with a single branch.
// If any should be stemmed from the beginning of the array, that's passed
// in as the second argument
function pathToTree(path, numStemmed) {
  var root;
  var leaf;
  for (var i = numStemmed, len = path.length; i < len; i++) {
    var node = path[i];
    var currentLeaf = [node.id, node.opts, []];
    if (leaf) {
      leaf[2].push(currentLeaf);
      leaf = currentLeaf;
    } else {
      root = leaf = currentLeaf;
    }
  }
  return root;
}

// compare the IDs of two trees
function compareTree(a, b) {
  return a[0] < b[0] ? -1 : 1;
}

// Merge two trees together
// The roots of tree1 and tree2 must be the same revision
function mergeTree(in_tree1, in_tree2) {
  var queue = [{tree1: in_tree1, tree2: in_tree2}];
  var conflicts = false;
  while (queue.length > 0) {
    var item = queue.pop();
    var tree1 = item.tree1;
    var tree2 = item.tree2;

    if (tree1[1].status || tree2[1].status) {
      tree1[1].status =
        (tree1[1].status ===  'available' ||
        tree2[1].status === 'available') ? 'available' : 'missing';
    }

    for (var i = 0; i < tree2[2].length; i++) {
      if (!tree1[2][0]) {
        conflicts = 'new_leaf';
        tree1[2][0] = tree2[2][i];
        continue;
      }

      var merged = false;
      for (var j = 0; j < tree1[2].length; j++) {
        if (tree1[2][j][0] === tree2[2][i][0]) {
          queue.push({tree1: tree1[2][j], tree2: tree2[2][i]});
          merged = true;
        }
      }
      if (!merged) {
        conflicts = 'new_branch';
        insertSorted(tree1[2], tree2[2][i], compareTree);
      }
    }
  }
  return {conflicts: conflicts, tree: in_tree1};
}

function doMerge(tree, path, dontExpand) {
  var restree = [];
  var conflicts = false;
  var merged = false;
  var res;

  if (!tree.length) {
    return {tree: [path], conflicts: 'new_leaf'};
  }

  for (var i = 0, len = tree.length; i < len; i++) {
    var branch = tree[i];
    if (branch.pos === path.pos && branch.ids[0] === path.ids[0]) {
      // Paths start at the same position and have the same root, so they need
      // merged
      res = mergeTree(branch.ids, path.ids);
      restree.push({pos: branch.pos, ids: res.tree});
      conflicts = conflicts || res.conflicts;
      merged = true;
    } else if (dontExpand !== true) {
      // The paths start at a different position, take the earliest path and
      // traverse up until it as at the same point from root as the path we
      // want to merge.  If the keys match we return the longer path with the
      // other merged After stemming we dont want to expand the trees

      var t1 = branch.pos < path.pos ? branch : path;
      var t2 = branch.pos < path.pos ? path : branch;
      var diff = t2.pos - t1.pos;

      var candidateParents = [];

      var trees = [];
      trees.push({ids: t1.ids, diff: diff, parent: null, parentIdx: null});
      while (trees.length > 0) {
        var item = trees.pop();
        if (item.diff === 0) {
          if (item.ids[0] === t2.ids[0]) {
            candidateParents.push(item);
          }
          continue;
        }
        var elements = item.ids[2];
        for (var j = 0, elementsLen = elements.length; j < elementsLen; j++) {
          trees.push({
            ids: elements[j],
            diff: item.diff - 1,
            parent: item.ids,
            parentIdx: j
          });
        }
      }

      var el = candidateParents[0];

      if (!el) {
        restree.push(branch);
      } else {
        res = mergeTree(el.ids, t2.ids);
        el.parent[2][el.parentIdx] = res.tree;
        restree.push({pos: t1.pos, ids: t1.ids});
        conflicts = conflicts || res.conflicts;
        merged = true;
      }
    } else {
      restree.push(branch);
    }
  }

  // We didnt find
  if (!merged) {
    restree.push(path);
  }

  restree.sort(sortByPos$1);

  return {
    tree: restree,
    conflicts: conflicts || 'internal_node'
  };
}

// To ensure we dont grow the revision tree infinitely, we stem old revisions
function stem(tree, depth) {
  // First we break out the tree into a complete list of root to leaf paths
  var paths = rootToLeaf(tree);
  var stemmedRevs;

  var result;
  for (var i = 0, len = paths.length; i < len; i++) {
    // Then for each path, we cut off the start of the path based on the
    // `depth` to stem to, and generate a new set of flat trees
    var path = paths[i];
    var stemmed = path.ids;
    var node;
    if (stemmed.length > depth) {
      // only do the stemming work if we actually need to stem
      if (!stemmedRevs) {
        stemmedRevs = {}; // avoid allocating this object unnecessarily
      }
      var numStemmed = stemmed.length - depth;
      node = {
        pos: path.pos + numStemmed,
        ids: pathToTree(stemmed, numStemmed)
      };

      for (var s = 0; s < numStemmed; s++) {
        var rev = (path.pos + s) + '-' + stemmed[s].id;
        stemmedRevs[rev] = true;
      }
    } else { // no need to actually stem
      node = {
        pos: path.pos,
        ids: pathToTree(stemmed, 0)
      };
    }

    // Then we remerge all those flat trees together, ensuring that we dont
    // connect trees that would go beyond the depth limit
    if (result) {
      result = doMerge(result, node, true).tree;
    } else {
      result = [node];
    }
  }

  // this is memory-heavy per Chrome profiler, avoid unless we actually stemmed
  if (stemmedRevs) {
    traverseRevTree(result, function (isLeaf, pos, revHash) {
      // some revisions may have been removed in a branch but not in another
      delete stemmedRevs[pos + '-' + revHash];
    });
  }

  return {
    tree: result,
    revs: stemmedRevs ? Object.keys(stemmedRevs) : []
  };
}

function merge(tree, path, depth) {
  var newTree = doMerge(tree, path);
  var stemmed = stem(newTree.tree, depth);
  return {
    tree: stemmed.tree,
    stemmedRevs: stemmed.revs,
    conflicts: newTree.conflicts
  };
}

// return true if a rev exists in the rev tree, false otherwise
function revExists(revs, rev) {
  var toVisit = revs.slice();
  var splitRev = rev.split('-');
  var targetPos = parseInt(splitRev[0], 10);
  var targetId = splitRev[1];

  var node;
  while ((node = toVisit.pop())) {
    if (node.pos === targetPos && node.ids[0] === targetId) {
      return true;
    }
    var branches = node.ids[2];
    for (var i = 0, len = branches.length; i < len; i++) {
      toVisit.push({pos: node.pos + 1, ids: branches[i]});
    }
  }
  return false;
}

function getTrees(node) {
  return node.ids;
}

// check if a specific revision of a doc has been deleted
//  - metadata: the metadata object from the doc store
//  - rev: (optional) the revision to check. defaults to winning revision
function isDeleted(metadata, rev) {
  if (!rev) {
    rev = winningRev(metadata);
  }
  var id = rev.substring(rev.indexOf('-') + 1);
  var toVisit = metadata.rev_tree.map(getTrees);

  var tree;
  while ((tree = toVisit.pop())) {
    if (tree[0] === id) {
      return !!tree[1].deleted;
    }
    toVisit = toVisit.concat(tree[2]);
  }
}

function isLocalId(id) {
  return (/^_local/).test(id);
}

// returns the current leaf node for a given revision
function latest(rev, metadata) {
  var toVisit = metadata.rev_tree.slice();
  var node;
  while ((node = toVisit.pop())) {
    var pos = node.pos;
    var tree = node.ids;
    var id = tree[0];
    var opts = tree[1];
    var branches = tree[2];
    var isLeaf = branches.length === 0;

    var history = node.history ? node.history.slice() : [];
    history.push({id: id, pos: pos, opts: opts});

    if (isLeaf) {
      for (var i = 0, len = history.length; i < len; i++) {
        var historyNode = history[i];
        var historyRev = historyNode.pos + '-' + historyNode.id;

        if (historyRev === rev) {
          // return the rev of this leaf
          return pos + '-' + id;
        }
      }
    }

    for (var j = 0, l = branches.length; j < l; j++) {
      toVisit.push({pos: pos + 1, ids: branches[j], history: history});
    }
  }

  /* istanbul ignore next */
  throw new Error('Unable to resolve latest revision for id ' + metadata.id + ', rev ' + rev);
}

inherits(Changes$1, events.EventEmitter);

function tryCatchInChangeListener(self, change, pending, lastSeq) {
  // isolate try/catches to avoid V8 deoptimizations
  try {
    self.emit('change', change, pending, lastSeq);
  } catch (e) {
    guardedConsole('error', 'Error in .on("change", function):', e);
  }
}

function Changes$1(db, opts, callback) {
  events.EventEmitter.call(this);
  var self = this;
  this.db = db;
  opts = opts ? clone(opts) : {};
  var complete = opts.complete = once(function (err, resp) {
    if (err) {
      if (listenerCount(self, 'error') > 0) {
        self.emit('error', err);
      }
    } else {
      self.emit('complete', resp);
    }
    self.removeAllListeners();
    db.removeListener('destroyed', onDestroy);
  });
  if (callback) {
    self.on('complete', function (resp) {
      callback(null, resp);
    });
    self.on('error', callback);
  }
  function onDestroy() {
    self.cancel();
  }
  db.once('destroyed', onDestroy);

  opts.onChange = function (change, pending, lastSeq) {
    /* istanbul ignore if */
    if (self.isCancelled) {
      return;
    }
    tryCatchInChangeListener(self, change, pending, lastSeq);
  };

  var promise = new Promise(function (fulfill, reject) {
    opts.complete = function (err, res) {
      if (err) {
        reject(err);
      } else {
        fulfill(res);
      }
    };
  });
  self.once('cancel', function () {
    db.removeListener('destroyed', onDestroy);
    opts.complete(null, {status: 'cancelled'});
  });
  this.then = promise.then.bind(promise);
  this['catch'] = promise['catch'].bind(promise);
  this.then(function (result) {
    complete(null, result);
  }, complete);



  if (!db.taskqueue.isReady) {
    db.taskqueue.addTask(function (failed) {
      if (failed) {
        opts.complete(failed);
      } else if (self.isCancelled) {
        self.emit('cancel');
      } else {
        self.validateChanges(opts);
      }
    });
  } else {
    self.validateChanges(opts);
  }
}
Changes$1.prototype.cancel = function () {
  this.isCancelled = true;
  if (this.db.taskqueue.isReady) {
    this.emit('cancel');
  }
};
function processChange(doc, metadata, opts) {
  var changeList = [{rev: doc._rev}];
  if (opts.style === 'all_docs') {
    changeList = collectLeaves(metadata.rev_tree)
    .map(function (x) { return {rev: x.rev}; });
  }
  var change = {
    id: metadata.id,
    changes: changeList,
    doc: doc
  };

  if (isDeleted(metadata, doc._rev)) {
    change.deleted = true;
  }
  if (opts.conflicts) {
    change.doc._conflicts = collectConflicts(metadata);
    if (!change.doc._conflicts.length) {
      delete change.doc._conflicts;
    }
  }
  return change;
}

Changes$1.prototype.validateChanges = function (opts) {
  var callback = opts.complete;
  var self = this;

  /* istanbul ignore else */
  if (PouchDB._changesFilterPlugin) {
    PouchDB._changesFilterPlugin.validate(opts, function (err) {
      if (err) {
        return callback(err);
      }
      self.doChanges(opts);
    });
  } else {
    self.doChanges(opts);
  }
};

Changes$1.prototype.doChanges = function (opts) {
  var self = this;
  var callback = opts.complete;

  opts = clone(opts);
  if ('live' in opts && !('continuous' in opts)) {
    opts.continuous = opts.live;
  }
  opts.processChange = processChange;

  if (opts.since === 'latest') {
    opts.since = 'now';
  }
  if (!opts.since) {
    opts.since = 0;
  }
  if (opts.since === 'now') {
    this.db.info().then(function (info) {
      /* istanbul ignore if */
      if (self.isCancelled) {
        callback(null, {status: 'cancelled'});
        return;
      }
      opts.since = info.update_seq;
      self.doChanges(opts);
    }, callback);
    return;
  }

  /* istanbul ignore else */
  if (PouchDB._changesFilterPlugin) {
    PouchDB._changesFilterPlugin.normalize(opts);
    if (PouchDB._changesFilterPlugin.shouldFilter(this, opts)) {
      return PouchDB._changesFilterPlugin.filter(this, opts);
    }
  } else {
    ['doc_ids', 'filter', 'selector', 'view'].forEach(function (key) {
      if (key in opts) {
        guardedConsole('warn',
          'The "' + key + '" option was passed in to changes/replicate, ' +
          'but pouchdb-changes-filter plugin is not installed, so it ' +
          'was ignored. Please install the plugin to enable filtering.'
        );
      }
    });
  }

  if (!('descending' in opts)) {
    opts.descending = false;
  }

  // 0 and 1 should return 1 document
  opts.limit = opts.limit === 0 ? 1 : opts.limit;
  opts.complete = callback;
  var newPromise = this.db._changes(opts);
  /* istanbul ignore else */
  if (newPromise && typeof newPromise.cancel === 'function') {
    var cancel = self.cancel;
    self.cancel = getArguments(function (args) {
      newPromise.cancel();
      cancel.apply(this, args);
    });
  }
};

/*
 * A generic pouch adapter
 */

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

// Wrapper for functions that call the bulkdocs api with a single doc,
// if the first result is an error, return an error
function yankError(callback, docId) {
  return function (err, results) {
    if (err || (results[0] && results[0].error)) {
      err = err || results[0];
      err.docId = docId;
      callback(err);
    } else {
      callback(null, results.length ? results[0]  : results);
    }
  };
}

// clean docs given to us by the user
function cleanDocs(docs) {
  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];
    if (doc._deleted) {
      delete doc._attachments; // ignore atts for deleted docs
    } else if (doc._attachments) {
      // filter out extraneous keys from _attachments
      var atts = Object.keys(doc._attachments);
      for (var j = 0; j < atts.length; j++) {
        var att = atts[j];
        doc._attachments[att] = pick(doc._attachments[att],
          ['data', 'digest', 'content_type', 'length', 'revpos', 'stub']);
      }
    }
  }
}

// compare two docs, first by _id then by _rev
function compareByIdThenRev(a, b) {
  var idCompare = compare(a._id, b._id);
  if (idCompare !== 0) {
    return idCompare;
  }
  var aStart = a._revisions ? a._revisions.start : 0;
  var bStart = b._revisions ? b._revisions.start : 0;
  return compare(aStart, bStart);
}

// for every node in a revision tree computes its distance from the closest
// leaf
function computeHeight(revs) {
  var height = {};
  var edges = [];
  traverseRevTree(revs, function (isLeaf, pos, id, prnt) {
    var rev$$1 = pos + "-" + id;
    if (isLeaf) {
      height[rev$$1] = 0;
    }
    if (prnt !== undefined) {
      edges.push({from: prnt, to: rev$$1});
    }
    return rev$$1;
  });

  edges.reverse();
  edges.forEach(function (edge) {
    if (height[edge.from] === undefined) {
      height[edge.from] = 1 + height[edge.to];
    } else {
      height[edge.from] = Math.min(height[edge.from], 1 + height[edge.to]);
    }
  });
  return height;
}

function allDocsKeysParse(opts) {
  var keys =  ('limit' in opts) ?
    opts.keys.slice(opts.skip, opts.limit + opts.skip) :
    (opts.skip > 0) ? opts.keys.slice(opts.skip) : opts.keys;
  opts.keys = keys;
  opts.skip = 0;
  delete opts.limit;
  if (opts.descending) {
    keys.reverse();
    opts.descending = false;
  }
}

// all compaction is done in a queue, to avoid attaching
// too many listeners at once
function doNextCompaction(self) {
  var task = self._compactionQueue[0];
  var opts = task.opts;
  var callback = task.callback;
  self.get('_local/compaction').catch(function () {
    return false;
  }).then(function (doc) {
    if (doc && doc.last_seq) {
      opts.last_seq = doc.last_seq;
    }
    self._compact(opts, function (err, res) {
      /* istanbul ignore if */
      if (err) {
        callback(err);
      } else {
        callback(null, res);
      }
      immediate(function () {
        self._compactionQueue.shift();
        if (self._compactionQueue.length) {
          doNextCompaction(self);
        }
      });
    });
  });
}

function attachmentNameError(name) {
  if (name.charAt(0) === '_') {
    return name + ' is not a valid attachment name, attachment ' +
      'names cannot start with \'_\'';
  }
  return false;
}

inherits(AbstractPouchDB, events.EventEmitter);

function AbstractPouchDB() {
  events.EventEmitter.call(this);

  // re-bind prototyped methods
  for (var p in AbstractPouchDB.prototype) {
    if (typeof this[p] === 'function') {
      this[p] = this[p].bind(this);
    }
  }
}

AbstractPouchDB.prototype.post =
  adapterFun('post', function (doc, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  if (typeof doc !== 'object' || Array.isArray(doc)) {
    return callback(createError(NOT_AN_OBJECT));
  }
  this.bulkDocs({docs: [doc]}, opts, yankError(callback, doc._id));
});

AbstractPouchDB.prototype.put = adapterFun('put', function (doc, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  if (typeof doc !== 'object' || Array.isArray(doc)) {
    return cb(createError(NOT_AN_OBJECT));
  }
  invalidIdError(doc._id);
  if (isLocalId(doc._id) && typeof this._putLocal === 'function') {
    if (doc._deleted) {
      return this._removeLocal(doc, cb);
    } else {
      return this._putLocal(doc, cb);
    }
  }
  var self = this;
  if (opts.force && doc._rev) {
    transformForceOptionToNewEditsOption();
    putDoc(function (err) {
      var result = err ? null : {ok: true, id: doc._id, rev: doc._rev};
      cb(err, result);
    });
  } else {
    putDoc(cb);
  }

  function transformForceOptionToNewEditsOption() {
    var parts = doc._rev.split('-');
    var oldRevId = parts[1];
    var oldRevNum = parseInt(parts[0], 10);

    var newRevNum = oldRevNum + 1;
    var newRevId = rev();

    doc._revisions = {
      start: newRevNum,
      ids: [newRevId, oldRevId]
    };
    doc._rev = newRevNum + '-' + newRevId;
    opts.new_edits = false;
  }
  function putDoc(next) {
    if (typeof self._put === 'function' && opts.new_edits !== false) {
      self._put(doc, opts, next);
    } else {
      self.bulkDocs({docs: [doc]}, opts, yankError(next, doc._id));
    }
  }
});

AbstractPouchDB.prototype.putAttachment =
  adapterFun('putAttachment', function (docId, attachmentId, rev$$1,
                                              blob, type) {
  var api = this;
  if (typeof type === 'function') {
    type = blob;
    blob = rev$$1;
    rev$$1 = null;
  }
  // Lets fix in https://github.com/pouchdb/pouchdb/issues/3267
  /* istanbul ignore if */
  if (typeof type === 'undefined') {
    type = blob;
    blob = rev$$1;
    rev$$1 = null;
  }
  if (!type) {
    guardedConsole('warn', 'Attachment', attachmentId, 'on document', docId, 'is missing content_type');
  }

  function createAttachment(doc) {
    var prevrevpos = '_rev' in doc ? parseInt(doc._rev, 10) : 0;
    doc._attachments = doc._attachments || {};
    doc._attachments[attachmentId] = {
      content_type: type,
      data: blob,
      revpos: ++prevrevpos
    };
    return api.put(doc);
  }

  return api.get(docId).then(function (doc) {
    if (doc._rev !== rev$$1) {
      throw createError(REV_CONFLICT);
    }

    return createAttachment(doc);
  }, function (err) {
     // create new doc
    /* istanbul ignore else */
    if (err.reason === MISSING_DOC.message) {
      return createAttachment({_id: docId});
    } else {
      throw err;
    }
  });
});

AbstractPouchDB.prototype.removeAttachment =
  adapterFun('removeAttachment', function (docId, attachmentId, rev$$1,
                                                 callback) {
  var self = this;
  self.get(docId, function (err, obj) {
    /* istanbul ignore if */
    if (err) {
      callback(err);
      return;
    }
    if (obj._rev !== rev$$1) {
      callback(createError(REV_CONFLICT));
      return;
    }
    /* istanbul ignore if */
    if (!obj._attachments) {
      return callback();
    }
    delete obj._attachments[attachmentId];
    if (Object.keys(obj._attachments).length === 0) {
      delete obj._attachments;
    }
    self.put(obj, callback);
  });
});

AbstractPouchDB.prototype.remove =
  adapterFun('remove', function (docOrId, optsOrRev, opts, callback) {
  var doc;
  if (typeof optsOrRev === 'string') {
    // id, rev, opts, callback style
    doc = {
      _id: docOrId,
      _rev: optsOrRev
    };
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
  } else {
    // doc, opts, callback style
    doc = docOrId;
    if (typeof optsOrRev === 'function') {
      callback = optsOrRev;
      opts = {};
    } else {
      callback = opts;
      opts = optsOrRev;
    }
  }
  opts = opts || {};
  opts.was_delete = true;
  var newDoc = {_id: doc._id, _rev: (doc._rev || opts.rev)};
  newDoc._deleted = true;
  if (isLocalId(newDoc._id) && typeof this._removeLocal === 'function') {
    return this._removeLocal(doc, callback);
  }
  this.bulkDocs({docs: [newDoc]}, opts, yankError(callback, newDoc._id));
});

AbstractPouchDB.prototype.revsDiff =
  adapterFun('revsDiff', function (req, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  var ids = Object.keys(req);

  if (!ids.length) {
    return callback(null, {});
  }

  var count = 0;
  var missing = new ExportedMap();

  function addToMissing(id, revId) {
    if (!missing.has(id)) {
      missing.set(id, {missing: []});
    }
    missing.get(id).missing.push(revId);
  }

  function processDoc(id, rev_tree) {
    // Is this fast enough? Maybe we should switch to a set simulated by a map
    var missingForId = req[id].slice(0);
    traverseRevTree(rev_tree, function (isLeaf, pos, revHash, ctx,
      opts) {
        var rev$$1 = pos + '-' + revHash;
        var idx = missingForId.indexOf(rev$$1);
        if (idx === -1) {
          return;
        }

        missingForId.splice(idx, 1);
        /* istanbul ignore if */
        if (opts.status !== 'available') {
          addToMissing(id, rev$$1);
        }
      });

    // Traversing the tree is synchronous, so now `missingForId` contains
    // revisions that were not found in the tree
    missingForId.forEach(function (rev$$1) {
      addToMissing(id, rev$$1);
    });
  }

  ids.map(function (id) {
    this._getRevisionTree(id, function (err, rev_tree) {
      if (err && err.status === 404 && err.message === 'missing') {
        missing.set(id, {missing: req[id]});
      } else if (err) {
        /* istanbul ignore next */
        return callback(err);
      } else {
        processDoc(id, rev_tree);
      }

      if (++count === ids.length) {
        // convert LazyMap to object
        var missingObj = {};
        missing.forEach(function (value, key) {
          missingObj[key] = value;
        });
        return callback(null, missingObj);
      }
    });
  }, this);
});

// _bulk_get API for faster replication, as described in
// https://github.com/apache/couchdb-chttpd/pull/33
// At the "abstract" level, it will just run multiple get()s in
// parallel, because this isn't much of a performance cost
// for local databases (except the cost of multiple transactions, which is
// small). The http adapter overrides this in order
// to do a more efficient single HTTP request.
AbstractPouchDB.prototype.bulkGet =
  adapterFun('bulkGet', function (opts, callback) {
  bulkGet(this, opts, callback);
});

// compact one document and fire callback
// by compacting we mean removing all revisions which
// are further from the leaf in revision tree than max_height
AbstractPouchDB.prototype.compactDocument =
  adapterFun('compactDocument', function (docId, maxHeight, callback) {
  var self = this;
  this._getRevisionTree(docId, function (err, revTree) {
    /* istanbul ignore if */
    if (err) {
      return callback(err);
    }
    var height = computeHeight(revTree);
    var candidates = [];
    var revs = [];
    Object.keys(height).forEach(function (rev$$1) {
      if (height[rev$$1] > maxHeight) {
        candidates.push(rev$$1);
      }
    });

    traverseRevTree(revTree, function (isLeaf, pos, revHash, ctx, opts) {
      var rev$$1 = pos + '-' + revHash;
      if (opts.status === 'available' && candidates.indexOf(rev$$1) !== -1) {
        revs.push(rev$$1);
      }
    });
    self._doCompaction(docId, revs, callback);
  });
});

// compact the whole database using single document
// compaction
AbstractPouchDB.prototype.compact =
  adapterFun('compact', function (opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  var self = this;
  opts = opts || {};

  self._compactionQueue = self._compactionQueue || [];
  self._compactionQueue.push({opts: opts, callback: callback});
  if (self._compactionQueue.length === 1) {
    doNextCompaction(self);
  }
});
AbstractPouchDB.prototype._compact = function (opts, callback) {
  var self = this;
  var changesOpts = {
    return_docs: false,
    last_seq: opts.last_seq || 0
  };
  var promises = [];

  function onChange(row) {
    promises.push(self.compactDocument(row.id, 0));
  }
  function onComplete(resp) {
    var lastSeq = resp.last_seq;
    Promise.all(promises).then(function () {
      return upsert(self, '_local/compaction', function deltaFunc(doc) {
        if (!doc.last_seq || doc.last_seq < lastSeq) {
          doc.last_seq = lastSeq;
          return doc;
        }
        return false; // somebody else got here first, don't update
      });
    }).then(function () {
      callback(null, {ok: true});
    }).catch(callback);
  }
  self.changes(changesOpts)
    .on('change', onChange)
    .on('complete', onComplete)
    .on('error', callback);
};

/* Begin api wrappers. Specific functionality to storage belongs in the
   _[method] */
AbstractPouchDB.prototype.get = adapterFun('get', function (id, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  if (typeof id !== 'string') {
    return cb(createError(INVALID_ID));
  }
  if (isLocalId(id) && typeof this._getLocal === 'function') {
    return this._getLocal(id, cb);
  }
  var leaves = [], self = this;

  function finishOpenRevs() {
    var result = [];
    var count = leaves.length;
    /* istanbul ignore if */
    if (!count) {
      return cb(null, result);
    }

    // order with open_revs is unspecified
    leaves.forEach(function (leaf) {
      self.get(id, {
        rev: leaf,
        revs: opts.revs,
        latest: opts.latest,
        attachments: opts.attachments,
        binary: opts.binary
      }, function (err, doc) {
        if (!err) {
          // using latest=true can produce duplicates
          var existing;
          for (var i = 0, l = result.length; i < l; i++) {
            if (result[i].ok && result[i].ok._rev === doc._rev) {
              existing = true;
              break;
            }
          }
          if (!existing) {
            result.push({ok: doc});
          }
        } else {
          result.push({missing: leaf});
        }
        count--;
        if (!count) {
          cb(null, result);
        }
      });
    });
  }

  if (opts.open_revs) {
    if (opts.open_revs === "all") {
      this._getRevisionTree(id, function (err, rev_tree) {
        /* istanbul ignore if */
        if (err) {
          return cb(err);
        }
        leaves = collectLeaves(rev_tree).map(function (leaf) {
          return leaf.rev;
        });
        finishOpenRevs();
      });
    } else {
      if (Array.isArray(opts.open_revs)) {
        leaves = opts.open_revs;
        for (var i = 0; i < leaves.length; i++) {
          var l = leaves[i];
          // looks like it's the only thing couchdb checks
          if (!(typeof (l) === "string" && /^\d+-/.test(l))) {
            return cb(createError(INVALID_REV));
          }
        }
        finishOpenRevs();
      } else {
        return cb(createError(UNKNOWN_ERROR, 'function_clause'));
      }
    }
    return; // open_revs does not like other options
  }

  return this._get(id, opts, function (err, result) {
    if (err) {
      err.docId = id;
      return cb(err);
    }

    var doc = result.doc;
    var metadata = result.metadata;
    var ctx = result.ctx;

    if (opts.conflicts) {
      var conflicts = collectConflicts(metadata);
      if (conflicts.length) {
        doc._conflicts = conflicts;
      }
    }

    if (isDeleted(metadata, doc._rev)) {
      doc._deleted = true;
    }

    if (opts.revs || opts.revs_info) {
      var splittedRev = doc._rev.split('-');
      var revNo       = parseInt(splittedRev[0], 10);
      var revHash     = splittedRev[1];

      var paths = rootToLeaf(metadata.rev_tree);
      var path = null;

      for (var i = 0; i < paths.length; i++) {
        var currentPath = paths[i];
        var hashIndex = currentPath.ids.map(function (x) { return x.id; })
          .indexOf(revHash);
        var hashFoundAtRevPos = hashIndex === (revNo - 1);

        if (hashFoundAtRevPos || (!path && hashIndex !== -1)) {
          path = currentPath;
        }
      }

      /* istanbul ignore if */
      if (!path) {
        err = new Error('invalid rev tree');
        err.docId = id;
        return cb(err);
      }

      var indexOfRev = path.ids.map(function (x) { return x.id; })
        .indexOf(doc._rev.split('-')[1]) + 1;
      var howMany = path.ids.length - indexOfRev;
      path.ids.splice(indexOfRev, howMany);
      path.ids.reverse();

      if (opts.revs) {
        doc._revisions = {
          start: (path.pos + path.ids.length) - 1,
          ids: path.ids.map(function (rev$$1) {
            return rev$$1.id;
          })
        };
      }
      if (opts.revs_info) {
        var pos =  path.pos + path.ids.length;
        doc._revs_info = path.ids.map(function (rev$$1) {
          pos--;
          return {
            rev: pos + '-' + rev$$1.id,
            status: rev$$1.opts.status
          };
        });
      }
    }

    if (opts.attachments && doc._attachments) {
      var attachments = doc._attachments;
      var count = Object.keys(attachments).length;
      if (count === 0) {
        return cb(null, doc);
      }
      Object.keys(attachments).forEach(function (key) {
        this._getAttachment(doc._id, key, attachments[key], {
          // Previously the revision handling was done in adapter.js
          // getAttachment, however since idb-next doesnt we need to
          // pass the rev through
          rev: doc._rev,
          binary: opts.binary,
          ctx: ctx
        }, function (err, data) {
          var att = doc._attachments[key];
          att.data = data;
          delete att.stub;
          delete att.length;
          if (!--count) {
            cb(null, doc);
          }
        });
      }, self);
    } else {
      if (doc._attachments) {
        for (var key in doc._attachments) {
          /* istanbul ignore else */
          if (doc._attachments.hasOwnProperty(key)) {
            doc._attachments[key].stub = true;
          }
        }
      }
      cb(null, doc);
    }
  });
});

// TODO: I dont like this, it forces an extra read for every
// attachment read and enforces a confusing api between
// adapter.js and the adapter implementation
AbstractPouchDB.prototype.getAttachment =
  adapterFun('getAttachment', function (docId, attachmentId, opts, callback) {
  var self = this;
  if (opts instanceof Function) {
    callback = opts;
    opts = {};
  }
  this._get(docId, opts, function (err, res) {
    if (err) {
      return callback(err);
    }
    if (res.doc._attachments && res.doc._attachments[attachmentId]) {
      opts.ctx = res.ctx;
      opts.binary = true;
      self._getAttachment(docId, attachmentId,
                          res.doc._attachments[attachmentId], opts, callback);
    } else {
      return callback(createError(MISSING_DOC));
    }
  });
});

AbstractPouchDB.prototype.allDocs =
  adapterFun('allDocs', function (opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  opts.skip = typeof opts.skip !== 'undefined' ? opts.skip : 0;
  if (opts.start_key) {
    opts.startkey = opts.start_key;
  }
  if (opts.end_key) {
    opts.endkey = opts.end_key;
  }
  if ('keys' in opts) {
    if (!Array.isArray(opts.keys)) {
      return callback(new TypeError('options.keys must be an array'));
    }
    var incompatibleOpt =
      ['startkey', 'endkey', 'key'].filter(function (incompatibleOpt) {
      return incompatibleOpt in opts;
    })[0];
    if (incompatibleOpt) {
      callback(createError(QUERY_PARSE_ERROR,
        'Query parameter `' + incompatibleOpt +
        '` is not compatible with multi-get'
      ));
      return;
    }
    if (!isRemote(this)) {
      allDocsKeysParse(opts);
      if (opts.keys.length === 0) {
        return this._allDocs({limit: 0}, callback);
      }
    }
  }

  return this._allDocs(opts, callback);
});

AbstractPouchDB.prototype.changes = function (opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  opts = opts || {};

  // By default set return_docs to false if the caller has opts.live = true,
  // this will prevent us from collecting the set of changes indefinitely
  // resulting in growing memory
  opts.return_docs = ('return_docs' in opts) ? opts.return_docs : !opts.live;

  return new Changes$1(this, opts, callback);
};

AbstractPouchDB.prototype.close = adapterFun('close', function (callback) {
  this._closed = true;
  this.emit('closed');
  return this._close(callback);
});

AbstractPouchDB.prototype.info = adapterFun('info', function (callback) {
  var self = this;
  this._info(function (err, info) {
    if (err) {
      return callback(err);
    }
    // assume we know better than the adapter, unless it informs us
    info.db_name = info.db_name || self.name;
    info.auto_compaction = !!(self.auto_compaction && !isRemote(self));
    info.adapter = self.adapter;
    callback(null, info);
  });
});

AbstractPouchDB.prototype.id = adapterFun('id', function (callback) {
  return this._id(callback);
});

/* istanbul ignore next */
AbstractPouchDB.prototype.type = function () {
  return (typeof this._type === 'function') ? this._type() : this.adapter;
};

AbstractPouchDB.prototype.bulkDocs =
  adapterFun('bulkDocs', function (req, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  opts = opts || {};

  if (Array.isArray(req)) {
    req = {
      docs: req
    };
  }

  if (!req || !req.docs || !Array.isArray(req.docs)) {
    return callback(createError(MISSING_BULK_DOCS));
  }

  for (var i = 0; i < req.docs.length; ++i) {
    if (typeof req.docs[i] !== 'object' || Array.isArray(req.docs[i])) {
      return callback(createError(NOT_AN_OBJECT));
    }
  }

  var attachmentError;
  req.docs.forEach(function (doc) {
    if (doc._attachments) {
      Object.keys(doc._attachments).forEach(function (name) {
        attachmentError = attachmentError || attachmentNameError(name);
        if (!doc._attachments[name].content_type) {
          guardedConsole('warn', 'Attachment', name, 'on document', doc._id, 'is missing content_type');
        }
      });
    }
  });

  if (attachmentError) {
    return callback(createError(BAD_REQUEST, attachmentError));
  }

  if (!('new_edits' in opts)) {
    if ('new_edits' in req) {
      opts.new_edits = req.new_edits;
    } else {
      opts.new_edits = true;
    }
  }

  var adapter = this;
  if (!opts.new_edits && !isRemote(adapter)) {
    // ensure revisions of the same doc are sorted, so that
    // the local adapter processes them correctly (#2935)
    req.docs.sort(compareByIdThenRev);
  }

  cleanDocs(req.docs);

  // in the case of conflicts, we want to return the _ids to the user
  // however, the underlying adapter may destroy the docs array, so
  // create a copy here
  var ids = req.docs.map(function (doc) {
    return doc._id;
  });

  return this._bulkDocs(req, opts, function (err, res) {
    if (err) {
      return callback(err);
    }
    if (!opts.new_edits) {
      // this is what couch does when new_edits is false
      res = res.filter(function (x) {
        return x.error;
      });
    }
    // add ids for error/conflict responses (not required for CouchDB)
    if (!isRemote(adapter)) {
      for (var i = 0, l = res.length; i < l; i++) {
        res[i].id = res[i].id || ids[i];
      }
    }

    callback(null, res);
  });
});

AbstractPouchDB.prototype.registerDependentDatabase =
  adapterFun('registerDependentDatabase', function (dependentDb,
                                                          callback) {
  var depDB = new this.constructor(dependentDb, this.__opts);

  function diffFun(doc) {
    doc.dependentDbs = doc.dependentDbs || {};
    if (doc.dependentDbs[dependentDb]) {
      return false; // no update required
    }
    doc.dependentDbs[dependentDb] = true;
    return doc;
  }
  upsert(this, '_local/_pouch_dependentDbs', diffFun)
    .then(function () {
      callback(null, {db: depDB});
    }).catch(callback);
});

AbstractPouchDB.prototype.destroy =
  adapterFun('destroy', function (opts, callback) {

  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  var self = this;
  var usePrefix = 'use_prefix' in self ? self.use_prefix : true;

  function destroyDb() {
    // call destroy method of the particular adaptor
    self._destroy(opts, function (err, resp) {
      if (err) {
        return callback(err);
      }
      self._destroyed = true;
      self.emit('destroyed');
      callback(null, resp || { 'ok': true });
    });
  }

  if (isRemote(self)) {
    // no need to check for dependent DBs if it's a remote DB
    return destroyDb();
  }

  self.get('_local/_pouch_dependentDbs', function (err, localDoc) {
    if (err) {
      /* istanbul ignore if */
      if (err.status !== 404) {
        return callback(err);
      } else { // no dependencies
        return destroyDb();
      }
    }
    var dependentDbs = localDoc.dependentDbs;
    var PouchDB = self.constructor;
    var deletedMap = Object.keys(dependentDbs).map(function (name) {
      // use_prefix is only false in the browser
      /* istanbul ignore next */
      var trueName = usePrefix ?
        name.replace(new RegExp('^' + PouchDB.prefix), '') : name;
      return new PouchDB(trueName, self.__opts).destroy();
    });
    Promise.all(deletedMap).then(destroyDb, callback);
  });
});

function TaskQueue() {
  this.isReady = false;
  this.failed = false;
  this.queue = [];
}

TaskQueue.prototype.execute = function () {
  var fun;
  if (this.failed) {
    while ((fun = this.queue.shift())) {
      fun(this.failed);
    }
  } else {
    while ((fun = this.queue.shift())) {
      fun();
    }
  }
};

TaskQueue.prototype.fail = function (err) {
  this.failed = err;
  this.execute();
};

TaskQueue.prototype.ready = function (db) {
  this.isReady = true;
  this.db = db;
  this.execute();
};

TaskQueue.prototype.addTask = function (fun) {
  this.queue.push(fun);
  if (this.failed) {
    this.execute();
  }
};

function parseAdapter(name, opts) {
  var match = name.match(/([a-z-]*):\/\/(.*)/);
  if (match) {
    // the http adapter expects the fully qualified name
    return {
      name: /https?/.test(match[1]) ? match[1] + '://' + match[2] : match[2],
      adapter: match[1]
    };
  }

  var adapters = PouchDB.adapters;
  var preferredAdapters = PouchDB.preferredAdapters;
  var prefix = PouchDB.prefix;
  var adapterName = opts.adapter;

  if (!adapterName) { // automatically determine adapter
    for (var i = 0; i < preferredAdapters.length; ++i) {
      adapterName = preferredAdapters[i];
      // check for browsers that have been upgraded from websql-only to websql+idb
      /* istanbul ignore if */
      if (adapterName === 'idb' && 'websql' in adapters &&
          hasLocalStorage() && localStorage['_pouch__websqldb_' + prefix + name]) {
        // log it, because this can be confusing during development
        guardedConsole('log', 'PouchDB is downgrading "' + name + '" to WebSQL to' +
          ' avoid data loss, because it was already opened with WebSQL.');
        continue; // keep using websql to avoid user data loss
      }
      break;
    }
  }

  var adapter = adapters[adapterName];

  // if adapter is invalid, then an error will be thrown later
  var usePrefix = (adapter && 'use_prefix' in adapter) ?
    adapter.use_prefix : true;

  return {
    name: usePrefix ? (prefix + name) : name,
    adapter: adapterName
  };
}

// OK, so here's the deal. Consider this code:
//     var db1 = new PouchDB('foo');
//     var db2 = new PouchDB('foo');
//     db1.destroy();
// ^ these two both need to emit 'destroyed' events,
// as well as the PouchDB constructor itself.
// So we have one db object (whichever one got destroy() called on it)
// responsible for emitting the initial event, which then gets emitted
// by the constructor, which then broadcasts it to any other dbs
// that may have been created with the same name.
function prepareForDestruction(self) {

  function onDestroyed(from_constructor) {
    self.removeListener('closed', onClosed);
    if (!from_constructor) {
      self.constructor.emit('destroyed', self.name);
    }
  }

  function onClosed() {
    self.removeListener('destroyed', onDestroyed);
    self.constructor.emit('unref', self);
  }

  self.once('destroyed', onDestroyed);
  self.once('closed', onClosed);
  self.constructor.emit('ref', self);
}

inherits(PouchDB, AbstractPouchDB);
function PouchDB(name, opts) {
  // In Node our test suite only tests this for PouchAlt unfortunately
  /* istanbul ignore if */
  if (!(this instanceof PouchDB)) {
    return new PouchDB(name, opts);
  }

  var self = this;
  opts = opts || {};

  if (name && typeof name === 'object') {
    opts = name;
    name = opts.name;
    delete opts.name;
  }

  if (opts.deterministic_revs === undefined) {
    opts.deterministic_revs = true;
  }

  this.__opts = opts = clone(opts);

  self.auto_compaction = opts.auto_compaction;
  self.prefix = PouchDB.prefix;

  if (typeof name !== 'string') {
    throw new Error('Missing/invalid DB name');
  }

  var prefixedName = (opts.prefix || '') + name;
  var backend = parseAdapter(prefixedName, opts);

  opts.name = backend.name;
  opts.adapter = opts.adapter || backend.adapter;

  self.name = name;
  self._adapter = opts.adapter;
  PouchDB.emit('debug', ['adapter', 'Picked adapter: ', opts.adapter]);

  if (!PouchDB.adapters[opts.adapter] ||
      !PouchDB.adapters[opts.adapter].valid()) {
    throw new Error('Invalid Adapter: ' + opts.adapter);
  }

  AbstractPouchDB.call(self);
  self.taskqueue = new TaskQueue();

  self.adapter = opts.adapter;

  PouchDB.adapters[opts.adapter].call(self, opts, function (err) {
    if (err) {
      return self.taskqueue.fail(err);
    }
    prepareForDestruction(self);

    self.emit('created', self);
    PouchDB.emit('created', self.name);
    self.taskqueue.ready(self);
  });

}

// AbortController was introduced quite a while after fetch and
// isnt required for PouchDB to function so polyfill if needed
var a = (typeof AbortController !== 'undefined')
    ? AbortController
    : function () { return {abort: function () {}}; };

var f$1 = fetch;
var h = Headers;

PouchDB.adapters = {};
PouchDB.preferredAdapters = [];

PouchDB.prefix = '_pouch_';

var eventEmitter = new events.EventEmitter();

function setUpEventEmitter(Pouch) {
  Object.keys(events.EventEmitter.prototype).forEach(function (key) {
    if (typeof events.EventEmitter.prototype[key] === 'function') {
      Pouch[key] = eventEmitter[key].bind(eventEmitter);
    }
  });

  // these are created in constructor.js, and allow us to notify each DB with
  // the same name that it was destroyed, via the constructor object
  var destructListeners = Pouch._destructionListeners = new ExportedMap();

  Pouch.on('ref', function onConstructorRef(db) {
    if (!destructListeners.has(db.name)) {
      destructListeners.set(db.name, []);
    }
    destructListeners.get(db.name).push(db);
  });

  Pouch.on('unref', function onConstructorUnref(db) {
    if (!destructListeners.has(db.name)) {
      return;
    }
    var dbList = destructListeners.get(db.name);
    var pos = dbList.indexOf(db);
    if (pos < 0) {
      /* istanbul ignore next */
      return;
    }
    dbList.splice(pos, 1);
    if (dbList.length > 1) {
      /* istanbul ignore next */
      destructListeners.set(db.name, dbList);
    } else {
      destructListeners.delete(db.name);
    }
  });

  Pouch.on('destroyed', function onConstructorDestroyed(name) {
    if (!destructListeners.has(name)) {
      return;
    }
    var dbList = destructListeners.get(name);
    destructListeners.delete(name);
    dbList.forEach(function (db) {
      db.emit('destroyed',true);
    });
  });
}

setUpEventEmitter(PouchDB);

PouchDB.adapter = function (id, obj, addToPreferredAdapters) {
  /* istanbul ignore else */
  if (obj.valid()) {
    PouchDB.adapters[id] = obj;
    if (addToPreferredAdapters) {
      PouchDB.preferredAdapters.push(id);
    }
  }
};

PouchDB.plugin = function (obj) {
  if (typeof obj === 'function') { // function style for plugins
    obj(PouchDB);
  } else if (typeof obj !== 'object' || Object.keys(obj).length === 0) {
    throw new Error('Invalid plugin: got "' + obj + '", expected an object or a function');
  } else {
    Object.keys(obj).forEach(function (id) { // object style for plugins
      PouchDB.prototype[id] = obj[id];
    });
  }
  if (this.__defaults) {
    PouchDB.__defaults = $inject_Object_assign({}, this.__defaults);
  }
  return PouchDB;
};

PouchDB.defaults = function (defaultOpts) {
  function PouchAlt(name, opts) {
    if (!(this instanceof PouchAlt)) {
      return new PouchAlt(name, opts);
    }

    opts = opts || {};

    if (name && typeof name === 'object') {
      opts = name;
      name = opts.name;
      delete opts.name;
    }

    opts = $inject_Object_assign({}, PouchAlt.__defaults, opts);
    PouchDB.call(this, name, opts);
  }

  inherits(PouchAlt, PouchDB);

  PouchAlt.preferredAdapters = PouchDB.preferredAdapters.slice();
  Object.keys(PouchDB).forEach(function (key) {
    if (!(key in PouchAlt)) {
      PouchAlt[key] = PouchDB[key];
    }
  });

  // make default options transitive
  // https://github.com/pouchdb/pouchdb/issues/5922
  PouchAlt.__defaults = $inject_Object_assign({}, this.__defaults, defaultOpts);

  return PouchAlt;
};

PouchDB.fetch = function (url, opts) {
  return f$1(url, opts);
};

// managed automatically by set-version.js
var version = "7.2.1";

// this would just be "return doc[field]", but fields
// can be "deep" due to dot notation
function getFieldFromDoc(doc, parsedField) {
  var value = doc;
  for (var i = 0, len = parsedField.length; i < len; i++) {
    var key = parsedField[i];
    value = value[key];
    if (!value) {
      break;
    }
  }
  return value;
}

function compare$1(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

// Converts a string in dot notation to an array of its components, with backslash escaping
function parseField(fieldName) {
  // fields may be deep (e.g. "foo.bar.baz"), so parse
  var fields = [];
  var current = '';
  for (var i = 0, len = fieldName.length; i < len; i++) {
    var ch = fieldName[i];
    if (ch === '.') {
      if (i > 0 && fieldName[i - 1] === '\\') { // escaped delimiter
        current = current.substring(0, current.length - 1) + '.';
      } else { // not escaped, so delimiter
        fields.push(current);
        current = '';
      }
    } else { // normal character
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

var combinationFields = ['$or', '$nor', '$not'];
function isCombinationalField(field) {
  return combinationFields.indexOf(field) > -1;
}

function getKey(obj) {
  return Object.keys(obj)[0];
}

function getValue(obj) {
  return obj[getKey(obj)];
}


// flatten an array of selectors joined by an $and operator
function mergeAndedSelectors(selectors) {

  // sort to ensure that e.g. if the user specified
  // $and: [{$gt: 'a'}, {$gt: 'b'}], then it's collapsed into
  // just {$gt: 'b'}
  var res = {};

  selectors.forEach(function (selector) {
    Object.keys(selector).forEach(function (field) {
      var matcher = selector[field];
      if (typeof matcher !== 'object') {
        matcher = {$eq: matcher};
      }

      if (isCombinationalField(field)) {
        if (matcher instanceof Array) {
          res[field] = matcher.map(function (m) {
            return mergeAndedSelectors([m]);
          });
        } else {
          res[field] = mergeAndedSelectors([matcher]);
        }
      } else {
        var fieldMatchers = res[field] = res[field] || {};
        Object.keys(matcher).forEach(function (operator) {
          var value = matcher[operator];

          if (operator === '$gt' || operator === '$gte') {
            return mergeGtGte(operator, value, fieldMatchers);
          } else if (operator === '$lt' || operator === '$lte') {
            return mergeLtLte(operator, value, fieldMatchers);
          } else if (operator === '$ne') {
            return mergeNe(value, fieldMatchers);
          } else if (operator === '$eq') {
            return mergeEq(value, fieldMatchers);
          }
          fieldMatchers[operator] = value;
        });
      }
    });
  });

  return res;
}



// collapse logically equivalent gt/gte values
function mergeGtGte(operator, value, fieldMatchers) {
  if (typeof fieldMatchers.$eq !== 'undefined') {
    return; // do nothing
  }
  if (typeof fieldMatchers.$gte !== 'undefined') {
    if (operator === '$gte') {
      if (value > fieldMatchers.$gte) { // more specificity
        fieldMatchers.$gte = value;
      }
    } else { // operator === '$gt'
      if (value >= fieldMatchers.$gte) { // more specificity
        delete fieldMatchers.$gte;
        fieldMatchers.$gt = value;
      }
    }
  } else if (typeof fieldMatchers.$gt !== 'undefined') {
    if (operator === '$gte') {
      if (value > fieldMatchers.$gt) { // more specificity
        delete fieldMatchers.$gt;
        fieldMatchers.$gte = value;
      }
    } else { // operator === '$gt'
      if (value > fieldMatchers.$gt) { // more specificity
        fieldMatchers.$gt = value;
      }
    }
  } else {
    fieldMatchers[operator] = value;
  }
}

// collapse logically equivalent lt/lte values
function mergeLtLte(operator, value, fieldMatchers) {
  if (typeof fieldMatchers.$eq !== 'undefined') {
    return; // do nothing
  }
  if (typeof fieldMatchers.$lte !== 'undefined') {
    if (operator === '$lte') {
      if (value < fieldMatchers.$lte) { // more specificity
        fieldMatchers.$lte = value;
      }
    } else { // operator === '$gt'
      if (value <= fieldMatchers.$lte) { // more specificity
        delete fieldMatchers.$lte;
        fieldMatchers.$lt = value;
      }
    }
  } else if (typeof fieldMatchers.$lt !== 'undefined') {
    if (operator === '$lte') {
      if (value < fieldMatchers.$lt) { // more specificity
        delete fieldMatchers.$lt;
        fieldMatchers.$lte = value;
      }
    } else { // operator === '$gt'
      if (value < fieldMatchers.$lt) { // more specificity
        fieldMatchers.$lt = value;
      }
    }
  } else {
    fieldMatchers[operator] = value;
  }
}

// combine $ne values into one array
function mergeNe(value, fieldMatchers) {
  if ('$ne' in fieldMatchers) {
    // there are many things this could "not" be
    fieldMatchers.$ne.push(value);
  } else { // doesn't exist yet
    fieldMatchers.$ne = [value];
  }
}

// add $eq into the mix
function mergeEq(value, fieldMatchers) {
  // these all have less specificity than the $eq
  // TODO: check for user errors here
  delete fieldMatchers.$gt;
  delete fieldMatchers.$gte;
  delete fieldMatchers.$lt;
  delete fieldMatchers.$lte;
  delete fieldMatchers.$ne;
  fieldMatchers.$eq = value;
}

//#7458: execute function mergeAndedSelectors on nested $and
function mergeAndedSelectorsNested(obj) {
    for (var prop in obj) {
        if (Array.isArray(obj)) {
            for (var i in obj) {
                if (obj[i]['$and']) {
                    obj[i] = mergeAndedSelectors(obj[i]['$and']);
                }
            }
        }
        var value = obj[prop];
        if (typeof value === 'object') {
            mergeAndedSelectorsNested(value); // <- recursive call
        }
    }
    return obj;
}

//#7458: determine id $and is present in selector (at any level)
function isAndInSelector(obj, isAnd) {
    for (var prop in obj) {
        if (prop === '$and') {
            isAnd = true;
        }
        var value = obj[prop];
        if (typeof value === 'object') {
            isAnd = isAndInSelector(value, isAnd); // <- recursive call
        }
    }
    return isAnd;
}

//
// normalize the selector
//
function massageSelector(input) {
  var result = clone(input);
  var wasAnded = false;
    //#7458: if $and is present in selector (at any level) merge nested $and
    if (isAndInSelector(result, false)) {
        result = mergeAndedSelectorsNested(result);
        if ('$and' in result) {
            result = mergeAndedSelectors(result['$and']);
        }
        wasAnded = true;
    }

  ['$or', '$nor'].forEach(function (orOrNor) {
    if (orOrNor in result) {
      // message each individual selector
      // e.g. {foo: 'bar'} becomes {foo: {$eq: 'bar'}}
      result[orOrNor].forEach(function (subSelector) {
        var fields = Object.keys(subSelector);
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          var matcher = subSelector[field];
          if (typeof matcher !== 'object' || matcher === null) {
            subSelector[field] = {$eq: matcher};
          }
        }
      });
    }
  });

  if ('$not' in result) {
    //This feels a little like forcing, but it will work for now,
    //I would like to come back to this and make the merging of selectors a little more generic
    result['$not'] = mergeAndedSelectors([result['$not']]);
  }

  var fields = Object.keys(result);

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var matcher = result[field];

    if (typeof matcher !== 'object' || matcher === null) {
      matcher = {$eq: matcher};
    } else if ('$ne' in matcher && !wasAnded) {
      // I put these in an array, since there may be more than one
      // but in the "mergeAnded" operation, I already take care of that
      matcher.$ne = [matcher.$ne];
    }
    result[field] = matcher;
  }

  return result;
}

function pad(str, padWith, upToLength) {
  var padding = '';
  var targetLength = upToLength - str.length;
  /* istanbul ignore next */
  while (padding.length < targetLength) {
    padding += padWith;
  }
  return padding;
}

function padLeft(str, padWith, upToLength) {
  var padding = pad(str, padWith, upToLength);
  return padding + str;
}

var MIN_MAGNITUDE = -324; // verified by -Number.MIN_VALUE
var MAGNITUDE_DIGITS = 3; // ditto
var SEP = ''; // set to '_' for easier debugging 

function collate(a, b) {

  if (a === b) {
    return 0;
  }

  a = normalizeKey(a);
  b = normalizeKey(b);

  var ai = collationIndex(a);
  var bi = collationIndex(b);
  if ((ai - bi) !== 0) {
    return ai - bi;
  }
  switch (typeof a) {
    case 'number':
      return a - b;
    case 'boolean':
      return a < b ? -1 : 1;
    case 'string':
      return stringCollate(a, b);
  }
  return Array.isArray(a) ? arrayCollate(a, b) : objectCollate(a, b);
}

// couch considers null/NaN/Infinity/-Infinity === undefined,
// for the purposes of mapreduce indexes. also, dates get stringified.
function normalizeKey(key) {
  switch (typeof key) {
    case 'undefined':
      return null;
    case 'number':
      if (key === Infinity || key === -Infinity || isNaN(key)) {
        return null;
      }
      return key;
    case 'object':
      var origKey = key;
      if (Array.isArray(key)) {
        var len = key.length;
        key = new Array(len);
        for (var i = 0; i < len; i++) {
          key[i] = normalizeKey(origKey[i]);
        }
      /* istanbul ignore next */
      } else if (key instanceof Date) {
        return key.toJSON();
      } else if (key !== null) { // generic object
        key = {};
        for (var k in origKey) {
          if (origKey.hasOwnProperty(k)) {
            var val = origKey[k];
            if (typeof val !== 'undefined') {
              key[k] = normalizeKey(val);
            }
          }
        }
      }
  }
  return key;
}

function indexify(key) {
  if (key !== null) {
    switch (typeof key) {
      case 'boolean':
        return key ? 1 : 0;
      case 'number':
        return numToIndexableString(key);
      case 'string':
        // We've to be sure that key does not contain \u0000
        // Do order-preserving replacements:
        // 0 -> 1, 1
        // 1 -> 1, 2
        // 2 -> 2, 2
        /* eslint-disable no-control-regex */
        return key
          .replace(/\u0002/g, '\u0002\u0002')
          .replace(/\u0001/g, '\u0001\u0002')
          .replace(/\u0000/g, '\u0001\u0001');
        /* eslint-enable no-control-regex */
      case 'object':
        var isArray = Array.isArray(key);
        var arr = isArray ? key : Object.keys(key);
        var i = -1;
        var len = arr.length;
        var result = '';
        if (isArray) {
          while (++i < len) {
            result += toIndexableString(arr[i]);
          }
        } else {
          while (++i < len) {
            var objKey = arr[i];
            result += toIndexableString(objKey) +
                toIndexableString(key[objKey]);
          }
        }
        return result;
    }
  }
  return '';
}

// convert the given key to a string that would be appropriate
// for lexical sorting, e.g. within a database, where the
// sorting is the same given by the collate() function.
function toIndexableString(key) {
  var zero = '\u0000';
  key = normalizeKey(key);
  return collationIndex(key) + SEP + indexify(key) + zero;
}

function parseNumber(str, i) {
  var originalIdx = i;
  var num;
  var zero = str[i] === '1';
  if (zero) {
    num = 0;
    i++;
  } else {
    var neg = str[i] === '0';
    i++;
    var numAsString = '';
    var magAsString = str.substring(i, i + MAGNITUDE_DIGITS);
    var magnitude = parseInt(magAsString, 10) + MIN_MAGNITUDE;
    /* istanbul ignore next */
    if (neg) {
      magnitude = -magnitude;
    }
    i += MAGNITUDE_DIGITS;
    while (true) {
      var ch = str[i];
      if (ch === '\u0000') {
        break;
      } else {
        numAsString += ch;
      }
      i++;
    }
    numAsString = numAsString.split('.');
    if (numAsString.length === 1) {
      num = parseInt(numAsString, 10);
    } else {
      /* istanbul ignore next */
      num = parseFloat(numAsString[0] + '.' + numAsString[1]);
    }
    /* istanbul ignore next */
    if (neg) {
      num = num - 10;
    }
    /* istanbul ignore next */
    if (magnitude !== 0) {
      // parseFloat is more reliable than pow due to rounding errors
      // e.g. Number.MAX_VALUE would return Infinity if we did
      // num * Math.pow(10, magnitude);
      num = parseFloat(num + 'e' + magnitude);
    }
  }
  return {num: num, length : i - originalIdx};
}

// move up the stack while parsing
// this function moved outside of parseIndexableString for performance
function pop(stack, metaStack) {
  var obj = stack.pop();

  if (metaStack.length) {
    var lastMetaElement = metaStack[metaStack.length - 1];
    if (obj === lastMetaElement.element) {
      // popping a meta-element, e.g. an object whose value is another object
      metaStack.pop();
      lastMetaElement = metaStack[metaStack.length - 1];
    }
    var element = lastMetaElement.element;
    var lastElementIndex = lastMetaElement.index;
    if (Array.isArray(element)) {
      element.push(obj);
    } else if (lastElementIndex === stack.length - 2) { // obj with key+value
      var key = stack.pop();
      element[key] = obj;
    } else {
      stack.push(obj); // obj with key only
    }
  }
}

function parseIndexableString(str) {
  var stack = [];
  var metaStack = []; // stack for arrays and objects
  var i = 0;

  /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
  while (true) {
    var collationIndex = str[i++];
    if (collationIndex === '\u0000') {
      if (stack.length === 1) {
        return stack.pop();
      } else {
        pop(stack, metaStack);
        continue;
      }
    }
    switch (collationIndex) {
      case '1':
        stack.push(null);
        break;
      case '2':
        stack.push(str[i] === '1');
        i++;
        break;
      case '3':
        var parsedNum = parseNumber(str, i);
        stack.push(parsedNum.num);
        i += parsedNum.length;
        break;
      case '4':
        var parsedStr = '';
        /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
        while (true) {
          var ch = str[i];
          if (ch === '\u0000') {
            break;
          }
          parsedStr += ch;
          i++;
        }
        // perform the reverse of the order-preserving replacement
        // algorithm (see above)
        /* eslint-disable no-control-regex */
        parsedStr = parsedStr.replace(/\u0001\u0001/g, '\u0000')
          .replace(/\u0001\u0002/g, '\u0001')
          .replace(/\u0002\u0002/g, '\u0002');
        /* eslint-enable no-control-regex */
        stack.push(parsedStr);
        break;
      case '5':
        var arrayElement = { element: [], index: stack.length };
        stack.push(arrayElement.element);
        metaStack.push(arrayElement);
        break;
      case '6':
        var objElement = { element: {}, index: stack.length };
        stack.push(objElement.element);
        metaStack.push(objElement);
        break;
      /* istanbul ignore next */
      default:
        throw new Error(
          'bad collationIndex or unexpectedly reached end of input: ' +
            collationIndex);
    }
  }
}

function arrayCollate(a, b) {
  var len = Math.min(a.length, b.length);
  for (var i = 0; i < len; i++) {
    var sort = collate(a[i], b[i]);
    if (sort !== 0) {
      return sort;
    }
  }
  return (a.length === b.length) ? 0 :
    (a.length > b.length) ? 1 : -1;
}
function stringCollate(a, b) {
  // See: https://github.com/daleharvey/pouchdb/issues/40
  // This is incompatible with the CouchDB implementation, but its the
  // best we can do for now
  return (a === b) ? 0 : ((a > b) ? 1 : -1);
}
function objectCollate(a, b) {
  var ak = Object.keys(a), bk = Object.keys(b);
  var len = Math.min(ak.length, bk.length);
  for (var i = 0; i < len; i++) {
    // First sort the keys
    var sort = collate(ak[i], bk[i]);
    if (sort !== 0) {
      return sort;
    }
    // if the keys are equal sort the values
    sort = collate(a[ak[i]], b[bk[i]]);
    if (sort !== 0) {
      return sort;
    }

  }
  return (ak.length === bk.length) ? 0 :
    (ak.length > bk.length) ? 1 : -1;
}
// The collation is defined by erlangs ordered terms
// the atoms null, true, false come first, then numbers, strings,
// arrays, then objects
// null/undefined/NaN/Infinity/-Infinity are all considered null
function collationIndex(x) {
  var id = ['boolean', 'number', 'string', 'object'];
  var idx = id.indexOf(typeof x);
  //false if -1 otherwise true, but fast!!!!1
  if (~idx) {
    if (x === null) {
      return 1;
    }
    if (Array.isArray(x)) {
      return 5;
    }
    return idx < 3 ? (idx + 2) : (idx + 3);
  }
  /* istanbul ignore next */
  if (Array.isArray(x)) {
    return 5;
  }
}

// conversion:
// x yyy zz...zz
// x = 0 for negative, 1 for 0, 2 for positive
// y = exponent (for negative numbers negated) moved so that it's >= 0
// z = mantisse
function numToIndexableString(num) {

  if (num === 0) {
    return '1';
  }

  // convert number to exponential format for easier and
  // more succinct string sorting
  var expFormat = num.toExponential().split(/e\+?/);
  var magnitude = parseInt(expFormat[1], 10);

  var neg = num < 0;

  var result = neg ? '0' : '2';

  // first sort by magnitude
  // it's easier if all magnitudes are positive
  var magForComparison = ((neg ? -magnitude : magnitude) - MIN_MAGNITUDE);
  var magString = padLeft((magForComparison).toString(), '0', MAGNITUDE_DIGITS);

  result += SEP + magString;

  // then sort by the factor
  var factor = Math.abs(parseFloat(expFormat[0])); // [1..10)
  /* istanbul ignore next */
  if (neg) { // for negative reverse ordering
    factor = 10 - factor;
  }

  var factorStr = factor.toFixed(20);

  // strip zeros from the end
  factorStr = factorStr.replace(/\.?0+$/, '');

  result += SEP + factorStr;

  return result;
}

// create a comparator based on the sort object
function createFieldSorter(sort) {

  function getFieldValuesAsArray(doc) {
    return sort.map(function (sorting) {
      var fieldName = getKey(sorting);
      var parsedField = parseField(fieldName);
      var docFieldValue = getFieldFromDoc(doc, parsedField);
      return docFieldValue;
    });
  }

  return function (aRow, bRow) {
    var aFieldValues = getFieldValuesAsArray(aRow.doc);
    var bFieldValues = getFieldValuesAsArray(bRow.doc);
    var collation = collate(aFieldValues, bFieldValues);
    if (collation !== 0) {
      return collation;
    }
    // this is what mango seems to do
    return compare$1(aRow.doc._id, bRow.doc._id);
  };
}

function filterInMemoryFields(rows, requestDef, inMemoryFields) {
  rows = rows.filter(function (row) {
    return rowFilter(row.doc, requestDef.selector, inMemoryFields);
  });

  if (requestDef.sort) {
    // in-memory sort
    var fieldSorter = createFieldSorter(requestDef.sort);
    rows = rows.sort(fieldSorter);
    if (typeof requestDef.sort[0] !== 'string' &&
        getValue(requestDef.sort[0]) === 'desc') {
      rows = rows.reverse();
    }
  }

  if ('limit' in requestDef || 'skip' in requestDef) {
    // have to do the limit in-memory
    var skip = requestDef.skip || 0;
    var limit = ('limit' in requestDef ? requestDef.limit : rows.length) + skip;
    rows = rows.slice(skip, limit);
  }
  return rows;
}

function rowFilter(doc, selector, inMemoryFields) {
  return inMemoryFields.every(function (field) {
    var matcher = selector[field];
    var parsedField = parseField(field);
    var docFieldValue = getFieldFromDoc(doc, parsedField);
    if (isCombinationalField(field)) {
      return matchCominationalSelector(field, matcher, doc);
    }

    return matchSelector(matcher, doc, parsedField, docFieldValue);
  });
}

function matchSelector(matcher, doc, parsedField, docFieldValue) {
  if (!matcher) {
    // no filtering necessary; this field is just needed for sorting
    return true;
  }

  // is matcher an object, if so continue recursion
  if (typeof matcher === 'object') {
    return Object.keys(matcher).every(function (userOperator) {
      var userValue = matcher[userOperator];
      return match(userOperator, doc, userValue, parsedField, docFieldValue);
    });
  }

  // no more depth, No need to recurse further
  return matcher === docFieldValue;
}

function matchCominationalSelector(field, matcher, doc) {

  if (field === '$or') {
    return matcher.some(function (orMatchers) {
      return rowFilter(doc, orMatchers, Object.keys(orMatchers));
    });
  }

  if (field === '$not') {
    return !rowFilter(doc, matcher, Object.keys(matcher));
  }

  //`$nor`
  return !matcher.find(function (orMatchers) {
    return rowFilter(doc, orMatchers, Object.keys(orMatchers));
  });

}

function match(userOperator, doc, userValue, parsedField, docFieldValue) {
  if (!matchers[userOperator]) {
    throw new Error('unknown operator "' + userOperator +
      '" - should be one of $eq, $lte, $lt, $gt, $gte, $exists, $ne, $in, ' +
      '$nin, $size, $mod, $regex, $elemMatch, $type, $allMatch or $all');
  }
  return matchers[userOperator](doc, userValue, parsedField, docFieldValue);
}

function fieldExists(docFieldValue) {
  return typeof docFieldValue !== 'undefined' && docFieldValue !== null;
}

function fieldIsNotUndefined(docFieldValue) {
  return typeof docFieldValue !== 'undefined';
}

function modField(docFieldValue, userValue) {
  var divisor = userValue[0];
  var mod = userValue[1];
  if (divisor === 0) {
    throw new Error('Bad divisor, cannot divide by zero');
  }

  if (parseInt(divisor, 10) !== divisor ) {
    throw new Error('Divisor is not an integer');
  }

  if (parseInt(mod, 10) !== mod ) {
    throw new Error('Modulus is not an integer');
  }

  if (parseInt(docFieldValue, 10) !== docFieldValue) {
    return false;
  }

  return docFieldValue % divisor === mod;
}

function arrayContainsValue(docFieldValue, userValue) {
  return userValue.some(function (val) {
    if (docFieldValue instanceof Array) {
      return docFieldValue.indexOf(val) > -1;
    }

    return docFieldValue === val;
  });
}

function arrayContainsAllValues(docFieldValue, userValue) {
  return userValue.every(function (val) {
    return docFieldValue.indexOf(val) > -1;
  });
}

function arraySize(docFieldValue, userValue) {
  return docFieldValue.length === userValue;
}

function regexMatch(docFieldValue, userValue) {
  var re = new RegExp(userValue);

  return re.test(docFieldValue);
}

function typeMatch(docFieldValue, userValue) {

  switch (userValue) {
    case 'null':
      return docFieldValue === null;
    case 'boolean':
      return typeof (docFieldValue) === 'boolean';
    case 'number':
      return typeof (docFieldValue) === 'number';
    case 'string':
      return typeof (docFieldValue) === 'string';
    case 'array':
      return docFieldValue instanceof Array;
    case 'object':
      return ({}).toString.call(docFieldValue) === '[object Object]';
  }

  throw new Error(userValue + ' not supported as a type.' +
                  'Please use one of object, string, array, number, boolean or null.');

}

var matchers = {

  '$elemMatch': function (doc, userValue, parsedField, docFieldValue) {
    if (!Array.isArray(docFieldValue)) {
      return false;
    }

    if (docFieldValue.length === 0) {
      return false;
    }

    if (typeof docFieldValue[0] === 'object') {
      return docFieldValue.some(function (val) {
        return rowFilter(val, userValue, Object.keys(userValue));
      });
    }

    return docFieldValue.some(function (val) {
      return matchSelector(userValue, doc, parsedField, val);
    });
  },

  '$allMatch': function (doc, userValue, parsedField, docFieldValue) {
    if (!Array.isArray(docFieldValue)) {
      return false;
    }

    /* istanbul ignore next */
    if (docFieldValue.length === 0) {
      return false;
    }

    if (typeof docFieldValue[0] === 'object') {
      return docFieldValue.every(function (val) {
        return rowFilter(val, userValue, Object.keys(userValue));
      });
    }

    return docFieldValue.every(function (val) {
      return matchSelector(userValue, doc, parsedField, val);
    });
  },

  '$eq': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) === 0;
  },

  '$gte': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) >= 0;
  },

  '$gt': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) > 0;
  },

  '$lte': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) <= 0;
  },

  '$lt': function (doc, userValue, parsedField, docFieldValue) {
    return fieldIsNotUndefined(docFieldValue) && collate(docFieldValue, userValue) < 0;
  },

  '$exists': function (doc, userValue, parsedField, docFieldValue) {
    //a field that is null is still considered to exist
    if (userValue) {
      return fieldIsNotUndefined(docFieldValue);
    }

    return !fieldIsNotUndefined(docFieldValue);
  },

  '$mod': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && modField(docFieldValue, userValue);
  },

  '$ne': function (doc, userValue, parsedField, docFieldValue) {
    return userValue.every(function (neValue) {
      return collate(docFieldValue, neValue) !== 0;
    });
  },
  '$in': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && arrayContainsValue(docFieldValue, userValue);
  },

  '$nin': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && !arrayContainsValue(docFieldValue, userValue);
  },

  '$size': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && arraySize(docFieldValue, userValue);
  },

  '$all': function (doc, userValue, parsedField, docFieldValue) {
    return Array.isArray(docFieldValue) && arrayContainsAllValues(docFieldValue, userValue);
  },

  '$regex': function (doc, userValue, parsedField, docFieldValue) {
    return fieldExists(docFieldValue) && regexMatch(docFieldValue, userValue);
  },

  '$type': function (doc, userValue, parsedField, docFieldValue) {
    return typeMatch(docFieldValue, userValue);
  }
};

// return true if the given doc matches the supplied selector
function matchesSelector(doc, selector) {
  /* istanbul ignore if */
  if (typeof selector !== 'object') {
    // match the CouchDB error message
    throw new Error('Selector error: expected a JSON object');
  }

  selector = massageSelector(selector);
  var row = {
    'doc': doc
  };

  var rowsMatched = filterInMemoryFields([row], { 'selector': selector }, Object.keys(selector));
  return rowsMatched && rowsMatched.length === 1;
}

function evalFilter(input) {
  return scopeEval('"use strict";\nreturn ' + input + ';', {});
}

function evalView(input) {
  var code = [
    'return function(doc) {',
    '  "use strict";',
    '  var emitted = false;',
    '  var emit = function (a, b) {',
    '    emitted = true;',
    '  };',
    '  var view = ' + input + ';',
    '  view(doc);',
    '  if (emitted) {',
    '    return true;',
    '  }',
    '};'
  ].join('\n');

  return scopeEval(code, {});
}

function validate(opts, callback) {
  if (opts.selector) {
    if (opts.filter && opts.filter !== '_selector') {
      var filterName = typeof opts.filter === 'string' ?
        opts.filter : 'function';
      return callback(new Error('selector invalid for filter "' + filterName + '"'));
    }
  }
  callback();
}

function normalize(opts) {
  if (opts.view && !opts.filter) {
    opts.filter = '_view';
  }

  if (opts.selector && !opts.filter) {
    opts.filter = '_selector';
  }

  if (opts.filter && typeof opts.filter === 'string') {
    if (opts.filter === '_view') {
      opts.view = normalizeDesignDocFunctionName(opts.view);
    } else {
      opts.filter = normalizeDesignDocFunctionName(opts.filter);
    }
  }
}

function shouldFilter(changesHandler, opts) {
  return opts.filter && typeof opts.filter === 'string' &&
    !opts.doc_ids && !isRemote(changesHandler.db);
}

function filter(changesHandler, opts) {
  var callback = opts.complete;
  if (opts.filter === '_view') {
    if (!opts.view || typeof opts.view !== 'string') {
      var err = createError(BAD_REQUEST,
        '`view` filter parameter not found or invalid.');
      return callback(err);
    }
    // fetch a view from a design doc, make it behave like a filter
    var viewName = parseDesignDocFunctionName(opts.view);
    changesHandler.db.get('_design/' + viewName[0], function (err, ddoc) {
      /* istanbul ignore if */
      if (changesHandler.isCancelled) {
        return callback(null, {status: 'cancelled'});
      }
      /* istanbul ignore next */
      if (err) {
        return callback(generateErrorFromResponse(err));
      }
      var mapFun = ddoc && ddoc.views && ddoc.views[viewName[1]] &&
        ddoc.views[viewName[1]].map;
      if (!mapFun) {
        return callback(createError(MISSING_DOC,
          (ddoc.views ? 'missing json key: ' + viewName[1] :
            'missing json key: views')));
      }
      opts.filter = evalView(mapFun);
      changesHandler.doChanges(opts);
    });
  } else if (opts.selector) {
    opts.filter = function (doc) {
      return matchesSelector(doc, opts.selector);
    };
    changesHandler.doChanges(opts);
  } else {
    // fetch a filter from a design doc
    var filterName = parseDesignDocFunctionName(opts.filter);
    changesHandler.db.get('_design/' + filterName[0], function (err, ddoc) {
      /* istanbul ignore if */
      if (changesHandler.isCancelled) {
        return callback(null, {status: 'cancelled'});
      }
      /* istanbul ignore next */
      if (err) {
        return callback(generateErrorFromResponse(err));
      }
      var filterFun = ddoc && ddoc.filters && ddoc.filters[filterName[1]];
      if (!filterFun) {
        return callback(createError(MISSING_DOC,
          ((ddoc && ddoc.filters) ? 'missing json key: ' + filterName[1]
            : 'missing json key: filters')));
      }
      opts.filter = evalFilter(filterFun);
      changesHandler.doChanges(opts);
    });
  }
}

function applyChangesFilterPlugin(PouchDB) {
  PouchDB._changesFilterPlugin = {
    validate: validate,
    normalize: normalize,
    shouldFilter: shouldFilter,
    filter: filter
  };
}

// TODO: remove from pouchdb-core (breaking)
PouchDB.plugin(applyChangesFilterPlugin);

PouchDB.version = version;

function toObject(array) {
  return array.reduce(function (obj, item) {
    obj[item] = true;
    return obj;
  }, {});
}
// List of top level reserved words for doc
var reservedWords = toObject([
  '_id',
  '_rev',
  '_attachments',
  '_deleted',
  '_revisions',
  '_revs_info',
  '_conflicts',
  '_deleted_conflicts',
  '_local_seq',
  '_rev_tree',
  //replication documents
  '_replication_id',
  '_replication_state',
  '_replication_state_time',
  '_replication_state_reason',
  '_replication_stats',
  // Specific to Couchbase Sync Gateway
  '_removed'
]);

// List of reserved words that should end up the document
var dataWords = toObject([
  '_attachments',
  //replication documents
  '_replication_id',
  '_replication_state',
  '_replication_state_time',
  '_replication_state_reason',
  '_replication_stats'
]);

function parseRevisionInfo(rev$$1) {
  if (!/^\d+-/.test(rev$$1)) {
    return createError(INVALID_REV);
  }
  var idx = rev$$1.indexOf('-');
  var left = rev$$1.substring(0, idx);
  var right = rev$$1.substring(idx + 1);
  return {
    prefix: parseInt(left, 10),
    id: right
  };
}

function makeRevTreeFromRevisions(revisions, opts) {
  var pos = revisions.start - revisions.ids.length + 1;

  var revisionIds = revisions.ids;
  var ids = [revisionIds[0], opts, []];

  for (var i = 1, len = revisionIds.length; i < len; i++) {
    ids = [revisionIds[i], {status: 'missing'}, [ids]];
  }

  return [{
    pos: pos,
    ids: ids
  }];
}

// Preprocess documents, parse their revisions, assign an id and a
// revision for new writes that are missing them, etc
function parseDoc(doc, newEdits, dbOpts) {
  if (!dbOpts) {
    dbOpts = {
      deterministic_revs: true
    };
  }

  var nRevNum;
  var newRevId;
  var revInfo;
  var opts = {status: 'available'};
  if (doc._deleted) {
    opts.deleted = true;
  }

  if (newEdits) {
    if (!doc._id) {
      doc._id = uuid();
    }
    newRevId = rev(doc, dbOpts.deterministic_revs);
    if (doc._rev) {
      revInfo = parseRevisionInfo(doc._rev);
      if (revInfo.error) {
        return revInfo;
      }
      doc._rev_tree = [{
        pos: revInfo.prefix,
        ids: [revInfo.id, {status: 'missing'}, [[newRevId, opts, []]]]
      }];
      nRevNum = revInfo.prefix + 1;
    } else {
      doc._rev_tree = [{
        pos: 1,
        ids : [newRevId, opts, []]
      }];
      nRevNum = 1;
    }
  } else {
    if (doc._revisions) {
      doc._rev_tree = makeRevTreeFromRevisions(doc._revisions, opts);
      nRevNum = doc._revisions.start;
      newRevId = doc._revisions.ids[0];
    }
    if (!doc._rev_tree) {
      revInfo = parseRevisionInfo(doc._rev);
      if (revInfo.error) {
        return revInfo;
      }
      nRevNum = revInfo.prefix;
      newRevId = revInfo.id;
      doc._rev_tree = [{
        pos: nRevNum,
        ids: [newRevId, opts, []]
      }];
    }
  }

  invalidIdError(doc._id);

  doc._rev = nRevNum + '-' + newRevId;

  var result = {metadata : {}, data : {}};
  for (var key in doc) {
    /* istanbul ignore else */
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      var specialKey = key[0] === '_';
      if (specialKey && !reservedWords[key]) {
        var error = createError(DOC_VALIDATION, key);
        error.message = DOC_VALIDATION.message + ': ' + key;
        throw error;
      } else if (specialKey && !dataWords[key]) {
        result.metadata[key.slice(1)] = doc[key];
      } else {
        result.data[key] = doc[key];
      }
    }
  }
  return result;
}

function parseBase64(data) {
  try {
    return thisAtob(data);
  } catch (e) {
    var err = createError(BAD_ARG,
      'Attachment is not a valid base64 string');
    return {error: err};
  }
}

function preprocessString(att, blobType, callback) {
  var asBinary = parseBase64(att.data);
  if (asBinary.error) {
    return callback(asBinary.error);
  }

  att.length = asBinary.length;
  if (blobType === 'blob') {
    att.data = binStringToBluffer(asBinary, att.content_type);
  } else if (blobType === 'base64') {
    att.data = thisBtoa(asBinary);
  } else { // binary
    att.data = asBinary;
  }
  binaryMd5(asBinary, function (result) {
    att.digest = 'md5-' + result;
    callback();
  });
}

function preprocessBlob(att, blobType, callback) {
  binaryMd5(att.data, function (md5) {
    att.digest = 'md5-' + md5;
    // size is for blobs (browser), length is for buffers (node)
    att.length = att.data.size || att.data.length || 0;
    if (blobType === 'binary') {
      blobToBinaryString(att.data, function (binString) {
        att.data = binString;
        callback();
      });
    } else if (blobType === 'base64') {
      blobToBase64(att.data, function (b64) {
        att.data = b64;
        callback();
      });
    } else {
      callback();
    }
  });
}

function preprocessAttachment(att, blobType, callback) {
  if (att.stub) {
    return callback();
  }
  if (typeof att.data === 'string') { // input is a base64 string
    preprocessString(att, blobType, callback);
  } else { // input is a blob
    preprocessBlob(att, blobType, callback);
  }
}

function preprocessAttachments(docInfos, blobType, callback) {

  if (!docInfos.length) {
    return callback();
  }

  var docv = 0;
  var overallErr;

  docInfos.forEach(function (docInfo) {
    var attachments = docInfo.data && docInfo.data._attachments ?
      Object.keys(docInfo.data._attachments) : [];
    var recv = 0;

    if (!attachments.length) {
      return done();
    }

    function processedAttachment(err) {
      overallErr = err;
      recv++;
      if (recv === attachments.length) {
        done();
      }
    }

    for (var key in docInfo.data._attachments) {
      if (docInfo.data._attachments.hasOwnProperty(key)) {
        preprocessAttachment(docInfo.data._attachments[key],
          blobType, processedAttachment);
      }
    }
  });

  function done() {
    docv++;
    if (docInfos.length === docv) {
      if (overallErr) {
        callback(overallErr);
      } else {
        callback();
      }
    }
  }
}

function updateDoc(revLimit, prev, docInfo, results,
                   i, cb, writeDoc, newEdits) {

  if (revExists(prev.rev_tree, docInfo.metadata.rev) && !newEdits) {
    results[i] = docInfo;
    return cb();
  }

  // sometimes this is pre-calculated. historically not always
  var previousWinningRev = prev.winningRev || winningRev(prev);
  var previouslyDeleted = 'deleted' in prev ? prev.deleted :
    isDeleted(prev, previousWinningRev);
  var deleted = 'deleted' in docInfo.metadata ? docInfo.metadata.deleted :
    isDeleted(docInfo.metadata);
  var isRoot = /^1-/.test(docInfo.metadata.rev);

  if (previouslyDeleted && !deleted && newEdits && isRoot) {
    var newDoc = docInfo.data;
    newDoc._rev = previousWinningRev;
    newDoc._id = docInfo.metadata.id;
    docInfo = parseDoc(newDoc, newEdits);
  }

  var merged = merge(prev.rev_tree, docInfo.metadata.rev_tree[0], revLimit);

  var inConflict = newEdits && ((
    (previouslyDeleted && deleted && merged.conflicts !== 'new_leaf') ||
    (!previouslyDeleted && merged.conflicts !== 'new_leaf') ||
    (previouslyDeleted && !deleted && merged.conflicts === 'new_branch')));

  if (inConflict) {
    var err = createError(REV_CONFLICT);
    results[i] = err;
    return cb();
  }

  var newRev = docInfo.metadata.rev;
  docInfo.metadata.rev_tree = merged.tree;
  docInfo.stemmedRevs = merged.stemmedRevs || [];
  /* istanbul ignore else */
  if (prev.rev_map) {
    docInfo.metadata.rev_map = prev.rev_map; // used only by leveldb
  }

  // recalculate
  var winningRev$$1 = winningRev(docInfo.metadata);
  var winningRevIsDeleted = isDeleted(docInfo.metadata, winningRev$$1);

  // calculate the total number of documents that were added/removed,
  // from the perspective of total_rows/doc_count
  var delta = (previouslyDeleted === winningRevIsDeleted) ? 0 :
    previouslyDeleted < winningRevIsDeleted ? -1 : 1;

  var newRevIsDeleted;
  if (newRev === winningRev$$1) {
    // if the new rev is the same as the winning rev, we can reuse that value
    newRevIsDeleted = winningRevIsDeleted;
  } else {
    // if they're not the same, then we need to recalculate
    newRevIsDeleted = isDeleted(docInfo.metadata, newRev);
  }

  writeDoc(docInfo, winningRev$$1, winningRevIsDeleted, newRevIsDeleted,
    true, delta, i, cb);
}

function rootIsMissing(docInfo) {
  return docInfo.metadata.rev_tree[0].ids[1].status === 'missing';
}

function processDocs(revLimit, docInfos, api, fetchedDocs, tx, results,
                     writeDoc, opts, overallCallback) {

  // Default to 1000 locally
  revLimit = revLimit || 1000;

  function insertDoc(docInfo, resultsIdx, callback) {
    // Cant insert new deleted documents
    var winningRev$$1 = winningRev(docInfo.metadata);
    var deleted = isDeleted(docInfo.metadata, winningRev$$1);
    if ('was_delete' in opts && deleted) {
      results[resultsIdx] = createError(MISSING_DOC, 'deleted');
      return callback();
    }

    // 4712 - detect whether a new document was inserted with a _rev
    var inConflict = newEdits && rootIsMissing(docInfo);

    if (inConflict) {
      var err = createError(REV_CONFLICT);
      results[resultsIdx] = err;
      return callback();
    }

    var delta = deleted ? 0 : 1;

    writeDoc(docInfo, winningRev$$1, deleted, deleted, false,
      delta, resultsIdx, callback);
  }

  var newEdits = opts.new_edits;
  var idsToDocs = new ExportedMap();

  var docsDone = 0;
  var docsToDo = docInfos.length;

  function checkAllDocsDone() {
    if (++docsDone === docsToDo && overallCallback) {
      overallCallback();
    }
  }

  docInfos.forEach(function (currentDoc, resultsIdx) {

    if (currentDoc._id && isLocalId(currentDoc._id)) {
      var fun = currentDoc._deleted ? '_removeLocal' : '_putLocal';
      api[fun](currentDoc, {ctx: tx}, function (err, res) {
        results[resultsIdx] = err || res;
        checkAllDocsDone();
      });
      return;
    }

    var id = currentDoc.metadata.id;
    if (idsToDocs.has(id)) {
      docsToDo--; // duplicate
      idsToDocs.get(id).push([currentDoc, resultsIdx]);
    } else {
      idsToDocs.set(id, [[currentDoc, resultsIdx]]);
    }
  });

  // in the case of new_edits, the user can provide multiple docs
  // with the same id. these need to be processed sequentially
  idsToDocs.forEach(function (docs, id) {
    var numDone = 0;

    function docWritten() {
      if (++numDone < docs.length) {
        nextDoc();
      } else {
        checkAllDocsDone();
      }
    }
    function nextDoc() {
      var value = docs[numDone];
      var currentDoc = value[0];
      var resultsIdx = value[1];

      if (fetchedDocs.has(id)) {
        updateDoc(revLimit, fetchedDocs.get(id), currentDoc, results,
          resultsIdx, docWritten, writeDoc, newEdits);
      } else {
        // Ensure stemming applies to new writes as well
        var merged = merge([], currentDoc.metadata.rev_tree[0], revLimit);
        currentDoc.metadata.rev_tree = merged.tree;
        currentDoc.stemmedRevs = merged.stemmedRevs || [];
        insertDoc(currentDoc, resultsIdx, docWritten);
      }
    }
    nextDoc();
  });
}

// IndexedDB requires a versioned database structure, so we use the
// version here to manage migrations.
var ADAPTER_VERSION = 5;

// The object stores created for each database
// DOC_STORE stores the document meta data, its revision history and state
// Keyed by document id
var DOC_STORE = 'document-store';
// BY_SEQ_STORE stores a particular version of a document, keyed by its
// sequence id
var BY_SEQ_STORE = 'by-sequence';
// Where we store attachments
var ATTACH_STORE = 'attach-store';
// Where we store many-to-many relations
// between attachment digests and seqs
var ATTACH_AND_SEQ_STORE = 'attach-seq-store';

// Where we store database-wide meta data in a single record
// keyed by id: META_STORE
var META_STORE = 'meta-store';
// Where we store local documents
var LOCAL_STORE = 'local-store';
// Where we detect blob support
var DETECT_BLOB_SUPPORT_STORE = 'detect-blob-support';

function safeJsonParse(str) {
  // This try/catch guards against stack overflow errors.
  // JSON.parse() is faster than vuvuzela.parse() but vuvuzela
  // cannot overflow.
  try {
    return JSON.parse(str);
  } catch (e) {
    /* istanbul ignore next */
    return vuvuzela.parse(str);
  }
}

function safeJsonStringify(json) {
  try {
    return JSON.stringify(json);
  } catch (e) {
    /* istanbul ignore next */
    return vuvuzela.stringify(json);
  }
}

function idbError(callback) {
  return function (evt) {
    var message = 'unknown_error';
    if (evt.target && evt.target.error) {
      message = evt.target.error.name || evt.target.error.message;
    }
    callback(createError(IDB_ERROR, message, evt.type));
  };
}

// Unfortunately, the metadata has to be stringified
// when it is put into the database, because otherwise
// IndexedDB can throw errors for deeply-nested objects.
// Originally we just used JSON.parse/JSON.stringify; now
// we use this custom vuvuzela library that avoids recursion.
// If we could do it all over again, we'd probably use a
// format for the revision trees other than JSON.
function encodeMetadata(metadata, winningRev, deleted) {
  return {
    data: safeJsonStringify(metadata),
    winningRev: winningRev,
    deletedOrLocal: deleted ? '1' : '0',
    seq: metadata.seq, // highest seq for this doc
    id: metadata.id
  };
}

function decodeMetadata(storedObject) {
  if (!storedObject) {
    return null;
  }
  var metadata = safeJsonParse(storedObject.data);
  metadata.winningRev = storedObject.winningRev;
  metadata.deleted = storedObject.deletedOrLocal === '1';
  metadata.seq = storedObject.seq;
  return metadata;
}

// read the doc back out from the database. we don't store the
// _id or _rev because we already have _doc_id_rev.
function decodeDoc(doc) {
  if (!doc) {
    return doc;
  }
  var idx = doc._doc_id_rev.lastIndexOf(':');
  doc._id = doc._doc_id_rev.substring(0, idx - 1);
  doc._rev = doc._doc_id_rev.substring(idx + 1);
  delete doc._doc_id_rev;
  return doc;
}

// Read a blob from the database, encoding as necessary
// and translating from base64 if the IDB doesn't support
// native Blobs
function readBlobData(body, type, asBlob, callback) {
  if (asBlob) {
    if (!body) {
      callback(createBlob([''], {type: type}));
    } else if (typeof body !== 'string') { // we have blob support
      callback(body);
    } else { // no blob support
      callback(b64ToBluffer(body, type));
    }
  } else { // as base64 string
    if (!body) {
      callback('');
    } else if (typeof body !== 'string') { // we have blob support
      readAsBinaryString(body, function (binary) {
        callback(thisBtoa(binary));
      });
    } else { // no blob support
      callback(body);
    }
  }
}

function fetchAttachmentsIfNecessary(doc, opts, txn, cb) {
  var attachments = Object.keys(doc._attachments || {});
  if (!attachments.length) {
    return cb && cb();
  }
  var numDone = 0;

  function checkDone() {
    if (++numDone === attachments.length && cb) {
      cb();
    }
  }

  function fetchAttachment(doc, att) {
    var attObj = doc._attachments[att];
    var digest = attObj.digest;
    var req = txn.objectStore(ATTACH_STORE).get(digest);
    req.onsuccess = function (e) {
      attObj.body = e.target.result.body;
      checkDone();
    };
  }

  attachments.forEach(function (att) {
    if (opts.attachments && opts.include_docs) {
      fetchAttachment(doc, att);
    } else {
      doc._attachments[att].stub = true;
      checkDone();
    }
  });
}

// IDB-specific postprocessing necessary because
// we don't know whether we stored a true Blob or
// a base64-encoded string, and if it's a Blob it
// needs to be read outside of the transaction context
function postProcessAttachments(results, asBlob) {
  return Promise.all(results.map(function (row) {
    if (row.doc && row.doc._attachments) {
      var attNames = Object.keys(row.doc._attachments);
      return Promise.all(attNames.map(function (att) {
        var attObj = row.doc._attachments[att];
        if (!('body' in attObj)) { // already processed
          return;
        }
        var body = attObj.body;
        var type = attObj.content_type;
        return new Promise(function (resolve) {
          readBlobData(body, type, asBlob, function (data) {
            row.doc._attachments[att] = $inject_Object_assign(
              pick(attObj, ['digest', 'content_type']),
              {data: data}
            );
            resolve();
          });
        });
      }));
    }
  }));
}

function compactRevs(revs, docId, txn) {

  var possiblyOrphanedDigests = [];
  var seqStore = txn.objectStore(BY_SEQ_STORE);
  var attStore = txn.objectStore(ATTACH_STORE);
  var attAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);
  var count = revs.length;

  function checkDone() {
    count--;
    if (!count) { // done processing all revs
      deleteOrphanedAttachments();
    }
  }

  function deleteOrphanedAttachments() {
    if (!possiblyOrphanedDigests.length) {
      return;
    }
    possiblyOrphanedDigests.forEach(function (digest) {
      var countReq = attAndSeqStore.index('digestSeq').count(
        IDBKeyRange.bound(
          digest + '::', digest + '::\uffff', false, false));
      countReq.onsuccess = function (e) {
        var count = e.target.result;
        if (!count) {
          // orphaned
          attStore.delete(digest);
        }
      };
    });
  }

  revs.forEach(function (rev$$1) {
    var index = seqStore.index('_doc_id_rev');
    var key = docId + "::" + rev$$1;
    index.getKey(key).onsuccess = function (e) {
      var seq = e.target.result;
      if (typeof seq !== 'number') {
        return checkDone();
      }
      seqStore.delete(seq);

      var cursor = attAndSeqStore.index('seq')
        .openCursor(IDBKeyRange.only(seq));

      cursor.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          var digest = cursor.value.digestSeq.split('::')[0];
          possiblyOrphanedDigests.push(digest);
          attAndSeqStore.delete(cursor.primaryKey);
          cursor.continue();
        } else { // done
          checkDone();
        }
      };
    };
  });
}

function openTransactionSafely(idb, stores, mode) {
  try {
    return {
      txn: idb.transaction(stores, mode)
    };
  } catch (err) {
    return {
      error: err
    };
  }
}

var changesHandler = new Changes();

function idbBulkDocs(dbOpts, req, opts, api, idb, callback) {
  var docInfos = req.docs;
  var txn;
  var docStore;
  var bySeqStore;
  var attachStore;
  var attachAndSeqStore;
  var metaStore;
  var docInfoError;
  var metaDoc;

  for (var i = 0, len = docInfos.length; i < len; i++) {
    var doc = docInfos[i];
    if (doc._id && isLocalId(doc._id)) {
      continue;
    }
    doc = docInfos[i] = parseDoc(doc, opts.new_edits, dbOpts);
    if (doc.error && !docInfoError) {
      docInfoError = doc;
    }
  }

  if (docInfoError) {
    return callback(docInfoError);
  }

  var allDocsProcessed = false;
  var docCountDelta = 0;
  var results = new Array(docInfos.length);
  var fetchedDocs = new ExportedMap();
  var preconditionErrored = false;
  var blobType = api._meta.blobSupport ? 'blob' : 'base64';

  preprocessAttachments(docInfos, blobType, function (err) {
    if (err) {
      return callback(err);
    }
    startTransaction();
  });

  function startTransaction() {

    var stores = [
      DOC_STORE, BY_SEQ_STORE,
      ATTACH_STORE,
      LOCAL_STORE, ATTACH_AND_SEQ_STORE,
      META_STORE
    ];
    var txnResult = openTransactionSafely(idb, stores, 'readwrite');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    txn = txnResult.txn;
    txn.onabort = idbError(callback);
    txn.ontimeout = idbError(callback);
    txn.oncomplete = complete;
    docStore = txn.objectStore(DOC_STORE);
    bySeqStore = txn.objectStore(BY_SEQ_STORE);
    attachStore = txn.objectStore(ATTACH_STORE);
    attachAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);
    metaStore = txn.objectStore(META_STORE);

    metaStore.get(META_STORE).onsuccess = function (e) {
      metaDoc = e.target.result;
      updateDocCountIfReady();
    };

    verifyAttachments(function (err) {
      if (err) {
        preconditionErrored = true;
        return callback(err);
      }
      fetchExistingDocs();
    });
  }

  function onAllDocsProcessed() {
    allDocsProcessed = true;
    updateDocCountIfReady();
  }

  function idbProcessDocs() {
    processDocs(dbOpts.revs_limit, docInfos, api, fetchedDocs,
                txn, results, writeDoc, opts, onAllDocsProcessed);
  }

  function updateDocCountIfReady() {
    if (!metaDoc || !allDocsProcessed) {
      return;
    }
    // caching the docCount saves a lot of time in allDocs() and
    // info(), which is why we go to all the trouble of doing this
    metaDoc.docCount += docCountDelta;
    metaStore.put(metaDoc);
  }

  function fetchExistingDocs() {

    if (!docInfos.length) {
      return;
    }

    var numFetched = 0;

    function checkDone() {
      if (++numFetched === docInfos.length) {
        idbProcessDocs();
      }
    }

    function readMetadata(event) {
      var metadata = decodeMetadata(event.target.result);

      if (metadata) {
        fetchedDocs.set(metadata.id, metadata);
      }
      checkDone();
    }

    for (var i = 0, len = docInfos.length; i < len; i++) {
      var docInfo = docInfos[i];
      if (docInfo._id && isLocalId(docInfo._id)) {
        checkDone(); // skip local docs
        continue;
      }
      var req = docStore.get(docInfo.metadata.id);
      req.onsuccess = readMetadata;
    }
  }

  function complete() {
    if (preconditionErrored) {
      return;
    }

    changesHandler.notify(api._meta.name);
    callback(null, results);
  }

  function verifyAttachment(digest, callback) {

    var req = attachStore.get(digest);
    req.onsuccess = function (e) {
      if (!e.target.result) {
        var err = createError(MISSING_STUB,
          'unknown stub attachment with digest ' +
          digest);
        err.status = 412;
        callback(err);
      } else {
        callback();
      }
    };
  }

  function verifyAttachments(finish) {


    var digests = [];
    docInfos.forEach(function (docInfo) {
      if (docInfo.data && docInfo.data._attachments) {
        Object.keys(docInfo.data._attachments).forEach(function (filename) {
          var att = docInfo.data._attachments[filename];
          if (att.stub) {
            digests.push(att.digest);
          }
        });
      }
    });
    if (!digests.length) {
      return finish();
    }
    var numDone = 0;
    var err;

    function checkDone() {
      if (++numDone === digests.length) {
        finish(err);
      }
    }
    digests.forEach(function (digest) {
      verifyAttachment(digest, function (attErr) {
        if (attErr && !err) {
          err = attErr;
        }
        checkDone();
      });
    });
  }

  function writeDoc(docInfo, winningRev$$1, winningRevIsDeleted, newRevIsDeleted,
                    isUpdate, delta, resultsIdx, callback) {

    docInfo.metadata.winningRev = winningRev$$1;
    docInfo.metadata.deleted = winningRevIsDeleted;

    var doc = docInfo.data;
    doc._id = docInfo.metadata.id;
    doc._rev = docInfo.metadata.rev;

    if (newRevIsDeleted) {
      doc._deleted = true;
    }

    var hasAttachments = doc._attachments &&
      Object.keys(doc._attachments).length;
    if (hasAttachments) {
      return writeAttachments(docInfo, winningRev$$1, winningRevIsDeleted,
        isUpdate, resultsIdx, callback);
    }

    docCountDelta += delta;
    updateDocCountIfReady();

    finishDoc(docInfo, winningRev$$1, winningRevIsDeleted,
      isUpdate, resultsIdx, callback);
  }

  function finishDoc(docInfo, winningRev$$1, winningRevIsDeleted,
                     isUpdate, resultsIdx, callback) {

    var doc = docInfo.data;
    var metadata = docInfo.metadata;

    doc._doc_id_rev = metadata.id + '::' + metadata.rev;
    delete doc._id;
    delete doc._rev;

    function afterPutDoc(e) {
      var revsToDelete = docInfo.stemmedRevs || [];

      if (isUpdate && api.auto_compaction) {
        revsToDelete = revsToDelete.concat(compactTree(docInfo.metadata));
      }

      if (revsToDelete && revsToDelete.length) {
        compactRevs(revsToDelete, docInfo.metadata.id, txn);
      }

      metadata.seq = e.target.result;
      // Current _rev is calculated from _rev_tree on read
      // delete metadata.rev;
      var metadataToStore = encodeMetadata(metadata, winningRev$$1,
        winningRevIsDeleted);
      var metaDataReq = docStore.put(metadataToStore);
      metaDataReq.onsuccess = afterPutMetadata;
    }

    function afterPutDocError(e) {
      // ConstraintError, need to update, not put (see #1638 for details)
      e.preventDefault(); // avoid transaction abort
      e.stopPropagation(); // avoid transaction onerror
      var index = bySeqStore.index('_doc_id_rev');
      var getKeyReq = index.getKey(doc._doc_id_rev);
      getKeyReq.onsuccess = function (e) {
        var putReq = bySeqStore.put(doc, e.target.result);
        putReq.onsuccess = afterPutDoc;
      };
    }

    function afterPutMetadata() {
      results[resultsIdx] = {
        ok: true,
        id: metadata.id,
        rev: metadata.rev
      };
      fetchedDocs.set(docInfo.metadata.id, docInfo.metadata);
      insertAttachmentMappings(docInfo, metadata.seq, callback);
    }

    var putReq = bySeqStore.put(doc);

    putReq.onsuccess = afterPutDoc;
    putReq.onerror = afterPutDocError;
  }

  function writeAttachments(docInfo, winningRev$$1, winningRevIsDeleted,
                            isUpdate, resultsIdx, callback) {


    var doc = docInfo.data;

    var numDone = 0;
    var attachments = Object.keys(doc._attachments);

    function collectResults() {
      if (numDone === attachments.length) {
        finishDoc(docInfo, winningRev$$1, winningRevIsDeleted,
          isUpdate, resultsIdx, callback);
      }
    }

    function attachmentSaved() {
      numDone++;
      collectResults();
    }

    attachments.forEach(function (key) {
      var att = docInfo.data._attachments[key];
      if (!att.stub) {
        var data = att.data;
        delete att.data;
        att.revpos = parseInt(winningRev$$1, 10);
        var digest = att.digest;
        saveAttachment(digest, data, attachmentSaved);
      } else {
        numDone++;
        collectResults();
      }
    });
  }

  // map seqs to attachment digests, which
  // we will need later during compaction
  function insertAttachmentMappings(docInfo, seq, callback) {

    var attsAdded = 0;
    var attsToAdd = Object.keys(docInfo.data._attachments || {});

    if (!attsToAdd.length) {
      return callback();
    }

    function checkDone() {
      if (++attsAdded === attsToAdd.length) {
        callback();
      }
    }

    function add(att) {
      var digest = docInfo.data._attachments[att].digest;
      var req = attachAndSeqStore.put({
        seq: seq,
        digestSeq: digest + '::' + seq
      });

      req.onsuccess = checkDone;
      req.onerror = function (e) {
        // this callback is for a constaint error, which we ignore
        // because this docid/rev has already been associated with
        // the digest (e.g. when new_edits == false)
        e.preventDefault(); // avoid transaction abort
        e.stopPropagation(); // avoid transaction onerror
        checkDone();
      };
    }
    for (var i = 0; i < attsToAdd.length; i++) {
      add(attsToAdd[i]); // do in parallel
    }
  }

  function saveAttachment(digest, data, callback) {


    var getKeyReq = attachStore.count(digest);
    getKeyReq.onsuccess = function (e) {
      var count = e.target.result;
      if (count) {
        return callback(); // already exists
      }
      var newAtt = {
        digest: digest,
        body: data
      };
      var putReq = attachStore.put(newAtt);
      putReq.onsuccess = callback;
    };
  }
}

// Abstraction over IDBCursor and getAll()/getAllKeys() that allows us to batch our operations
// while falling back to a normal IDBCursor operation on browsers that don't support getAll() or
// getAllKeys(). This allows for a much faster implementation than just straight-up cursors, because
// we're not processing each document one-at-a-time.
function runBatchedCursor(objectStore, keyRange, descending, batchSize, onBatch) {

  if (batchSize === -1) {
    batchSize = 1000;
  }

  // Bail out of getAll()/getAllKeys() in the following cases:
  // 1) either method is unsupported - we need both
  // 2) batchSize is 1 (might as well use IDBCursor)
  // 3) descending – no real way to do this via getAll()/getAllKeys()

  var useGetAll = typeof objectStore.getAll === 'function' &&
    typeof objectStore.getAllKeys === 'function' &&
    batchSize > 1 && !descending;

  var keysBatch;
  var valuesBatch;
  var pseudoCursor;

  function onGetAll(e) {
    valuesBatch = e.target.result;
    if (keysBatch) {
      onBatch(keysBatch, valuesBatch, pseudoCursor);
    }
  }

  function onGetAllKeys(e) {
    keysBatch = e.target.result;
    if (valuesBatch) {
      onBatch(keysBatch, valuesBatch, pseudoCursor);
    }
  }

  function continuePseudoCursor() {
    if (!keysBatch.length) { // no more results
      return onBatch();
    }
    // fetch next batch, exclusive start
    var lastKey = keysBatch[keysBatch.length - 1];
    var newKeyRange;
    if (keyRange && keyRange.upper) {
      try {
        newKeyRange = IDBKeyRange.bound(lastKey, keyRange.upper,
          true, keyRange.upperOpen);
      } catch (e) {
        if (e.name === "DataError" && e.code === 0) {
          return onBatch(); // we're done, startkey and endkey are equal
        }
      }
    } else {
      newKeyRange = IDBKeyRange.lowerBound(lastKey, true);
    }
    keyRange = newKeyRange;
    keysBatch = null;
    valuesBatch = null;
    objectStore.getAll(keyRange, batchSize).onsuccess = onGetAll;
    objectStore.getAllKeys(keyRange, batchSize).onsuccess = onGetAllKeys;
  }

  function onCursor(e) {
    var cursor = e.target.result;
    if (!cursor) { // done
      return onBatch();
    }
    // regular IDBCursor acts like a batch where batch size is always 1
    onBatch([cursor.key], [cursor.value], cursor);
  }

  if (useGetAll) {
    pseudoCursor = {"continue": continuePseudoCursor};
    objectStore.getAll(keyRange, batchSize).onsuccess = onGetAll;
    objectStore.getAllKeys(keyRange, batchSize).onsuccess = onGetAllKeys;
  } else if (descending) {
    objectStore.openCursor(keyRange, 'prev').onsuccess = onCursor;
  } else {
    objectStore.openCursor(keyRange).onsuccess = onCursor;
  }
}

// simple shim for objectStore.getAll(), falling back to IDBCursor
function getAll(objectStore, keyRange, onSuccess) {
  if (typeof objectStore.getAll === 'function') {
    // use native getAll
    objectStore.getAll(keyRange).onsuccess = onSuccess;
    return;
  }
  // fall back to cursors
  var values = [];

  function onCursor(e) {
    var cursor = e.target.result;
    if (cursor) {
      values.push(cursor.value);
      cursor.continue();
    } else {
      onSuccess({
        target: {
          result: values
        }
      });
    }
  }

  objectStore.openCursor(keyRange).onsuccess = onCursor;
}

function allDocsKeys(keys, docStore, onBatch) {
  // It's not guaranted to be returned in right order  
  var valuesBatch = new Array(keys.length);
  var count = 0;
  keys.forEach(function (key, index) {
    docStore.get(key).onsuccess = function (event) {
      if (event.target.result) {
        valuesBatch[index] = event.target.result;
      } else {
        valuesBatch[index] = {key: key, error: 'not_found'};
      }
      count++;
      if (count === keys.length) {
        onBatch(keys, valuesBatch, {});
      }
    };
  });
}

function createKeyRange(start, end, inclusiveEnd, key, descending) {
  try {
    if (start && end) {
      if (descending) {
        return IDBKeyRange.bound(end, start, !inclusiveEnd, false);
      } else {
        return IDBKeyRange.bound(start, end, false, !inclusiveEnd);
      }
    } else if (start) {
      if (descending) {
        return IDBKeyRange.upperBound(start);
      } else {
        return IDBKeyRange.lowerBound(start);
      }
    } else if (end) {
      if (descending) {
        return IDBKeyRange.lowerBound(end, !inclusiveEnd);
      } else {
        return IDBKeyRange.upperBound(end, !inclusiveEnd);
      }
    } else if (key) {
      return IDBKeyRange.only(key);
    }
  } catch (e) {
    return {error: e};
  }
  return null;
}

function idbAllDocs(opts, idb, callback) {
  var start = 'startkey' in opts ? opts.startkey : false;
  var end = 'endkey' in opts ? opts.endkey : false;
  var key = 'key' in opts ? opts.key : false;
  var keys = 'keys' in opts ? opts.keys : false; 
  var skip = opts.skip || 0;
  var limit = typeof opts.limit === 'number' ? opts.limit : -1;
  var inclusiveEnd = opts.inclusive_end !== false;

  var keyRange ; 
  var keyRangeError;
  if (!keys) {
    keyRange = createKeyRange(start, end, inclusiveEnd, key, opts.descending);
    keyRangeError = keyRange && keyRange.error;
    if (keyRangeError && 
      !(keyRangeError.name === "DataError" && keyRangeError.code === 0)) {
      // DataError with error code 0 indicates start is less than end, so
      // can just do an empty query. Else need to throw
      return callback(createError(IDB_ERROR,
        keyRangeError.name, keyRangeError.message));
    }
  }

  var stores = [DOC_STORE, BY_SEQ_STORE, META_STORE];

  if (opts.attachments) {
    stores.push(ATTACH_STORE);
  }
  var txnResult = openTransactionSafely(idb, stores, 'readonly');
  if (txnResult.error) {
    return callback(txnResult.error);
  }
  var txn = txnResult.txn;
  txn.oncomplete = onTxnComplete;
  txn.onabort = idbError(callback);
  var docStore = txn.objectStore(DOC_STORE);
  var seqStore = txn.objectStore(BY_SEQ_STORE);
  var metaStore = txn.objectStore(META_STORE);
  var docIdRevIndex = seqStore.index('_doc_id_rev');
  var results = [];
  var docCount;
  var updateSeq;

  metaStore.get(META_STORE).onsuccess = function (e) {
    docCount = e.target.result.docCount;
  };

  /* istanbul ignore if */
  if (opts.update_seq) {
    getMaxUpdateSeq(seqStore, function (e) { 
      if (e.target.result && e.target.result.length > 0) {
        updateSeq = e.target.result[0];
      }
    });
  }

  function getMaxUpdateSeq(objectStore, onSuccess) {
    function onCursor(e) {
      var cursor = e.target.result;
      var maxKey = undefined;
      if (cursor && cursor.key) {
        maxKey = cursor.key;
      } 
      return onSuccess({
        target: {
          result: [maxKey]
        }
      });
    }
    objectStore.openCursor(null, 'prev').onsuccess = onCursor;
  }

  // if the user specifies include_docs=true, then we don't
  // want to block the main cursor while we're fetching the doc
  function fetchDocAsynchronously(metadata, row, winningRev$$1) {
    var key = metadata.id + "::" + winningRev$$1;
    docIdRevIndex.get(key).onsuccess =  function onGetDoc(e) {
      row.doc = decodeDoc(e.target.result) || {};
      if (opts.conflicts) {
        var conflicts = collectConflicts(metadata);
        if (conflicts.length) {
          row.doc._conflicts = conflicts;
        }
      }
      fetchAttachmentsIfNecessary(row.doc, opts, txn);
    };
  }

  function allDocsInner(winningRev$$1, metadata) {
    var row = {
      id: metadata.id,
      key: metadata.id,
      value: {
        rev: winningRev$$1
      }
    };
    var deleted = metadata.deleted;
    if (deleted) {
      if (keys) {
        results.push(row);
        // deleted docs are okay with "keys" requests
        row.value.deleted = true;
        row.doc = null;
      }
    } else if (skip-- <= 0) {
      results.push(row);
      if (opts.include_docs) {
        fetchDocAsynchronously(metadata, row, winningRev$$1);
      }
    }
  }

  function processBatch(batchValues) {
    for (var i = 0, len = batchValues.length; i < len; i++) {
      if (results.length === limit) {
        break;
      }
      var batchValue = batchValues[i];
      if (batchValue.error && keys) {
        // key was not found with "keys" requests
        results.push(batchValue);
        continue;
      }
      var metadata = decodeMetadata(batchValue);
      var winningRev$$1 = metadata.winningRev;
      allDocsInner(winningRev$$1, metadata);
    }
  }

  function onBatch(batchKeys, batchValues, cursor) {
    if (!cursor) {
      return;
    }
    processBatch(batchValues);
    if (results.length < limit) {
      cursor.continue();
    }
  }

  function onGetAll(e) {
    var values = e.target.result;
    if (opts.descending) {
      values = values.reverse();
    }
    processBatch(values);
  }

  function onResultsReady() {
    var returnVal = {
      total_rows: docCount,
      offset: opts.skip,
      rows: results
    };
    
    /* istanbul ignore if */
    if (opts.update_seq && updateSeq !== undefined) {
      returnVal.update_seq = updateSeq;
    }
    callback(null, returnVal);
  }

  function onTxnComplete() {
    if (opts.attachments) {
      postProcessAttachments(results, opts.binary).then(onResultsReady);
    } else {
      onResultsReady();
    }
  }

  // don't bother doing any requests if start > end or limit === 0
  if (keyRangeError || limit === 0) {
    return;
  }
  if (keys) {
    return allDocsKeys(opts.keys, docStore, onBatch);
  }
  if (limit === -1) { // just fetch everything
    return getAll(docStore, keyRange, onGetAll);
  }
  // else do a cursor
  // choose a batch size based on the skip, since we'll need to skip that many
  runBatchedCursor(docStore, keyRange, opts.descending, limit + skip, onBatch);
}

//
// Blobs are not supported in all versions of IndexedDB, notably
// Chrome <37 and Android <5. In those versions, storing a blob will throw.
//
// Various other blob bugs exist in Chrome v37-42 (inclusive).
// Detecting them is expensive and confusing to users, and Chrome 37-42
// is at very low usage worldwide, so we do a hacky userAgent check instead.
//
// content-type bug: https://code.google.com/p/chromium/issues/detail?id=408120
// 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
// FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
//
function checkBlobSupport(txn) {
  return new Promise(function (resolve) {
    var blob$$1 = createBlob(['']);
    var req = txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob$$1, 'key');

    req.onsuccess = function () {
      var matchedChrome = navigator.userAgent.match(/Chrome\/(\d+)/);
      var matchedEdge = navigator.userAgent.match(/Edge\//);
      // MS Edge pretends to be Chrome 42:
      // https://msdn.microsoft.com/en-us/library/hh869301%28v=vs.85%29.aspx
      resolve(matchedEdge || !matchedChrome ||
        parseInt(matchedChrome[1], 10) >= 43);
    };

    req.onerror = txn.onabort = function (e) {
      // If the transaction aborts now its due to not being able to
      // write to the database, likely due to the disk being full
      e.preventDefault();
      e.stopPropagation();
      resolve(false);
    };
  }).catch(function () {
    return false; // error, so assume unsupported
  });
}

function countDocs(txn, cb) {
  var index = txn.objectStore(DOC_STORE).index('deletedOrLocal');
  index.count(IDBKeyRange.only('0')).onsuccess = function (e) {
    cb(e.target.result);
  };
}

// This task queue ensures that IDB open calls are done in their own tick

var running = false;
var queue = [];

function tryCode(fun, err, res, PouchDB) {
  try {
    fun(err, res);
  } catch (err) {
    // Shouldn't happen, but in some odd cases
    // IndexedDB implementations might throw a sync
    // error, in which case this will at least log it.
    PouchDB.emit('error', err);
  }
}

function applyNext() {
  if (running || !queue.length) {
    return;
  }
  running = true;
  queue.shift()();
}

function enqueueTask(action, callback, PouchDB) {
  queue.push(function runAction() {
    action(function runCallback(err, res) {
      tryCode(callback, err, res, PouchDB);
      running = false;
      immediate(function runNext() {
        applyNext(PouchDB);
      });
    });
  });
  applyNext();
}

function changes(opts, api, dbName, idb) {
  opts = clone(opts);

  if (opts.continuous) {
    var id = dbName + ':' + uuid();
    changesHandler.addListener(dbName, id, api, opts);
    changesHandler.notify(dbName);
    return {
      cancel: function () {
        changesHandler.removeListener(dbName, id);
      }
    };
  }

  var docIds = opts.doc_ids && new ExportedSet(opts.doc_ids);

  opts.since = opts.since || 0;
  var lastSeq = opts.since;

  var limit = 'limit' in opts ? opts.limit : -1;
  if (limit === 0) {
    limit = 1; // per CouchDB _changes spec
  }

  var results = [];
  var numResults = 0;
  var filter = filterChange(opts);
  var docIdsToMetadata = new ExportedMap();

  var txn;
  var bySeqStore;
  var docStore;
  var docIdRevIndex;

  function onBatch(batchKeys, batchValues, cursor) {
    if (!cursor || !batchKeys.length) { // done
      return;
    }

    var winningDocs = new Array(batchKeys.length);
    var metadatas = new Array(batchKeys.length);

    function processMetadataAndWinningDoc(metadata, winningDoc) {
      var change = opts.processChange(winningDoc, metadata, opts);
      lastSeq = change.seq = metadata.seq;

      var filtered = filter(change);
      if (typeof filtered === 'object') { // anything but true/false indicates error
        return Promise.reject(filtered);
      }

      if (!filtered) {
        return Promise.resolve();
      }
      numResults++;
      if (opts.return_docs) {
        results.push(change);
      }
      // process the attachment immediately
      // for the benefit of live listeners
      if (opts.attachments && opts.include_docs) {
        return new Promise(function (resolve) {
          fetchAttachmentsIfNecessary(winningDoc, opts, txn, function () {
            postProcessAttachments([change], opts.binary).then(function () {
              resolve(change);
            });
          });
        });
      } else {
        return Promise.resolve(change);
      }
    }

    function onBatchDone() {
      var promises = [];
      for (var i = 0, len = winningDocs.length; i < len; i++) {
        if (numResults === limit) {
          break;
        }
        var winningDoc = winningDocs[i];
        if (!winningDoc) {
          continue;
        }
        var metadata = metadatas[i];
        promises.push(processMetadataAndWinningDoc(metadata, winningDoc));
      }

      Promise.all(promises).then(function (changes) {
        for (var i = 0, len = changes.length; i < len; i++) {
          if (changes[i]) {
            opts.onChange(changes[i]);
          }
        }
      }).catch(opts.complete);

      if (numResults !== limit) {
        cursor.continue();
      }
    }

    // Fetch all metadatas/winningdocs from this batch in parallel, then process
    // them all only once all data has been collected. This is done in parallel
    // because it's faster than doing it one-at-a-time.
    var numDone = 0;
    batchValues.forEach(function (value, i) {
      var doc = decodeDoc(value);
      var seq = batchKeys[i];
      fetchWinningDocAndMetadata(doc, seq, function (metadata, winningDoc) {
        metadatas[i] = metadata;
        winningDocs[i] = winningDoc;
        if (++numDone === batchKeys.length) {
          onBatchDone();
        }
      });
    });
  }

  function onGetMetadata(doc, seq, metadata, cb) {
    if (metadata.seq !== seq) {
      // some other seq is later
      return cb();
    }

    if (metadata.winningRev === doc._rev) {
      // this is the winning doc
      return cb(metadata, doc);
    }

    // fetch winning doc in separate request
    var docIdRev = doc._id + '::' + metadata.winningRev;
    var req = docIdRevIndex.get(docIdRev);
    req.onsuccess = function (e) {
      cb(metadata, decodeDoc(e.target.result));
    };
  }

  function fetchWinningDocAndMetadata(doc, seq, cb) {
    if (docIds && !docIds.has(doc._id)) {
      return cb();
    }

    var metadata = docIdsToMetadata.get(doc._id);
    if (metadata) { // cached
      return onGetMetadata(doc, seq, metadata, cb);
    }
    // metadata not cached, have to go fetch it
    docStore.get(doc._id).onsuccess = function (e) {
      metadata = decodeMetadata(e.target.result);
      docIdsToMetadata.set(doc._id, metadata);
      onGetMetadata(doc, seq, metadata, cb);
    };
  }

  function finish() {
    opts.complete(null, {
      results: results,
      last_seq: lastSeq
    });
  }

  function onTxnComplete() {
    if (!opts.continuous && opts.attachments) {
      // cannot guarantee that postProcessing was already done,
      // so do it again
      postProcessAttachments(results).then(finish);
    } else {
      finish();
    }
  }

  var objectStores = [DOC_STORE, BY_SEQ_STORE];
  if (opts.attachments) {
    objectStores.push(ATTACH_STORE);
  }
  var txnResult = openTransactionSafely(idb, objectStores, 'readonly');
  if (txnResult.error) {
    return opts.complete(txnResult.error);
  }
  txn = txnResult.txn;
  txn.onabort = idbError(opts.complete);
  txn.oncomplete = onTxnComplete;

  bySeqStore = txn.objectStore(BY_SEQ_STORE);
  docStore = txn.objectStore(DOC_STORE);
  docIdRevIndex = bySeqStore.index('_doc_id_rev');

  var keyRange = (opts.since && !opts.descending) ?
    IDBKeyRange.lowerBound(opts.since, true) : null;

  runBatchedCursor(bySeqStore, keyRange, opts.descending, limit, onBatch);
}

var cachedDBs = new ExportedMap();
var blobSupportPromise;
var openReqList = new ExportedMap();

function IdbPouch(opts, callback) {
  var api = this;

  enqueueTask(function (thisCallback) {
    init(api, opts, thisCallback);
  }, callback, api.constructor);
}

function init(api, opts, callback) {

  var dbName = opts.name;

  var idb = null;
  api._meta = null;

  // called when creating a fresh new database
  function createSchema(db) {
    var docStore = db.createObjectStore(DOC_STORE, {keyPath : 'id'});
    db.createObjectStore(BY_SEQ_STORE, {autoIncrement: true})
      .createIndex('_doc_id_rev', '_doc_id_rev', {unique: true});
    db.createObjectStore(ATTACH_STORE, {keyPath: 'digest'});
    db.createObjectStore(META_STORE, {keyPath: 'id', autoIncrement: false});
    db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);

    // added in v2
    docStore.createIndex('deletedOrLocal', 'deletedOrLocal', {unique : false});

    // added in v3
    db.createObjectStore(LOCAL_STORE, {keyPath: '_id'});

    // added in v4
    var attAndSeqStore = db.createObjectStore(ATTACH_AND_SEQ_STORE,
      {autoIncrement: true});
    attAndSeqStore.createIndex('seq', 'seq');
    attAndSeqStore.createIndex('digestSeq', 'digestSeq', {unique: true});
  }

  // migration to version 2
  // unfortunately "deletedOrLocal" is a misnomer now that we no longer
  // store local docs in the main doc-store, but whaddyagonnado
  function addDeletedOrLocalIndex(txn, callback) {
    var docStore = txn.objectStore(DOC_STORE);
    docStore.createIndex('deletedOrLocal', 'deletedOrLocal', {unique : false});

    docStore.openCursor().onsuccess = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        var metadata = cursor.value;
        var deleted = isDeleted(metadata);
        metadata.deletedOrLocal = deleted ? "1" : "0";
        docStore.put(metadata);
        cursor.continue();
      } else {
        callback();
      }
    };
  }

  // migration to version 3 (part 1)
  function createLocalStoreSchema(db) {
    db.createObjectStore(LOCAL_STORE, {keyPath: '_id'})
      .createIndex('_doc_id_rev', '_doc_id_rev', {unique: true});
  }

  // migration to version 3 (part 2)
  function migrateLocalStore(txn, cb) {
    var localStore = txn.objectStore(LOCAL_STORE);
    var docStore = txn.objectStore(DOC_STORE);
    var seqStore = txn.objectStore(BY_SEQ_STORE);

    var cursor = docStore.openCursor();
    cursor.onsuccess = function (event) {
      var cursor = event.target.result;
      if (cursor) {
        var metadata = cursor.value;
        var docId = metadata.id;
        var local = isLocalId(docId);
        var rev$$1 = winningRev(metadata);
        if (local) {
          var docIdRev = docId + "::" + rev$$1;
          // remove all seq entries
          // associated with this docId
          var start = docId + "::";
          var end = docId + "::~";
          var index = seqStore.index('_doc_id_rev');
          var range = IDBKeyRange.bound(start, end, false, false);
          var seqCursor = index.openCursor(range);
          seqCursor.onsuccess = function (e) {
            seqCursor = e.target.result;
            if (!seqCursor) {
              // done
              docStore.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              var data = seqCursor.value;
              if (data._doc_id_rev === docIdRev) {
                localStore.put(data);
              }
              seqStore.delete(seqCursor.primaryKey);
              seqCursor.continue();
            }
          };
        } else {
          cursor.continue();
        }
      } else if (cb) {
        cb();
      }
    };
  }

  // migration to version 4 (part 1)
  function addAttachAndSeqStore(db) {
    var attAndSeqStore = db.createObjectStore(ATTACH_AND_SEQ_STORE,
      {autoIncrement: true});
    attAndSeqStore.createIndex('seq', 'seq');
    attAndSeqStore.createIndex('digestSeq', 'digestSeq', {unique: true});
  }

  // migration to version 4 (part 2)
  function migrateAttsAndSeqs(txn, callback) {
    var seqStore = txn.objectStore(BY_SEQ_STORE);
    var attStore = txn.objectStore(ATTACH_STORE);
    var attAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);

    // need to actually populate the table. this is the expensive part,
    // so as an optimization, check first that this database even
    // contains attachments
    var req = attStore.count();
    req.onsuccess = function (e) {
      var count = e.target.result;
      if (!count) {
        return callback(); // done
      }

      seqStore.openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (!cursor) {
          return callback(); // done
        }
        var doc = cursor.value;
        var seq = cursor.primaryKey;
        var atts = Object.keys(doc._attachments || {});
        var digestMap = {};
        for (var j = 0; j < atts.length; j++) {
          var att = doc._attachments[atts[j]];
          digestMap[att.digest] = true; // uniq digests, just in case
        }
        var digests = Object.keys(digestMap);
        for (j = 0; j < digests.length; j++) {
          var digest = digests[j];
          attAndSeqStore.put({
            seq: seq,
            digestSeq: digest + '::' + seq
          });
        }
        cursor.continue();
      };
    };
  }

  // migration to version 5
  // Instead of relying on on-the-fly migration of metadata,
  // this brings the doc-store to its modern form:
  // - metadata.winningrev
  // - metadata.seq
  // - stringify the metadata when storing it
  function migrateMetadata(txn) {

    function decodeMetadataCompat(storedObject) {
      if (!storedObject.data) {
        // old format, when we didn't store it stringified
        storedObject.deleted = storedObject.deletedOrLocal === '1';
        return storedObject;
      }
      return decodeMetadata(storedObject);
    }

    // ensure that every metadata has a winningRev and seq,
    // which was previously created on-the-fly but better to migrate
    var bySeqStore = txn.objectStore(BY_SEQ_STORE);
    var docStore = txn.objectStore(DOC_STORE);
    var cursor = docStore.openCursor();
    cursor.onsuccess = function (e) {
      var cursor = e.target.result;
      if (!cursor) {
        return; // done
      }
      var metadata = decodeMetadataCompat(cursor.value);

      metadata.winningRev = metadata.winningRev ||
        winningRev(metadata);

      function fetchMetadataSeq() {
        // metadata.seq was added post-3.2.0, so if it's missing,
        // we need to fetch it manually
        var start = metadata.id + '::';
        var end = metadata.id + '::\uffff';
        var req = bySeqStore.index('_doc_id_rev').openCursor(
          IDBKeyRange.bound(start, end));

        var metadataSeq = 0;
        req.onsuccess = function (e) {
          var cursor = e.target.result;
          if (!cursor) {
            metadata.seq = metadataSeq;
            return onGetMetadataSeq();
          }
          var seq = cursor.primaryKey;
          if (seq > metadataSeq) {
            metadataSeq = seq;
          }
          cursor.continue();
        };
      }

      function onGetMetadataSeq() {
        var metadataToStore = encodeMetadata(metadata,
          metadata.winningRev, metadata.deleted);

        var req = docStore.put(metadataToStore);
        req.onsuccess = function () {
          cursor.continue();
        };
      }

      if (metadata.seq) {
        return onGetMetadataSeq();
      }

      fetchMetadataSeq();
    };

  }

  api._remote = false;
  api.type = function () {
    return 'idb';
  };

  api._id = toPromise(function (callback) {
    callback(null, api._meta.instanceId);
  });

  api._bulkDocs = function idb_bulkDocs(req, reqOpts, callback) {
    idbBulkDocs(opts, req, reqOpts, api, idb, callback);
  };

  // First we look up the metadata in the ids database, then we fetch the
  // current revision(s) from the by sequence store
  api._get = function idb_get(id, opts, callback) {
    var doc;
    var metadata;
    var err;
    var txn = opts.ctx;
    if (!txn) {
      var txnResult = openTransactionSafely(idb,
        [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE], 'readonly');
      if (txnResult.error) {
        return callback(txnResult.error);
      }
      txn = txnResult.txn;
    }

    function finish() {
      callback(err, {doc: doc, metadata: metadata, ctx: txn});
    }

    txn.objectStore(DOC_STORE).get(id).onsuccess = function (e) {
      metadata = decodeMetadata(e.target.result);
      // we can determine the result here if:
      // 1. there is no such document
      // 2. the document is deleted and we don't ask about specific rev
      // When we ask with opts.rev we expect the answer to be either
      // doc (possibly with _deleted=true) or missing error
      if (!metadata) {
        err = createError(MISSING_DOC, 'missing');
        return finish();
      }

      var rev$$1;
      if (!opts.rev) {
        rev$$1 = metadata.winningRev;
        var deleted = isDeleted(metadata);
        if (deleted) {
          err = createError(MISSING_DOC, "deleted");
          return finish();
        }
      } else {
        rev$$1 = opts.latest ? latest(opts.rev, metadata) : opts.rev;
      }

      var objectStore = txn.objectStore(BY_SEQ_STORE);
      var key = metadata.id + '::' + rev$$1;

      objectStore.index('_doc_id_rev').get(key).onsuccess = function (e) {
        doc = e.target.result;
        if (doc) {
          doc = decodeDoc(doc);
        }
        if (!doc) {
          err = createError(MISSING_DOC, 'missing');
          return finish();
        }
        finish();
      };
    };
  };

  api._getAttachment = function (docId, attachId, attachment, opts, callback) {
    var txn;
    if (opts.ctx) {
      txn = opts.ctx;
    } else {
      var txnResult = openTransactionSafely(idb,
        [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE], 'readonly');
      if (txnResult.error) {
        return callback(txnResult.error);
      }
      txn = txnResult.txn;
    }
    var digest = attachment.digest;
    var type = attachment.content_type;

    txn.objectStore(ATTACH_STORE).get(digest).onsuccess = function (e) {
      var body = e.target.result.body;
      readBlobData(body, type, opts.binary, function (blobData) {
        callback(null, blobData);
      });
    };
  };

  api._info = function idb_info(callback) {
    var updateSeq;
    var docCount;

    var txnResult = openTransactionSafely(idb, [META_STORE, BY_SEQ_STORE], 'readonly');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    var txn = txnResult.txn;
    txn.objectStore(META_STORE).get(META_STORE).onsuccess = function (e) {
      docCount = e.target.result.docCount;
    };
    txn.objectStore(BY_SEQ_STORE).openCursor(null, 'prev').onsuccess = function (e) {
      var cursor = e.target.result;
      updateSeq = cursor ? cursor.key : 0;
    };

    txn.oncomplete = function () {
      callback(null, {
        doc_count: docCount,
        update_seq: updateSeq,
        // for debugging
        idb_attachment_format: (api._meta.blobSupport ? 'binary' : 'base64')
      });
    };
  };

  api._allDocs = function idb_allDocs(opts, callback) {
    idbAllDocs(opts, idb, callback);
  };

  api._changes = function idbChanges(opts) {
    return changes(opts, api, dbName, idb);
  };

  api._close = function (callback) {
    // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBDatabase#close
    // "Returns immediately and closes the connection in a separate thread..."
    idb.close();
    cachedDBs.delete(dbName);
    callback();
  };

  api._getRevisionTree = function (docId, callback) {
    var txnResult = openTransactionSafely(idb, [DOC_STORE], 'readonly');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    var txn = txnResult.txn;
    var req = txn.objectStore(DOC_STORE).get(docId);
    req.onsuccess = function (event) {
      var doc = decodeMetadata(event.target.result);
      if (!doc) {
        callback(createError(MISSING_DOC));
      } else {
        callback(null, doc.rev_tree);
      }
    };
  };

  // This function removes revisions of document docId
  // which are listed in revs and sets this document
  // revision to to rev_tree
  api._doCompaction = function (docId, revs, callback) {
    var stores = [
      DOC_STORE,
      BY_SEQ_STORE,
      ATTACH_STORE,
      ATTACH_AND_SEQ_STORE
    ];
    var txnResult = openTransactionSafely(idb, stores, 'readwrite');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    var txn = txnResult.txn;

    var docStore = txn.objectStore(DOC_STORE);

    docStore.get(docId).onsuccess = function (event) {
      var metadata = decodeMetadata(event.target.result);
      traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
                                                         revHash, ctx, opts) {
        var rev$$1 = pos + '-' + revHash;
        if (revs.indexOf(rev$$1) !== -1) {
          opts.status = 'missing';
        }
      });
      compactRevs(revs, docId, txn);
      var winningRev$$1 = metadata.winningRev;
      var deleted = metadata.deleted;
      txn.objectStore(DOC_STORE).put(
        encodeMetadata(metadata, winningRev$$1, deleted));
    };
    txn.onabort = idbError(callback);
    txn.oncomplete = function () {
      callback();
    };
  };


  api._getLocal = function (id, callback) {
    var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readonly');
    if (txnResult.error) {
      return callback(txnResult.error);
    }
    var tx = txnResult.txn;
    var req = tx.objectStore(LOCAL_STORE).get(id);

    req.onerror = idbError(callback);
    req.onsuccess = function (e) {
      var doc = e.target.result;
      if (!doc) {
        callback(createError(MISSING_DOC));
      } else {
        delete doc['_doc_id_rev']; // for backwards compat
        callback(null, doc);
      }
    };
  };

  api._putLocal = function (doc, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    delete doc._revisions; // ignore this, trust the rev
    var oldRev = doc._rev;
    var id = doc._id;
    if (!oldRev) {
      doc._rev = '0-1';
    } else {
      doc._rev = '0-' + (parseInt(oldRev.split('-')[1], 10) + 1);
    }

    var tx = opts.ctx;
    var ret;
    if (!tx) {
      var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readwrite');
      if (txnResult.error) {
        return callback(txnResult.error);
      }
      tx = txnResult.txn;
      tx.onerror = idbError(callback);
      tx.oncomplete = function () {
        if (ret) {
          callback(null, ret);
        }
      };
    }

    var oStore = tx.objectStore(LOCAL_STORE);
    var req;
    if (oldRev) {
      req = oStore.get(id);
      req.onsuccess = function (e) {
        var oldDoc = e.target.result;
        if (!oldDoc || oldDoc._rev !== oldRev) {
          callback(createError(REV_CONFLICT));
        } else { // update
          var req = oStore.put(doc);
          req.onsuccess = function () {
            ret = {ok: true, id: doc._id, rev: doc._rev};
            if (opts.ctx) { // return immediately
              callback(null, ret);
            }
          };
        }
      };
    } else { // new doc
      req = oStore.add(doc);
      req.onerror = function (e) {
        // constraint error, already exists
        callback(createError(REV_CONFLICT));
        e.preventDefault(); // avoid transaction abort
        e.stopPropagation(); // avoid transaction onerror
      };
      req.onsuccess = function () {
        ret = {ok: true, id: doc._id, rev: doc._rev};
        if (opts.ctx) { // return immediately
          callback(null, ret);
        }
      };
    }
  };

  api._removeLocal = function (doc, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    var tx = opts.ctx;
    if (!tx) {
      var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readwrite');
      if (txnResult.error) {
        return callback(txnResult.error);
      }
      tx = txnResult.txn;
      tx.oncomplete = function () {
        if (ret) {
          callback(null, ret);
        }
      };
    }
    var ret;
    var id = doc._id;
    var oStore = tx.objectStore(LOCAL_STORE);
    var req = oStore.get(id);

    req.onerror = idbError(callback);
    req.onsuccess = function (e) {
      var oldDoc = e.target.result;
      if (!oldDoc || oldDoc._rev !== doc._rev) {
        callback(createError(MISSING_DOC));
      } else {
        oStore.delete(id);
        ret = {ok: true, id: id, rev: '0-0'};
        if (opts.ctx) { // return immediately
          callback(null, ret);
        }
      }
    };
  };

  api._destroy = function (opts, callback) {
    changesHandler.removeAllListeners(dbName);

    //Close open request for "dbName" database to fix ie delay.
    var openReq = openReqList.get(dbName);
    if (openReq && openReq.result) {
      openReq.result.close();
      cachedDBs.delete(dbName);
    }
    var req = indexedDB.deleteDatabase(dbName);

    req.onsuccess = function () {
      //Remove open request from the list.
      openReqList.delete(dbName);
      if (hasLocalStorage() && (dbName in localStorage)) {
        delete localStorage[dbName];
      }
      callback(null, { 'ok': true });
    };

    req.onerror = idbError(callback);
  };

  var cached = cachedDBs.get(dbName);

  if (cached) {
    idb = cached.idb;
    api._meta = cached.global;
    return immediate(function () {
      callback(null, api);
    });
  }

  var req = indexedDB.open(dbName, ADAPTER_VERSION);
  openReqList.set(dbName, req);

  req.onupgradeneeded = function (e) {
    var db = e.target.result;
    if (e.oldVersion < 1) {
      return createSchema(db); // new db, initial schema
    }
    // do migrations

    var txn = e.currentTarget.transaction;
    // these migrations have to be done in this function, before
    // control is returned to the event loop, because IndexedDB

    if (e.oldVersion < 3) {
      createLocalStoreSchema(db); // v2 -> v3
    }
    if (e.oldVersion < 4) {
      addAttachAndSeqStore(db); // v3 -> v4
    }

    var migrations = [
      addDeletedOrLocalIndex, // v1 -> v2
      migrateLocalStore,      // v2 -> v3
      migrateAttsAndSeqs,     // v3 -> v4
      migrateMetadata         // v4 -> v5
    ];

    var i = e.oldVersion;

    function next() {
      var migration = migrations[i - 1];
      i++;
      if (migration) {
        migration(txn, next);
      }
    }

    next();
  };

  req.onsuccess = function (e) {

    idb = e.target.result;

    idb.onversionchange = function () {
      idb.close();
      cachedDBs.delete(dbName);
    };

    idb.onabort = function (e) {
      guardedConsole('error', 'Database has a global failure', e.target.error);
      idb.close();
      cachedDBs.delete(dbName);
    };

    // Do a few setup operations (in parallel as much as possible):
    // 1. Fetch meta doc
    // 2. Check blob support
    // 3. Calculate docCount
    // 4. Generate an instanceId if necessary
    // 5. Store docCount and instanceId on meta doc

    var txn = idb.transaction([
      META_STORE,
      DETECT_BLOB_SUPPORT_STORE,
      DOC_STORE
    ], 'readwrite');

    var storedMetaDoc = false;
    var metaDoc;
    var docCount;
    var blobSupport;
    var instanceId;

    function completeSetup() {
      if (typeof blobSupport === 'undefined' || !storedMetaDoc) {
        return;
      }
      api._meta = {
        name: dbName,
        instanceId: instanceId,
        blobSupport: blobSupport
      };

      cachedDBs.set(dbName, {
        idb: idb,
        global: api._meta
      });
      callback(null, api);
    }

    function storeMetaDocIfReady() {
      if (typeof docCount === 'undefined' || typeof metaDoc === 'undefined') {
        return;
      }
      var instanceKey = dbName + '_id';
      if (instanceKey in metaDoc) {
        instanceId = metaDoc[instanceKey];
      } else {
        metaDoc[instanceKey] = instanceId = uuid();
      }
      metaDoc.docCount = docCount;
      txn.objectStore(META_STORE).put(metaDoc);
    }

    //
    // fetch or generate the instanceId
    //
    txn.objectStore(META_STORE).get(META_STORE).onsuccess = function (e) {
      metaDoc = e.target.result || { id: META_STORE };
      storeMetaDocIfReady();
    };

    //
    // countDocs
    //
    countDocs(txn, function (count) {
      docCount = count;
      storeMetaDocIfReady();
    });

    //
    // check blob support
    //
    if (!blobSupportPromise) {
      // make sure blob support is only checked once
      blobSupportPromise = checkBlobSupport(txn);
    }

    blobSupportPromise.then(function (val) {
      blobSupport = val;
      completeSetup();
    });

    // only when the metadata put transaction has completed,
    // consider the setup done
    txn.oncomplete = function () {
      storedMetaDoc = true;
      completeSetup();
    };
    txn.onabort = idbError(callback);
  };

  req.onerror = function (e) {
    var msg = e.target.error && e.target.error.message;

    if (!msg) {
      msg = 'Failed to open indexedDB, are you in private browsing mode?';
    } else if (msg.indexOf("stored database is a higher version") !== -1) {
      msg = new Error('This DB was created with the newer "indexeddb" adapter, but you are trying to open it with the older "idb" adapter');
    }

    guardedConsole('error', msg);
    callback(createError(IDB_ERROR, msg));
  };
}

IdbPouch.valid = function () {
  // Following #7085 buggy idb versions (typically Safari < 10.1) are
  // considered valid.

  // On Firefox SecurityError is thrown while referencing indexedDB if cookies
  // are not allowed. `typeof indexedDB` also triggers the error.
  try {
    // some outdated implementations of IDB that appear on Samsung
    // and HTC Android devices <4.4 are missing IDBKeyRange
    return typeof indexedDB !== 'undefined' && typeof IDBKeyRange !== 'undefined';
  } catch (e) {
    return false;
  }
};

function IDBPouch (PouchDB) {
  PouchDB.adapter('idb', IdbPouch, true);
}

// dead simple promise pool, inspired by https://github.com/timdp/es6-promise-pool
// but much smaller in code size. limits the number of concurrent promises that are executed


function pool(promiseFactories, limit) {
  return new Promise(function (resolve, reject) {
    var running = 0;
    var current = 0;
    var done = 0;
    var len = promiseFactories.length;
    var err;

    function runNext() {
      running++;
      promiseFactories[current++]().then(onSuccess, onError);
    }

    function doNext() {
      if (++done === len) {
        /* istanbul ignore if */
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      } else {
        runNextBatch();
      }
    }

    function onSuccess() {
      running--;
      doNext();
    }

    /* istanbul ignore next */
    function onError(thisErr) {
      running--;
      err = err || thisErr;
      doNext();
    }

    function runNextBatch() {
      while (running < limit && current < len) {
        runNext();
      }
    }

    runNextBatch();
  });
}

var CHANGES_BATCH_SIZE = 25;
var MAX_SIMULTANEOUS_REVS = 50;
var CHANGES_TIMEOUT_BUFFER = 5000;
var DEFAULT_HEARTBEAT = 10000;

var supportsBulkGetMap = {};

function readAttachmentsAsBlobOrBuffer(row) {
  var doc = row.doc || row.ok;
  var atts = doc && doc._attachments;
  if (!atts) {
    return;
  }
  Object.keys(atts).forEach(function (filename) {
    var att = atts[filename];
    att.data = b64ToBluffer(att.data, att.content_type);
  });
}

function encodeDocId(id) {
  if (/^_design/.test(id)) {
    return '_design/' + encodeURIComponent(id.slice(8));
  }
  if (/^_local/.test(id)) {
    return '_local/' + encodeURIComponent(id.slice(7));
  }
  return encodeURIComponent(id);
}

function preprocessAttachments$1(doc) {
  if (!doc._attachments || !Object.keys(doc._attachments)) {
    return Promise.resolve();
  }

  return Promise.all(Object.keys(doc._attachments).map(function (key) {
    var attachment = doc._attachments[key];
    if (attachment.data && typeof attachment.data !== 'string') {
      return new Promise(function (resolve) {
        blobToBase64(attachment.data, resolve);
      }).then(function (b64) {
        attachment.data = b64;
      });
    }
  }));
}

function hasUrlPrefix(opts) {
  if (!opts.prefix) {
    return false;
  }
  var protocol = parseUri(opts.prefix).protocol;
  return protocol === 'http' || protocol === 'https';
}

// Get all the information you possibly can about the URI given by name and
// return it as a suitable object.
function getHost(name, opts) {
  // encode db name if opts.prefix is a url (#5574)
  if (hasUrlPrefix(opts)) {
    var dbName = opts.name.substr(opts.prefix.length);
    // Ensure prefix has a trailing slash
    var prefix = opts.prefix.replace(/\/?$/, '/');
    name = prefix + encodeURIComponent(dbName);
  }

  var uri = parseUri(name);
  if (uri.user || uri.password) {
    uri.auth = {username: uri.user, password: uri.password};
  }

  // Split the path part of the URI into parts using '/' as the delimiter
  // after removing any leading '/' and any trailing '/'
  var parts = uri.path.replace(/(^\/|\/$)/g, '').split('/');

  uri.db = parts.pop();
  // Prevent double encoding of URI component
  if (uri.db.indexOf('%') === -1) {
    uri.db = encodeURIComponent(uri.db);
  }

  uri.path = parts.join('/');

  return uri;
}

// Generate a URL with the host data given by opts and the given path
function genDBUrl(opts, path) {
  return genUrl(opts, opts.db + '/' + path);
}

// Generate a URL with the host data given by opts and the given path
function genUrl(opts, path) {
  // If the host already has a path, then we need to have a path delimiter
  // Otherwise, the path delimiter is the empty string
  var pathDel = !opts.path ? '' : '/';

  // If the host already has a path, then we need to have a path delimiter
  // Otherwise, the path delimiter is the empty string
  return opts.protocol + '://' + opts.host +
         (opts.port ? (':' + opts.port) : '') +
         '/' + opts.path + pathDel + path;
}

function paramsToStr(params) {
  return '?' + Object.keys(params).map(function (k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');
}

function shouldCacheBust(opts) {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) ?
      navigator.userAgent.toLowerCase() : '';
  var isIE = ua.indexOf('msie') !== -1;
  var isTrident = ua.indexOf('trident') !== -1;
  var isEdge = ua.indexOf('edge') !== -1;
  var isGET = !('method' in opts) || opts.method === 'GET';
  return (isIE || isTrident || isEdge) && isGET;
}

// Implements the PouchDB API for dealing with CouchDB instances over HTTP
function HttpPouch(opts, callback) {

  // The functions that will be publicly available for HttpPouch
  var api = this;

  var host = getHost(opts.name, opts);
  var dbUrl = genDBUrl(host, '');

  opts = clone(opts);

  var ourFetch = function (url, options) {

    options = options || {};
    options.headers = options.headers || new h();

    options.credentials = 'include';

    if (opts.auth || host.auth) {
      var nAuth = opts.auth || host.auth;
      var str = nAuth.username + ':' + nAuth.password;
      var token = thisBtoa(unescape(encodeURIComponent(str)));
      options.headers.set('Authorization', 'Basic ' + token);
    }

    var headers = opts.headers || {};
    Object.keys(headers).forEach(function (key) {
      options.headers.append(key, headers[key]);
    });

    /* istanbul ignore if */
    if (shouldCacheBust(options)) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + '_nonce=' + Date.now();
    }

    var fetchFun = opts.fetch || f$1;
    return fetchFun(url, options);
  };

  function adapterFun$$1(name, fun) {
    return adapterFun(name, getArguments(function (args) {
      setup().then(function () {
        return fun.apply(this, args);
      }).catch(function (e) {
        var callback = args.pop();
        callback(e);
      });
    })).bind(api);
  }

  function fetchJSON(url, options, callback) {

    var result = {};

    options = options || {};
    options.headers = options.headers || new h();

    if (!options.headers.get('Content-Type')) {
      options.headers.set('Content-Type', 'application/json');
    }
    if (!options.headers.get('Accept')) {
      options.headers.set('Accept', 'application/json');
    }

    return ourFetch(url, options).then(function (response) {
      result.ok = response.ok;
      result.status = response.status;
      return response.json();
    }).then(function (json) {
      result.data = json;
      if (!result.ok) {
        result.data.status = result.status;
        var err = generateErrorFromResponse(result.data);
        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      }

      if (Array.isArray(result.data)) {
        result.data = result.data.map(function (v) {
          if (v.error || v.missing) {
            return generateErrorFromResponse(v);
          } else {
            return v;
          }
        });
      }

      if (callback) {
        callback(null, result.data);
      } else {
        return result;
      }
    });
  }

  var setupPromise;

  function setup() {
    if (opts.skip_setup) {
      return Promise.resolve();
    }

    // If there is a setup in process or previous successful setup
    // done then we will use that
    // If previous setups have been rejected we will try again
    if (setupPromise) {
      return setupPromise;
    }

    setupPromise = fetchJSON(dbUrl).catch(function (err) {
      if (err && err.status && err.status === 404) {
        // Doesnt exist, create it
        explainError(404, 'PouchDB is just detecting if the remote exists.');
        return fetchJSON(dbUrl, {method: 'PUT'});
      } else {
        return Promise.reject(err);
      }
    }).catch(function (err) {
      // If we try to create a database that already exists, skipped in
      // istanbul since its catching a race condition.
      /* istanbul ignore if */
      if (err && err.status && err.status === 412) {
        return true;
      }
      return Promise.reject(err);
    });

    setupPromise.catch(function () {
      setupPromise = null;
    });

    return setupPromise;
  }

  immediate(function () {
    callback(null, api);
  });

  api._remote = true;

  /* istanbul ignore next */
  api.type = function () {
    return 'http';
  };

  api.id = adapterFun$$1('id', function (callback) {
    ourFetch(genUrl(host, '')).then(function (response) {
      return response.json();
    }).catch(function () {
      return {};
    }).then(function (result) {
      // Bad response or missing `uuid` should not prevent ID generation.
      var uuid$$1 = (result && result.uuid) ?
          (result.uuid + host.db) : genDBUrl(host, '');
      callback(null, uuid$$1);
    });
  });

  // Sends a POST request to the host calling the couchdb _compact function
  //    version: The version of CouchDB it is running
  api.compact = adapterFun$$1('compact', function (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = clone(opts);

    fetchJSON(genDBUrl(host, '_compact'), {method: 'POST'}).then(function () {
      function ping() {
        api.info(function (err, res) {
          // CouchDB may send a "compact_running:true" if it's
          // already compacting. PouchDB Server doesn't.
          /* istanbul ignore else */
          if (res && !res.compact_running) {
            callback(null, {ok: true});
          } else {
            setTimeout(ping, opts.interval || 200);
          }
        });
      }
      // Ping the http if it's finished compaction
      ping();
    });
  });

  api.bulkGet = adapterFun('bulkGet', function (opts, callback) {
    var self = this;

    function doBulkGet(cb) {
      var params = {};
      if (opts.revs) {
        params.revs = true;
      }
      if (opts.attachments) {
        /* istanbul ignore next */
        params.attachments = true;
      }
      if (opts.latest) {
        params.latest = true;
      }
      fetchJSON(genDBUrl(host, '_bulk_get' + paramsToStr(params)), {
        method: 'POST',
        body: JSON.stringify({ docs: opts.docs})
      }).then(function (result) {
        if (opts.attachments && opts.binary) {
          result.data.results.forEach(function (res) {
            res.docs.forEach(readAttachmentsAsBlobOrBuffer);
          });
        }
        cb(null, result.data);
      }).catch(cb);
    }

    /* istanbul ignore next */
    function doBulkGetShim() {
      // avoid "url too long error" by splitting up into multiple requests
      var batchSize = MAX_SIMULTANEOUS_REVS;
      var numBatches = Math.ceil(opts.docs.length / batchSize);
      var numDone = 0;
      var results = new Array(numBatches);

      function onResult(batchNum) {
        return function (err, res) {
          // err is impossible because shim returns a list of errs in that case
          results[batchNum] = res.results;
          if (++numDone === numBatches) {
            callback(null, {results: flatten(results)});
          }
        };
      }

      for (var i = 0; i < numBatches; i++) {
        var subOpts = pick(opts, ['revs', 'attachments', 'binary', 'latest']);
        subOpts.docs = opts.docs.slice(i * batchSize,
          Math.min(opts.docs.length, (i + 1) * batchSize));
        bulkGet(self, subOpts, onResult(i));
      }
    }

    // mark the whole database as either supporting or not supporting _bulk_get
    var dbUrl = genUrl(host, '');
    var supportsBulkGet = supportsBulkGetMap[dbUrl];

    /* istanbul ignore next */
    if (typeof supportsBulkGet !== 'boolean') {
      // check if this database supports _bulk_get
      doBulkGet(function (err, res) {
        if (err) {
          supportsBulkGetMap[dbUrl] = false;
          explainError(
            err.status,
            'PouchDB is just detecting if the remote ' +
            'supports the _bulk_get API.'
          );
          doBulkGetShim();
        } else {
          supportsBulkGetMap[dbUrl] = true;
          callback(null, res);
        }
      });
    } else if (supportsBulkGet) {
      doBulkGet(callback);
    } else {
      doBulkGetShim();
    }
  });

  // Calls GET on the host, which gets back a JSON string containing
  //    couchdb: A welcome string
  //    version: The version of CouchDB it is running
  api._info = function (callback) {
    setup().then(function () {
      return ourFetch(genDBUrl(host, ''));
    }).then(function (response) {
      return response.json();
    }).then(function (info) {
      info.host = genDBUrl(host, '');
      callback(null, info);
    }).catch(callback);
  };

  api.fetch = function (path, options) {
    return setup().then(function () {
      var url = path.substring(0, 1) === '/' ?
        genUrl(host, path.substring(1)) :
        genDBUrl(host, path);
      return ourFetch(url, options);
    });
  };

  // Get the document with the given id from the database given by host.
  // The id could be solely the _id in the database, or it may be a
  // _design/ID or _local/ID path
  api.get = adapterFun$$1('get', function (id, opts, callback) {
    // If no options were given, set the callback to the second parameter
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = clone(opts);

    // List of parameters to add to the GET request
    var params = {};

    if (opts.revs) {
      params.revs = true;
    }

    if (opts.revs_info) {
      params.revs_info = true;
    }

    if (opts.latest) {
      params.latest = true;
    }

    if (opts.open_revs) {
      if (opts.open_revs !== "all") {
        opts.open_revs = JSON.stringify(opts.open_revs);
      }
      params.open_revs = opts.open_revs;
    }

    if (opts.rev) {
      params.rev = opts.rev;
    }

    if (opts.conflicts) {
      params.conflicts = opts.conflicts;
    }

    /* istanbul ignore if */
    if (opts.update_seq) {
      params.update_seq = opts.update_seq;
    }

    id = encodeDocId(id);

    function fetchAttachments(doc) {
      var atts = doc._attachments;
      var filenames = atts && Object.keys(atts);
      if (!atts || !filenames.length) {
        return;
      }
      // we fetch these manually in separate XHRs, because
      // Sync Gateway would normally send it back as multipart/mixed,
      // which we cannot parse. Also, this is more efficient than
      // receiving attachments as base64-encoded strings.
      function fetchData(filename) {
        var att = atts[filename];
        var path = encodeDocId(doc._id) + '/' + encodeAttachmentId(filename) +
            '?rev=' + doc._rev;
        return ourFetch(genDBUrl(host, path)).then(function (response) {
          if ('buffer' in response) {
            return response.buffer();
          } else {
            /* istanbul ignore next */
            return response.blob();
          }
        }).then(function (blob) {
          if (opts.binary) {
            var typeFieldDescriptor = Object.getOwnPropertyDescriptor(blob.__proto__, 'type');
            if (!typeFieldDescriptor || typeFieldDescriptor.set) {
              blob.type = att.content_type;
            }
            return blob;
          }
          return new Promise(function (resolve) {
            blobToBase64(blob, resolve);
          });
        }).then(function (data) {
          delete att.stub;
          delete att.length;
          att.data = data;
        });
      }

      var promiseFactories = filenames.map(function (filename) {
        return function () {
          return fetchData(filename);
        };
      });

      // This limits the number of parallel xhr requests to 5 any time
      // to avoid issues with maximum browser request limits
      return pool(promiseFactories, 5);
    }

    function fetchAllAttachments(docOrDocs) {
      if (Array.isArray(docOrDocs)) {
        return Promise.all(docOrDocs.map(function (doc) {
          if (doc.ok) {
            return fetchAttachments(doc.ok);
          }
        }));
      }
      return fetchAttachments(docOrDocs);
    }

    var url = genDBUrl(host, id + paramsToStr(params));
    fetchJSON(url).then(function (res) {
      return Promise.resolve().then(function () {
        if (opts.attachments) {
          return fetchAllAttachments(res.data);
        }
      }).then(function () {
        callback(null, res.data);
      });
    }).catch(function (e) {
      e.docId = id;
      callback(e);
    });
  });


  // Delete the document given by doc from the database given by host.
  api.remove = adapterFun$$1('remove', function (docOrId, optsOrRev, opts, cb) {
    var doc;
    if (typeof optsOrRev === 'string') {
      // id, rev, opts, callback style
      doc = {
        _id: docOrId,
        _rev: optsOrRev
      };
      if (typeof opts === 'function') {
        cb = opts;
        opts = {};
      }
    } else {
      // doc, opts, callback style
      doc = docOrId;
      if (typeof optsOrRev === 'function') {
        cb = optsOrRev;
        opts = {};
      } else {
        cb = opts;
        opts = optsOrRev;
      }
    }

    var rev$$1 = (doc._rev || opts.rev);
    var url = genDBUrl(host, encodeDocId(doc._id)) + '?rev=' + rev$$1;

    fetchJSON(url, {method: 'DELETE'}, cb).catch(cb);
  });

  function encodeAttachmentId(attachmentId) {
    return attachmentId.split("/").map(encodeURIComponent).join("/");
  }

  // Get the attachment
  api.getAttachment = adapterFun$$1('getAttachment', function (docId, attachmentId,
                                                            opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    var params = opts.rev ? ('?rev=' + opts.rev) : '';
    var url = genDBUrl(host, encodeDocId(docId)) + '/' +
        encodeAttachmentId(attachmentId) + params;
    var contentType;
    ourFetch(url, {method: 'GET'}).then(function (response) {
      contentType = response.headers.get('content-type');
      if (!response.ok) {
        throw response;
      } else {
        if (typeof process !== 'undefined' && !process.browser && typeof response.buffer === 'function') {
          return response.buffer();
        } else {
          /* istanbul ignore next */
          return response.blob();
        }
      }
    }).then(function (blob) {
      // TODO: also remove
      if (typeof process !== 'undefined' && !process.browser) {
        blob.type = contentType;
      }
      callback(null, blob);
    }).catch(function (err) {
      callback(err);
    });
  });

  // Remove the attachment given by the id and rev
  api.removeAttachment =  adapterFun$$1('removeAttachment', function (docId,
                                                                   attachmentId,
                                                                   rev$$1,
                                                                   callback) {
    var url = genDBUrl(host, encodeDocId(docId) + '/' +
                       encodeAttachmentId(attachmentId)) + '?rev=' + rev$$1;
    fetchJSON(url, {method: 'DELETE'}, callback).catch(callback);
  });

  // Add the attachment given by blob and its contentType property
  // to the document with the given id, the revision given by rev, and
  // add it to the database given by host.
  api.putAttachment = adapterFun$$1('putAttachment', function (docId, attachmentId,
                                                            rev$$1, blob,
                                                            type, callback) {
    if (typeof type === 'function') {
      callback = type;
      type = blob;
      blob = rev$$1;
      rev$$1 = null;
    }
    var id = encodeDocId(docId) + '/' + encodeAttachmentId(attachmentId);
    var url = genDBUrl(host, id);
    if (rev$$1) {
      url += '?rev=' + rev$$1;
    }

    if (typeof blob === 'string') {
      // input is assumed to be a base64 string
      var binary;
      try {
        binary = thisAtob(blob);
      } catch (err) {
        return callback(createError(BAD_ARG,
                        'Attachment is not a valid base64 string'));
      }
      blob = binary ? binStringToBluffer(binary, type) : '';
    }

    // Add the attachment
    fetchJSON(url, {
      headers: new h({'Content-Type': type}),
      method: 'PUT',
      body: blob
    }, callback).catch(callback);
  });

  // Update/create multiple documents given by req in the database
  // given by host.
  api._bulkDocs = function (req, opts, callback) {
    // If new_edits=false then it prevents the database from creating
    // new revision numbers for the documents. Instead it just uses
    // the old ones. This is used in database replication.
    req.new_edits = opts.new_edits;

    setup().then(function () {
      return Promise.all(req.docs.map(preprocessAttachments$1));
    }).then(function () {
      // Update/create the documents
      return fetchJSON(genDBUrl(host, '_bulk_docs'), {
        method: 'POST',
        body: JSON.stringify(req)
      }, callback);
    }).catch(callback);
  };


  // Update/create document
  api._put = function (doc, opts, callback) {
    setup().then(function () {
      return preprocessAttachments$1(doc);
    }).then(function () {
      return fetchJSON(genDBUrl(host, encodeDocId(doc._id)), {
        method: 'PUT',
        body: JSON.stringify(doc)
      });
    }).then(function (result) {
      callback(null, result.data);
    }).catch(function (err) {
      err.docId = doc && doc._id;
      callback(err);
    });
  };


  // Get a listing of the documents in the database given
  // by host and ordered by increasing id.
  api.allDocs = adapterFun$$1('allDocs', function (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = clone(opts);

    // List of parameters to add to the GET request
    var params = {};
    var body;
    var method = 'GET';

    if (opts.conflicts) {
      params.conflicts = true;
    }

    /* istanbul ignore if */
    if (opts.update_seq) {
      params.update_seq = true;
    }

    if (opts.descending) {
      params.descending = true;
    }

    if (opts.include_docs) {
      params.include_docs = true;
    }

    // added in CouchDB 1.6.0
    if (opts.attachments) {
      params.attachments = true;
    }

    if (opts.key) {
      params.key = JSON.stringify(opts.key);
    }

    if (opts.start_key) {
      opts.startkey = opts.start_key;
    }

    if (opts.startkey) {
      params.startkey = JSON.stringify(opts.startkey);
    }

    if (opts.end_key) {
      opts.endkey = opts.end_key;
    }

    if (opts.endkey) {
      params.endkey = JSON.stringify(opts.endkey);
    }

    if (typeof opts.inclusive_end !== 'undefined') {
      params.inclusive_end = !!opts.inclusive_end;
    }

    if (typeof opts.limit !== 'undefined') {
      params.limit = opts.limit;
    }

    if (typeof opts.skip !== 'undefined') {
      params.skip = opts.skip;
    }

    var paramStr = paramsToStr(params);

    if (typeof opts.keys !== 'undefined') {
      method = 'POST';
      body = {keys: opts.keys};
    }

    fetchJSON(genDBUrl(host, '_all_docs' + paramStr), {
       method: method,
      body: JSON.stringify(body)
    }).then(function (result) {
      if (opts.include_docs && opts.attachments && opts.binary) {
        result.data.rows.forEach(readAttachmentsAsBlobOrBuffer);
      }
      callback(null, result.data);
    }).catch(callback);
  });

  // Get a list of changes made to documents in the database given by host.
  // TODO According to the README, there should be two other methods here,
  // api.changes.addListener and api.changes.removeListener.
  api._changes = function (opts) {

    // We internally page the results of a changes request, this means
    // if there is a large set of changes to be returned we can start
    // processing them quicker instead of waiting on the entire
    // set of changes to return and attempting to process them at once
    var batchSize = 'batch_size' in opts ? opts.batch_size : CHANGES_BATCH_SIZE;

    opts = clone(opts);

    if (opts.continuous && !('heartbeat' in opts)) {
      opts.heartbeat = DEFAULT_HEARTBEAT;
    }

    var requestTimeout = ('timeout' in opts) ? opts.timeout : 30 * 1000;

    // ensure CHANGES_TIMEOUT_BUFFER applies
    if ('timeout' in opts && opts.timeout &&
      (requestTimeout - opts.timeout) < CHANGES_TIMEOUT_BUFFER) {
        requestTimeout = opts.timeout + CHANGES_TIMEOUT_BUFFER;
    }

    /* istanbul ignore if */
    if ('heartbeat' in opts && opts.heartbeat &&
       (requestTimeout - opts.heartbeat) < CHANGES_TIMEOUT_BUFFER) {
        requestTimeout = opts.heartbeat + CHANGES_TIMEOUT_BUFFER;
    }

    var params = {};
    if ('timeout' in opts && opts.timeout) {
      params.timeout = opts.timeout;
    }

    var limit = (typeof opts.limit !== 'undefined') ? opts.limit : false;
    var leftToFetch = limit;

    if (opts.style) {
      params.style = opts.style;
    }

    if (opts.include_docs || opts.filter && typeof opts.filter === 'function') {
      params.include_docs = true;
    }

    if (opts.attachments) {
      params.attachments = true;
    }

    if (opts.continuous) {
      params.feed = 'longpoll';
    }

    if (opts.seq_interval) {
      params.seq_interval = opts.seq_interval;
    }

    if (opts.conflicts) {
      params.conflicts = true;
    }

    if (opts.descending) {
      params.descending = true;
    }

    /* istanbul ignore if */
    if (opts.update_seq) {
      params.update_seq = true;
    }

    if ('heartbeat' in opts) {
      // If the heartbeat value is false, it disables the default heartbeat
      if (opts.heartbeat) {
        params.heartbeat = opts.heartbeat;
      }
    }

    if (opts.filter && typeof opts.filter === 'string') {
      params.filter = opts.filter;
    }

    if (opts.view && typeof opts.view === 'string') {
      params.filter = '_view';
      params.view = opts.view;
    }

    // If opts.query_params exists, pass it through to the changes request.
    // These parameters may be used by the filter on the source database.
    if (opts.query_params && typeof opts.query_params === 'object') {
      for (var param_name in opts.query_params) {
        /* istanbul ignore else */
        if (opts.query_params.hasOwnProperty(param_name)) {
          params[param_name] = opts.query_params[param_name];
        }
      }
    }

    var method = 'GET';
    var body;

    if (opts.doc_ids) {
      // set this automagically for the user; it's annoying that couchdb
      // requires both a "filter" and a "doc_ids" param.
      params.filter = '_doc_ids';
      method = 'POST';
      body = {doc_ids: opts.doc_ids };
    }
    /* istanbul ignore next */
    else if (opts.selector) {
      // set this automagically for the user, similar to above
      params.filter = '_selector';
      method = 'POST';
      body = {selector: opts.selector };
    }

    var controller = new a();
    var lastFetchedSeq;

    // Get all the changes starting wtih the one immediately after the
    // sequence number given by since.
    var fetchData = function (since, callback) {
      if (opts.aborted) {
        return;
      }
      params.since = since;
      // "since" can be any kind of json object in Cloudant/CouchDB 2.x
      /* istanbul ignore next */
      if (typeof params.since === "object") {
        params.since = JSON.stringify(params.since);
      }

      if (opts.descending) {
        if (limit) {
          params.limit = leftToFetch;
        }
      } else {
        params.limit = (!limit || leftToFetch > batchSize) ?
          batchSize : leftToFetch;
      }

      // Set the options for the ajax call
      var url = genDBUrl(host, '_changes' + paramsToStr(params));
      var fetchOpts = {
        signal: controller.signal,
        method: method,
        body: JSON.stringify(body)
      };
      lastFetchedSeq = since;

      /* istanbul ignore if */
      if (opts.aborted) {
        return;
      }

      // Get the changes
      setup().then(function () {
        return fetchJSON(url, fetchOpts, callback);
      }).catch(callback);
    };

    // If opts.since exists, get all the changes from the sequence
    // number given by opts.since. Otherwise, get all the changes
    // from the sequence number 0.
    var results = {results: []};

    var fetched = function (err, res) {
      if (opts.aborted) {
        return;
      }
      var raw_results_length = 0;
      // If the result of the ajax call (res) contains changes (res.results)
      if (res && res.results) {
        raw_results_length = res.results.length;
        results.last_seq = res.last_seq;
        var pending = null;
        var lastSeq = null;
        // Attach 'pending' property if server supports it (CouchDB 2.0+)
        /* istanbul ignore if */
        if (typeof res.pending === 'number') {
          pending = res.pending;
        }
        if (typeof results.last_seq === 'string' || typeof results.last_seq === 'number') {
          lastSeq = results.last_seq;
        }
        // For each change
        var req = {};
        req.query = opts.query_params;
        res.results = res.results.filter(function (c) {
          leftToFetch--;
          var ret = filterChange(opts)(c);
          if (ret) {
            if (opts.include_docs && opts.attachments && opts.binary) {
              readAttachmentsAsBlobOrBuffer(c);
            }
            if (opts.return_docs) {
              results.results.push(c);
            }
            opts.onChange(c, pending, lastSeq);
          }
          return ret;
        });
      } else if (err) {
        // In case of an error, stop listening for changes and call
        // opts.complete
        opts.aborted = true;
        opts.complete(err);
        return;
      }

      // The changes feed may have timed out with no results
      // if so reuse last update sequence
      if (res && res.last_seq) {
        lastFetchedSeq = res.last_seq;
      }

      var finished = (limit && leftToFetch <= 0) ||
        (res && raw_results_length < batchSize) ||
        (opts.descending);

      if ((opts.continuous && !(limit && leftToFetch <= 0)) || !finished) {
        // Queue a call to fetch again with the newest sequence number
        immediate(function () { fetchData(lastFetchedSeq, fetched); });
      } else {
        // We're done, call the callback
        opts.complete(null, results);
      }
    };

    fetchData(opts.since || 0, fetched);

    // Return a method to cancel this method from processing any more
    return {
      cancel: function () {
        opts.aborted = true;
        controller.abort();
      }
    };
  };

  // Given a set of document/revision IDs (given by req), tets the subset of
  // those that do NOT correspond to revisions stored in the database.
  // See http://wiki.apache.org/couchdb/HttpPostRevsDiff
  api.revsDiff = adapterFun$$1('revsDiff', function (req, opts, callback) {
    // If no options were given, set the callback to be the second parameter
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    // Get the missing document/revision IDs
    fetchJSON(genDBUrl(host, '_revs_diff'), {
      method: 'POST',
      body: JSON.stringify(req)
    }, callback).catch(callback);
  });

  api._close = function (callback) {
    callback();
  };

  api._destroy = function (options, callback) {
    fetchJSON(genDBUrl(host, ''), {method: 'DELETE'}).then(function (json) {
      callback(null, json);
    }).catch(function (err) {
      /* istanbul ignore if */
      if (err.status === 404) {
        callback(null, {ok: true});
      } else {
        callback(err);
      }
    });
  };
}

// HttpPouch is a valid adapter.
HttpPouch.valid = function () {
  return true;
};

function HttpPouch$1 (PouchDB) {
  PouchDB.adapter('http', HttpPouch, false);
  PouchDB.adapter('https', HttpPouch, false);
}

function QueryParseError(message) {
  this.status = 400;
  this.name = 'query_parse_error';
  this.message = message;
  this.error = true;
  try {
    Error.captureStackTrace(this, QueryParseError);
  } catch (e) {}
}

inherits(QueryParseError, Error);

function NotFoundError(message) {
  this.status = 404;
  this.name = 'not_found';
  this.message = message;
  this.error = true;
  try {
    Error.captureStackTrace(this, NotFoundError);
  } catch (e) {}
}

inherits(NotFoundError, Error);

function BuiltInError(message) {
  this.status = 500;
  this.name = 'invalid_value';
  this.message = message;
  this.error = true;
  try {
    Error.captureStackTrace(this, BuiltInError);
  } catch (e) {}
}

inherits(BuiltInError, Error);

function promisedCallback(promise, callback) {
  if (callback) {
    promise.then(function (res) {
      immediate(function () {
        callback(null, res);
      });
    }, function (reason) {
      immediate(function () {
        callback(reason);
      });
    });
  }
  return promise;
}

function callbackify(fun) {
  return getArguments(function (args) {
    var cb = args.pop();
    var promise = fun.apply(this, args);
    if (typeof cb === 'function') {
      promisedCallback(promise, cb);
    }
    return promise;
  });
}

// Promise finally util similar to Q.finally
function fin(promise, finalPromiseFactory) {
  return promise.then(function (res) {
    return finalPromiseFactory().then(function () {
      return res;
    });
  }, function (reason) {
    return finalPromiseFactory().then(function () {
      throw reason;
    });
  });
}

function sequentialize(queue, promiseFactory) {
  return function () {
    var args = arguments;
    var that = this;
    return queue.add(function () {
      return promiseFactory.apply(that, args);
    });
  };
}

// uniq an array of strings, order not guaranteed
// similar to underscore/lodash _.uniq
function uniq(arr) {
  var theSet = new ExportedSet(arr);
  var result = new Array(theSet.size);
  var index = -1;
  theSet.forEach(function (value) {
    result[++index] = value;
  });
  return result;
}

function mapToKeysArray(map) {
  var result = new Array(map.size);
  var index = -1;
  map.forEach(function (value, key) {
    result[++index] = key;
  });
  return result;
}

function createBuiltInError(name) {
  var message = 'builtin ' + name +
    ' function requires map values to be numbers' +
    ' or number arrays';
  return new BuiltInError(message);
}

function sum(values) {
  var result = 0;
  for (var i = 0, len = values.length; i < len; i++) {
    var num = values[i];
    if (typeof num !== 'number') {
      if (Array.isArray(num)) {
        // lists of numbers are also allowed, sum them separately
        result = typeof result === 'number' ? [result] : result;
        for (var j = 0, jLen = num.length; j < jLen; j++) {
          var jNum = num[j];
          if (typeof jNum !== 'number') {
            throw createBuiltInError('_sum');
          } else if (typeof result[j] === 'undefined') {
            result.push(jNum);
          } else {
            result[j] += jNum;
          }
        }
      } else { // not array/number
        throw createBuiltInError('_sum');
      }
    } else if (typeof result === 'number') {
      result += num;
    } else { // add number to array
      result[0] += num;
    }
  }
  return result;
}

var log = guardedConsole.bind(null, 'log');
var isArray = Array.isArray;
var toJSON = JSON.parse;

function evalFunctionWithEval(func, emit) {
  return scopeEval(
    "return (" + func.replace(/;\s*$/, "") + ");",
    {
      emit: emit,
      sum: sum,
      log: log,
      isArray: isArray,
      toJSON: toJSON
    }
  );
}

/*
 * Simple task queue to sequentialize actions. Assumes
 * callbacks will eventually fire (once).
 */


function TaskQueue$1() {
  this.promise = new Promise(function (fulfill) {fulfill(); });
}
TaskQueue$1.prototype.add = function (promiseFactory) {
  this.promise = this.promise.catch(function () {
    // just recover
  }).then(function () {
    return promiseFactory();
  });
  return this.promise;
};
TaskQueue$1.prototype.finish = function () {
  return this.promise;
};

function stringify(input) {
  if (!input) {
    return 'undefined'; // backwards compat for empty reduce
  }
  // for backwards compat with mapreduce, functions/strings are stringified
  // as-is. everything else is JSON-stringified.
  switch (typeof input) {
    case 'function':
      // e.g. a mapreduce map
      return input.toString();
    case 'string':
      // e.g. a mapreduce built-in _reduce function
      return input.toString();
    default:
      // e.g. a JSON object in the case of mango queries
      return JSON.stringify(input);
  }
}

/* create a string signature for a view so we can cache it and uniq it */
function createViewSignature(mapFun, reduceFun) {
  // the "undefined" part is for backwards compatibility
  return stringify(mapFun) + stringify(reduceFun) + 'undefined';
}

function createView(sourceDB, viewName, mapFun, reduceFun, temporary, localDocName) {
  var viewSignature = createViewSignature(mapFun, reduceFun);

  var cachedViews;
  if (!temporary) {
    // cache this to ensure we don't try to update the same view twice
    cachedViews = sourceDB._cachedViews = sourceDB._cachedViews || {};
    if (cachedViews[viewSignature]) {
      return cachedViews[viewSignature];
    }
  }

  var promiseForView = sourceDB.info().then(function (info) {

    var depDbName = info.db_name + '-mrview-' +
      (temporary ? 'temp' : stringMd5(viewSignature));

    // save the view name in the source db so it can be cleaned up if necessary
    // (e.g. when the _design doc is deleted, remove all associated view data)
    function diffFunction(doc) {
      doc.views = doc.views || {};
      var fullViewName = viewName;
      if (fullViewName.indexOf('/') === -1) {
        fullViewName = viewName + '/' + viewName;
      }
      var depDbs = doc.views[fullViewName] = doc.views[fullViewName] || {};
      /* istanbul ignore if */
      if (depDbs[depDbName]) {
        return; // no update necessary
      }
      depDbs[depDbName] = true;
      return doc;
    }
    return upsert(sourceDB, '_local/' + localDocName, diffFunction).then(function () {
      return sourceDB.registerDependentDatabase(depDbName).then(function (res) {
        var db = res.db;
        db.auto_compaction = true;
        var view = {
          name: depDbName,
          db: db,
          sourceDB: sourceDB,
          adapter: sourceDB.adapter,
          mapFun: mapFun,
          reduceFun: reduceFun
        };
        return view.db.get('_local/lastSeq').catch(function (err) {
          /* istanbul ignore if */
          if (err.status !== 404) {
            throw err;
          }
        }).then(function (lastSeqDoc) {
          view.seq = lastSeqDoc ? lastSeqDoc.seq : 0;
          if (cachedViews) {
            view.db.once('destroyed', function () {
              delete cachedViews[viewSignature];
            });
          }
          return view;
        });
      });
    });
  });

  if (cachedViews) {
    cachedViews[viewSignature] = promiseForView;
  }
  return promiseForView;
}

var persistentQueues = {};
var tempViewQueue = new TaskQueue$1();
var CHANGES_BATCH_SIZE$1 = 50;

function parseViewName(name) {
  // can be either 'ddocname/viewname' or just 'viewname'
  // (where the ddoc name is the same)
  return name.indexOf('/') === -1 ? [name, name] : name.split('/');
}

function isGenOne(changes) {
  // only return true if the current change is 1-
  // and there are no other leafs
  return changes.length === 1 && /^1-/.test(changes[0].rev);
}

function emitError(db, e) {
  try {
    db.emit('error', e);
  } catch (err) {
    guardedConsole('error',
      'The user\'s map/reduce function threw an uncaught error.\n' +
      'You can debug this error by doing:\n' +
      'myDatabase.on(\'error\', function (err) { debugger; });\n' +
      'Please double-check your map/reduce function.');
    guardedConsole('error', e);
  }
}

/**
 * Returns an "abstract" mapreduce object of the form:
 *
 *   {
 *     query: queryFun,
 *     viewCleanup: viewCleanupFun
 *   }
 *
 * Arguments are:
 *
 * localDoc: string
 *   This is for the local doc that gets saved in order to track the
 *   "dependent" DBs and clean them up for viewCleanup. It should be
 *   unique, so that indexer plugins don't collide with each other.
 * mapper: function (mapFunDef, emit)
 *   Returns a map function based on the mapFunDef, which in the case of
 *   normal map/reduce is just the de-stringified function, but may be
 *   something else, such as an object in the case of pouchdb-find.
 * reducer: function (reduceFunDef)
 *   Ditto, but for reducing. Modules don't have to support reducing
 *   (e.g. pouchdb-find).
 * ddocValidator: function (ddoc, viewName)
 *   Throws an error if the ddoc or viewName is not valid.
 *   This could be a way to communicate to the user that the configuration for the
 *   indexer is invalid.
 */
function createAbstractMapReduce(localDocName, mapper, reducer, ddocValidator) {

  function tryMap(db, fun, doc) {
    // emit an event if there was an error thrown by a map function.
    // putting try/catches in a single function also avoids deoptimizations.
    try {
      fun(doc);
    } catch (e) {
      emitError(db, e);
    }
  }

  function tryReduce(db, fun, keys, values, rereduce) {
    // same as above, but returning the result or an error. there are two separate
    // functions to avoid extra memory allocations since the tryCode() case is used
    // for custom map functions (common) vs this function, which is only used for
    // custom reduce functions (rare)
    try {
      return {output : fun(keys, values, rereduce)};
    } catch (e) {
      emitError(db, e);
      return {error: e};
    }
  }

  function sortByKeyThenValue(x, y) {
    var keyCompare = collate(x.key, y.key);
    return keyCompare !== 0 ? keyCompare : collate(x.value, y.value);
  }

  function sliceResults(results, limit, skip) {
    skip = skip || 0;
    if (typeof limit === 'number') {
      return results.slice(skip, limit + skip);
    } else if (skip > 0) {
      return results.slice(skip);
    }
    return results;
  }

  function rowToDocId(row) {
    var val = row.value;
    // Users can explicitly specify a joined doc _id, or it
    // defaults to the doc _id that emitted the key/value.
    var docId = (val && typeof val === 'object' && val._id) || row.id;
    return docId;
  }

  function readAttachmentsAsBlobOrBuffer(res) {
    res.rows.forEach(function (row) {
      var atts = row.doc && row.doc._attachments;
      if (!atts) {
        return;
      }
      Object.keys(atts).forEach(function (filename) {
        var att = atts[filename];
        atts[filename].data = b64ToBluffer(att.data, att.content_type);
      });
    });
  }

  function postprocessAttachments(opts) {
    return function (res) {
      if (opts.include_docs && opts.attachments && opts.binary) {
        readAttachmentsAsBlobOrBuffer(res);
      }
      return res;
    };
  }

  function addHttpParam(paramName, opts, params, asJson) {
    // add an http param from opts to params, optionally json-encoded
    var val = opts[paramName];
    if (typeof val !== 'undefined') {
      if (asJson) {
        val = encodeURIComponent(JSON.stringify(val));
      }
      params.push(paramName + '=' + val);
    }
  }

  function coerceInteger(integerCandidate) {
    if (typeof integerCandidate !== 'undefined') {
      var asNumber = Number(integerCandidate);
      // prevents e.g. '1foo' or '1.1' being coerced to 1
      if (!isNaN(asNumber) && asNumber === parseInt(integerCandidate, 10)) {
        return asNumber;
      } else {
        return integerCandidate;
      }
    }
  }

  function coerceOptions(opts) {
    opts.group_level = coerceInteger(opts.group_level);
    opts.limit = coerceInteger(opts.limit);
    opts.skip = coerceInteger(opts.skip);
    return opts;
  }

  function checkPositiveInteger(number) {
    if (number) {
      if (typeof number !== 'number') {
        return  new QueryParseError('Invalid value for integer: "' +
          number + '"');
      }
      if (number < 0) {
        return new QueryParseError('Invalid value for positive integer: ' +
          '"' + number + '"');
      }
    }
  }

  function checkQueryParseError(options, fun) {
    var startkeyName = options.descending ? 'endkey' : 'startkey';
    var endkeyName = options.descending ? 'startkey' : 'endkey';

    if (typeof options[startkeyName] !== 'undefined' &&
      typeof options[endkeyName] !== 'undefined' &&
      collate(options[startkeyName], options[endkeyName]) > 0) {
      throw new QueryParseError('No rows can match your key range, ' +
        'reverse your start_key and end_key or set {descending : true}');
    } else if (fun.reduce && options.reduce !== false) {
      if (options.include_docs) {
        throw new QueryParseError('{include_docs:true} is invalid for reduce');
      } else if (options.keys && options.keys.length > 1 &&
        !options.group && !options.group_level) {
        throw new QueryParseError('Multi-key fetches for reduce views must use ' +
          '{group: true}');
      }
    }
    ['group_level', 'limit', 'skip'].forEach(function (optionName) {
      var error = checkPositiveInteger(options[optionName]);
      if (error) {
        throw error;
      }
    });
  }

  function httpQuery(db, fun, opts) {
    // List of parameters to add to the PUT request
    var params = [];
    var body;
    var method = 'GET';
    var ok, status;

    // If opts.reduce exists and is defined, then add it to the list
    // of parameters.
    // If reduce=false then the results are that of only the map function
    // not the final result of map and reduce.
    addHttpParam('reduce', opts, params);
    addHttpParam('include_docs', opts, params);
    addHttpParam('attachments', opts, params);
    addHttpParam('limit', opts, params);
    addHttpParam('descending', opts, params);
    addHttpParam('group', opts, params);
    addHttpParam('group_level', opts, params);
    addHttpParam('skip', opts, params);
    addHttpParam('stale', opts, params);
    addHttpParam('conflicts', opts, params);
    addHttpParam('startkey', opts, params, true);
    addHttpParam('start_key', opts, params, true);
    addHttpParam('endkey', opts, params, true);
    addHttpParam('end_key', opts, params, true);
    addHttpParam('inclusive_end', opts, params);
    addHttpParam('key', opts, params, true);
    addHttpParam('update_seq', opts, params);

    // Format the list of parameters into a valid URI query string
    params = params.join('&');
    params = params === '' ? '' : '?' + params;

    // If keys are supplied, issue a POST to circumvent GET query string limits
    // see http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options
    if (typeof opts.keys !== 'undefined') {
      var MAX_URL_LENGTH = 2000;
      // according to http://stackoverflow.com/a/417184/680742,
      // the de facto URL length limit is 2000 characters

      var keysAsString =
        'keys=' + encodeURIComponent(JSON.stringify(opts.keys));
      if (keysAsString.length + params.length + 1 <= MAX_URL_LENGTH) {
        // If the keys are short enough, do a GET. we do this to work around
        // Safari not understanding 304s on POSTs (see pouchdb/pouchdb#1239)
        params += (params[0] === '?' ? '&' : '?') + keysAsString;
      } else {
        method = 'POST';
        if (typeof fun === 'string') {
          body = {keys: opts.keys};
        } else { // fun is {map : mapfun}, so append to this
          fun.keys = opts.keys;
        }
      }
    }

    // We are referencing a query defined in the design doc
    if (typeof fun === 'string') {
      var parts = parseViewName(fun);
      return db.fetch('_design/' + parts[0] + '/_view/' + parts[1] + params, {
        headers: new h({'Content-Type': 'application/json'}),
        method: method,
        body: JSON.stringify(body)
      }).then(function (response) {
        ok = response.ok;
        status = response.status;
        return response.json();
      }).then(function (result) {
        if (!ok) {
          result.status = status;
          throw generateErrorFromResponse(result);
        }
        // fail the entire request if the result contains an error
        result.rows.forEach(function (row) {
          /* istanbul ignore if */
          if (row.value && row.value.error && row.value.error === "builtin_reduce_error") {
            throw new Error(row.reason);
          }
        });
        return result;
      }).then(postprocessAttachments(opts));
    }

    // We are using a temporary view, terrible for performance, good for testing
    body = body || {};
    Object.keys(fun).forEach(function (key) {
      if (Array.isArray(fun[key])) {
        body[key] = fun[key];
      } else {
        body[key] = fun[key].toString();
      }
    });

    return db.fetch('_temp_view' + params, {
      headers: new h({'Content-Type': 'application/json'}),
      method: 'POST',
      body: JSON.stringify(body)
    }).then(function (response) {
        ok = response.ok;
        status = response.status;
      return response.json();
    }).then(function (result) {
      if (!ok) {
        result.status = status;
        throw generateErrorFromResponse(result);
      }
      return result;
    }).then(postprocessAttachments(opts));
  }

  // custom adapters can define their own api._query
  // and override the default behavior
  /* istanbul ignore next */
  function customQuery(db, fun, opts) {
    return new Promise(function (resolve, reject) {
      db._query(fun, opts, function (err, res) {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }

  // custom adapters can define their own api._viewCleanup
  // and override the default behavior
  /* istanbul ignore next */
  function customViewCleanup(db) {
    return new Promise(function (resolve, reject) {
      db._viewCleanup(function (err, res) {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }

  function defaultsTo(value) {
    return function (reason) {
      /* istanbul ignore else */
      if (reason.status === 404) {
        return value;
      } else {
        throw reason;
      }
    };
  }

  // returns a promise for a list of docs to update, based on the input docId.
  // the order doesn't matter, because post-3.2.0, bulkDocs
  // is an atomic operation in all three adapters.
  function getDocsToPersist(docId, view, docIdsToChangesAndEmits) {
    var metaDocId = '_local/doc_' + docId;
    var defaultMetaDoc = {_id: metaDocId, keys: []};
    var docData = docIdsToChangesAndEmits.get(docId);
    var indexableKeysToKeyValues = docData[0];
    var changes = docData[1];

    function getMetaDoc() {
      if (isGenOne(changes)) {
        // generation 1, so we can safely assume initial state
        // for performance reasons (avoids unnecessary GETs)
        return Promise.resolve(defaultMetaDoc);
      }
      return view.db.get(metaDocId).catch(defaultsTo(defaultMetaDoc));
    }

    function getKeyValueDocs(metaDoc) {
      if (!metaDoc.keys.length) {
        // no keys, no need for a lookup
        return Promise.resolve({rows: []});
      }
      return view.db.allDocs({
        keys: metaDoc.keys,
        include_docs: true
      });
    }

    function processKeyValueDocs(metaDoc, kvDocsRes) {
      var kvDocs = [];
      var oldKeys = new ExportedSet();

      for (var i = 0, len = kvDocsRes.rows.length; i < len; i++) {
        var row = kvDocsRes.rows[i];
        var doc = row.doc;
        if (!doc) { // deleted
          continue;
        }
        kvDocs.push(doc);
        oldKeys.add(doc._id);
        doc._deleted = !indexableKeysToKeyValues.has(doc._id);
        if (!doc._deleted) {
          var keyValue = indexableKeysToKeyValues.get(doc._id);
          if ('value' in keyValue) {
            doc.value = keyValue.value;
          }
        }
      }
      var newKeys = mapToKeysArray(indexableKeysToKeyValues);
      newKeys.forEach(function (key) {
        if (!oldKeys.has(key)) {
          // new doc
          var kvDoc = {
            _id: key
          };
          var keyValue = indexableKeysToKeyValues.get(key);
          if ('value' in keyValue) {
            kvDoc.value = keyValue.value;
          }
          kvDocs.push(kvDoc);
        }
      });
      metaDoc.keys = uniq(newKeys.concat(metaDoc.keys));
      kvDocs.push(metaDoc);

      return kvDocs;
    }

    return getMetaDoc().then(function (metaDoc) {
      return getKeyValueDocs(metaDoc).then(function (kvDocsRes) {
        return processKeyValueDocs(metaDoc, kvDocsRes);
      });
    });
  }

  // updates all emitted key/value docs and metaDocs in the mrview database
  // for the given batch of documents from the source database
  function saveKeyValues(view, docIdsToChangesAndEmits, seq) {
    var seqDocId = '_local/lastSeq';
    return view.db.get(seqDocId)
      .catch(defaultsTo({_id: seqDocId, seq: 0}))
      .then(function (lastSeqDoc) {
        var docIds = mapToKeysArray(docIdsToChangesAndEmits);
        return Promise.all(docIds.map(function (docId) {
          return getDocsToPersist(docId, view, docIdsToChangesAndEmits);
        })).then(function (listOfDocsToPersist) {
          var docsToPersist = flatten(listOfDocsToPersist);
          lastSeqDoc.seq = seq;
          docsToPersist.push(lastSeqDoc);
          // write all docs in a single operation, update the seq once
          return view.db.bulkDocs({docs : docsToPersist});
        });
      });
  }

  function getQueue(view) {
    var viewName = typeof view === 'string' ? view : view.name;
    var queue = persistentQueues[viewName];
    if (!queue) {
      queue = persistentQueues[viewName] = new TaskQueue$1();
    }
    return queue;
  }

  function updateView(view) {
    return sequentialize(getQueue(view), function () {
      return updateViewInQueue(view);
    })();
  }

  function updateViewInQueue(view) {
    // bind the emit function once
    var mapResults;
    var doc;

    function emit(key, value) {
      var output = {id: doc._id, key: normalizeKey(key)};
      // Don't explicitly store the value unless it's defined and non-null.
      // This saves on storage space, because often people don't use it.
      if (typeof value !== 'undefined' && value !== null) {
        output.value = normalizeKey(value);
      }
      mapResults.push(output);
    }

    var mapFun = mapper(view.mapFun, emit);

    var currentSeq = view.seq || 0;

    function processChange(docIdsToChangesAndEmits, seq) {
      return function () {
        return saveKeyValues(view, docIdsToChangesAndEmits, seq);
      };
    }

    var queue = new TaskQueue$1();

    function processNextBatch() {
      return view.sourceDB.changes({
        return_docs: true,
        conflicts: true,
        include_docs: true,
        style: 'all_docs',
        since: currentSeq,
        limit: CHANGES_BATCH_SIZE$1
      }).then(processBatch);
    }

    function processBatch(response) {
      var results = response.results;
      if (!results.length) {
        return;
      }
      var docIdsToChangesAndEmits = createDocIdsToChangesAndEmits(results);
      queue.add(processChange(docIdsToChangesAndEmits, currentSeq));
      if (results.length < CHANGES_BATCH_SIZE$1) {
        return;
      }
      return processNextBatch();
    }

    function createDocIdsToChangesAndEmits(results) {
      var docIdsToChangesAndEmits = new ExportedMap();
      for (var i = 0, len = results.length; i < len; i++) {
        var change = results[i];
        if (change.doc._id[0] !== '_') {
          mapResults = [];
          doc = change.doc;

          if (!doc._deleted) {
            tryMap(view.sourceDB, mapFun, doc);
          }
          mapResults.sort(sortByKeyThenValue);

          var indexableKeysToKeyValues = createIndexableKeysToKeyValues(mapResults);
          docIdsToChangesAndEmits.set(change.doc._id, [
            indexableKeysToKeyValues,
            change.changes
          ]);
        }
        currentSeq = change.seq;
      }
      return docIdsToChangesAndEmits;
    }

    function createIndexableKeysToKeyValues(mapResults) {
      var indexableKeysToKeyValues = new ExportedMap();
      var lastKey;
      for (var i = 0, len = mapResults.length; i < len; i++) {
        var emittedKeyValue = mapResults[i];
        var complexKey = [emittedKeyValue.key, emittedKeyValue.id];
        if (i > 0 && collate(emittedKeyValue.key, lastKey) === 0) {
          complexKey.push(i); // dup key+id, so make it unique
        }
        indexableKeysToKeyValues.set(toIndexableString(complexKey), emittedKeyValue);
        lastKey = emittedKeyValue.key;
      }
      return indexableKeysToKeyValues;
    }

    return processNextBatch().then(function () {
      return queue.finish();
    }).then(function () {
      view.seq = currentSeq;
    });
  }

  function reduceView(view, results, options) {
    if (options.group_level === 0) {
      delete options.group_level;
    }

    var shouldGroup = options.group || options.group_level;

    var reduceFun = reducer(view.reduceFun);

    var groups = [];
    var lvl = isNaN(options.group_level) ? Number.POSITIVE_INFINITY :
      options.group_level;
    results.forEach(function (e) {
      var last = groups[groups.length - 1];
      var groupKey = shouldGroup ? e.key : null;

      // only set group_level for array keys
      if (shouldGroup && Array.isArray(groupKey)) {
        groupKey = groupKey.slice(0, lvl);
      }

      if (last && collate(last.groupKey, groupKey) === 0) {
        last.keys.push([e.key, e.id]);
        last.values.push(e.value);
        return;
      }
      groups.push({
        keys: [[e.key, e.id]],
        values: [e.value],
        groupKey: groupKey
      });
    });
    results = [];
    for (var i = 0, len = groups.length; i < len; i++) {
      var e = groups[i];
      var reduceTry = tryReduce(view.sourceDB, reduceFun, e.keys, e.values, false);
      if (reduceTry.error && reduceTry.error instanceof BuiltInError) {
        // CouchDB returns an error if a built-in errors out
        throw reduceTry.error;
      }
      results.push({
        // CouchDB just sets the value to null if a non-built-in errors out
        value: reduceTry.error ? null : reduceTry.output,
        key: e.groupKey
      });
    }
    // no total_rows/offset when reducing
    return {rows: sliceResults(results, options.limit, options.skip)};
  }

  function queryView(view, opts) {
    return sequentialize(getQueue(view), function () {
      return queryViewInQueue(view, opts);
    })();
  }

  function queryViewInQueue(view, opts) {
    var totalRows;
    var shouldReduce = view.reduceFun && opts.reduce !== false;
    var skip = opts.skip || 0;
    if (typeof opts.keys !== 'undefined' && !opts.keys.length) {
      // equivalent query
      opts.limit = 0;
      delete opts.keys;
    }

    function fetchFromView(viewOpts) {
      viewOpts.include_docs = true;
      return view.db.allDocs(viewOpts).then(function (res) {
        totalRows = res.total_rows;
        return res.rows.map(function (result) {

          // implicit migration - in older versions of PouchDB,
          // we explicitly stored the doc as {id: ..., key: ..., value: ...}
          // this is tested in a migration test
          /* istanbul ignore next */
          if ('value' in result.doc && typeof result.doc.value === 'object' &&
            result.doc.value !== null) {
            var keys = Object.keys(result.doc.value).sort();
            // this detection method is not perfect, but it's unlikely the user
            // emitted a value which was an object with these 3 exact keys
            var expectedKeys = ['id', 'key', 'value'];
            if (!(keys < expectedKeys || keys > expectedKeys)) {
              return result.doc.value;
            }
          }

          var parsedKeyAndDocId = parseIndexableString(result.doc._id);
          return {
            key: parsedKeyAndDocId[0],
            id: parsedKeyAndDocId[1],
            value: ('value' in result.doc ? result.doc.value : null)
          };
        });
      });
    }

    function onMapResultsReady(rows) {
      var finalResults;
      if (shouldReduce) {
        finalResults = reduceView(view, rows, opts);
      } else {
        finalResults = {
          total_rows: totalRows,
          offset: skip,
          rows: rows
        };
      }
      /* istanbul ignore if */
      if (opts.update_seq) {
        finalResults.update_seq = view.seq;
      }
      if (opts.include_docs) {
        var docIds = uniq(rows.map(rowToDocId));

        return view.sourceDB.allDocs({
          keys: docIds,
          include_docs: true,
          conflicts: opts.conflicts,
          attachments: opts.attachments,
          binary: opts.binary
        }).then(function (allDocsRes) {
          var docIdsToDocs = new ExportedMap();
          allDocsRes.rows.forEach(function (row) {
            docIdsToDocs.set(row.id, row.doc);
          });
          rows.forEach(function (row) {
            var docId = rowToDocId(row);
            var doc = docIdsToDocs.get(docId);
            if (doc) {
              row.doc = doc;
            }
          });
          return finalResults;
        });
      } else {
        return finalResults;
      }
    }

    if (typeof opts.keys !== 'undefined') {
      var keys = opts.keys;
      var fetchPromises = keys.map(function (key) {
        var viewOpts = {
          startkey : toIndexableString([key]),
          endkey   : toIndexableString([key, {}])
        };
        /* istanbul ignore if */
        if (opts.update_seq) {
          viewOpts.update_seq = true;
        }
        return fetchFromView(viewOpts);
      });
      return Promise.all(fetchPromises).then(flatten).then(onMapResultsReady);
    } else { // normal query, no 'keys'
      var viewOpts = {
        descending : opts.descending
      };
      /* istanbul ignore if */
      if (opts.update_seq) {
        viewOpts.update_seq = true;
      }
      var startkey;
      var endkey;
      if ('start_key' in opts) {
        startkey = opts.start_key;
      }
      if ('startkey' in opts) {
        startkey = opts.startkey;
      }
      if ('end_key' in opts) {
        endkey = opts.end_key;
      }
      if ('endkey' in opts) {
        endkey = opts.endkey;
      }
      if (typeof startkey !== 'undefined') {
        viewOpts.startkey = opts.descending ?
          toIndexableString([startkey, {}]) :
          toIndexableString([startkey]);
      }
      if (typeof endkey !== 'undefined') {
        var inclusiveEnd = opts.inclusive_end !== false;
        if (opts.descending) {
          inclusiveEnd = !inclusiveEnd;
        }

        viewOpts.endkey = toIndexableString(
          inclusiveEnd ? [endkey, {}] : [endkey]);
      }
      if (typeof opts.key !== 'undefined') {
        var keyStart = toIndexableString([opts.key]);
        var keyEnd = toIndexableString([opts.key, {}]);
        if (viewOpts.descending) {
          viewOpts.endkey = keyStart;
          viewOpts.startkey = keyEnd;
        } else {
          viewOpts.startkey = keyStart;
          viewOpts.endkey = keyEnd;
        }
      }
      if (!shouldReduce) {
        if (typeof opts.limit === 'number') {
          viewOpts.limit = opts.limit;
        }
        viewOpts.skip = skip;
      }
      return fetchFromView(viewOpts).then(onMapResultsReady);
    }
  }

  function httpViewCleanup(db) {
    return db.fetch('_view_cleanup', {
      headers: new h({'Content-Type': 'application/json'}),
      method: 'POST'
    }).then(function (response) {
      return response.json();
    });
  }

  function localViewCleanup(db) {
    return db.get('_local/' + localDocName).then(function (metaDoc) {
      var docsToViews = new ExportedMap();
      Object.keys(metaDoc.views).forEach(function (fullViewName) {
        var parts = parseViewName(fullViewName);
        var designDocName = '_design/' + parts[0];
        var viewName = parts[1];
        var views = docsToViews.get(designDocName);
        if (!views) {
          views = new ExportedSet();
          docsToViews.set(designDocName, views);
        }
        views.add(viewName);
      });
      var opts = {
        keys : mapToKeysArray(docsToViews),
        include_docs : true
      };
      return db.allDocs(opts).then(function (res) {
        var viewsToStatus = {};
        res.rows.forEach(function (row) {
          var ddocName = row.key.substring(8); // cuts off '_design/'
          docsToViews.get(row.key).forEach(function (viewName) {
            var fullViewName = ddocName + '/' + viewName;
            /* istanbul ignore if */
            if (!metaDoc.views[fullViewName]) {
              // new format, without slashes, to support PouchDB 2.2.0
              // migration test in pouchdb's browser.migration.js verifies this
              fullViewName = viewName;
            }
            var viewDBNames = Object.keys(metaDoc.views[fullViewName]);
            // design doc deleted, or view function nonexistent
            var statusIsGood = row.doc && row.doc.views &&
              row.doc.views[viewName];
            viewDBNames.forEach(function (viewDBName) {
              viewsToStatus[viewDBName] =
                viewsToStatus[viewDBName] || statusIsGood;
            });
          });
        });
        var dbsToDelete = Object.keys(viewsToStatus).filter(
          function (viewDBName) { return !viewsToStatus[viewDBName]; });
        var destroyPromises = dbsToDelete.map(function (viewDBName) {
          return sequentialize(getQueue(viewDBName), function () {
            return new db.constructor(viewDBName, db.__opts).destroy();
          })();
        });
        return Promise.all(destroyPromises).then(function () {
          return {ok: true};
        });
      });
    }, defaultsTo({ok: true}));
  }

  function queryPromised(db, fun, opts) {
    /* istanbul ignore next */
    if (typeof db._query === 'function') {
      return customQuery(db, fun, opts);
    }
    if (isRemote(db)) {
      return httpQuery(db, fun, opts);
    }

    if (typeof fun !== 'string') {
      // temp_view
      checkQueryParseError(opts, fun);

      tempViewQueue.add(function () {
        var createViewPromise = createView(
          /* sourceDB */ db,
          /* viewName */ 'temp_view/temp_view',
          /* mapFun */ fun.map,
          /* reduceFun */ fun.reduce,
          /* temporary */ true,
          /* localDocName */ localDocName);
        return createViewPromise.then(function (view) {
          return fin(updateView(view).then(function () {
            return queryView(view, opts);
          }), function () {
            return view.db.destroy();
          });
        });
      });
      return tempViewQueue.finish();
    } else {
      // persistent view
      var fullViewName = fun;
      var parts = parseViewName(fullViewName);
      var designDocName = parts[0];
      var viewName = parts[1];
      return db.get('_design/' + designDocName).then(function (doc) {
        var fun = doc.views && doc.views[viewName];

        if (!fun) {
          // basic validator; it's assumed that every subclass would want this
          throw new NotFoundError('ddoc ' + doc._id + ' has no view named ' +
            viewName);
        }

        ddocValidator(doc, viewName);
        checkQueryParseError(opts, fun);

        var createViewPromise = createView(
          /* sourceDB */ db,
          /* viewName */ fullViewName,
          /* mapFun */ fun.map,
          /* reduceFun */ fun.reduce,
          /* temporary */ false,
          /* localDocName */ localDocName);
        return createViewPromise.then(function (view) {
          if (opts.stale === 'ok' || opts.stale === 'update_after') {
            if (opts.stale === 'update_after') {
              immediate(function () {
                updateView(view);
              });
            }
            return queryView(view, opts);
          } else { // stale not ok
            return updateView(view).then(function () {
              return queryView(view, opts);
            });
          }
        });
      });
    }
  }

  function abstractQuery(fun, opts, callback) {
    var db = this;
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    opts = opts ? coerceOptions(opts) : {};

    if (typeof fun === 'function') {
      fun = {map : fun};
    }

    var promise = Promise.resolve().then(function () {
      return queryPromised(db, fun, opts);
    });
    promisedCallback(promise, callback);
    return promise;
  }

  var abstractViewCleanup = callbackify(function () {
    var db = this;
    /* istanbul ignore next */
    if (typeof db._viewCleanup === 'function') {
      return customViewCleanup(db);
    }
    if (isRemote(db)) {
      return httpViewCleanup(db);
    }
    return localViewCleanup(db);
  });

  return {
    query: abstractQuery,
    viewCleanup: abstractViewCleanup
  };
}

var builtInReduce = {
  _sum: function (keys, values) {
    return sum(values);
  },

  _count: function (keys, values) {
    return values.length;
  },

  _stats: function (keys, values) {
    // no need to implement rereduce=true, because Pouch
    // will never call it
    function sumsqr(values) {
      var _sumsqr = 0;
      for (var i = 0, len = values.length; i < len; i++) {
        var num = values[i];
        _sumsqr += (num * num);
      }
      return _sumsqr;
    }
    return {
      sum     : sum(values),
      min     : Math.min.apply(null, values),
      max     : Math.max.apply(null, values),
      count   : values.length,
      sumsqr : sumsqr(values)
    };
  }
};

function getBuiltIn(reduceFunString) {
  if (/^_sum/.test(reduceFunString)) {
    return builtInReduce._sum;
  } else if (/^_count/.test(reduceFunString)) {
    return builtInReduce._count;
  } else if (/^_stats/.test(reduceFunString)) {
    return builtInReduce._stats;
  } else if (/^_/.test(reduceFunString)) {
    throw new Error(reduceFunString + ' is not a supported reduce function.');
  }
}

function mapper(mapFun, emit) {
  // for temp_views one can use emit(doc, emit), see #38
  if (typeof mapFun === "function" && mapFun.length === 2) {
    var origMap = mapFun;
    return function (doc) {
      return origMap(doc, emit);
    };
  } else {
    return evalFunctionWithEval(mapFun.toString(), emit);
  }
}

function reducer(reduceFun) {
  var reduceFunString = reduceFun.toString();
  var builtIn = getBuiltIn(reduceFunString);
  if (builtIn) {
    return builtIn;
  } else {
    return evalFunctionWithEval(reduceFunString);
  }
}

function ddocValidator(ddoc, viewName) {
  var fun = ddoc.views && ddoc.views[viewName];
  if (typeof fun.map !== 'string') {
    throw new NotFoundError('ddoc ' + ddoc._id + ' has no string view named ' +
      viewName + ', instead found object of type: ' + typeof fun.map);
  }
}

var localDocName = 'mrviews';
var abstract = createAbstractMapReduce(localDocName, mapper, reducer, ddocValidator);

function query(fun, opts, callback) {
  return abstract.query.call(this, fun, opts, callback);
}

function viewCleanup(callback) {
  return abstract.viewCleanup.call(this, callback);
}

var mapreduce = {
  query: query,
  viewCleanup: viewCleanup
};

function isGenOne$1(rev$$1) {
  return /^1-/.test(rev$$1);
}

function fileHasChanged(localDoc, remoteDoc, filename) {
  return !localDoc._attachments ||
         !localDoc._attachments[filename] ||
         localDoc._attachments[filename].digest !== remoteDoc._attachments[filename].digest;
}

function getDocAttachments(db, doc) {
  var filenames = Object.keys(doc._attachments);
  return Promise.all(filenames.map(function (filename) {
    return db.getAttachment(doc._id, filename, {rev: doc._rev});
  }));
}

function getDocAttachmentsFromTargetOrSource(target, src, doc) {
  var doCheckForLocalAttachments = isRemote(src) && !isRemote(target);
  var filenames = Object.keys(doc._attachments);

  if (!doCheckForLocalAttachments) {
    return getDocAttachments(src, doc);
  }

  return target.get(doc._id).then(function (localDoc) {
    return Promise.all(filenames.map(function (filename) {
      if (fileHasChanged(localDoc, doc, filename)) {
        return src.getAttachment(doc._id, filename);
      }

      return target.getAttachment(localDoc._id, filename);
    }));
  }).catch(function (error) {
    /* istanbul ignore if */
    if (error.status !== 404) {
      throw error;
    }

    return getDocAttachments(src, doc);
  });
}

function createBulkGetOpts(diffs) {
  var requests = [];
  Object.keys(diffs).forEach(function (id) {
    var missingRevs = diffs[id].missing;
    missingRevs.forEach(function (missingRev) {
      requests.push({
        id: id,
        rev: missingRev
      });
    });
  });

  return {
    docs: requests,
    revs: true,
    latest: true
  };
}

//
// Fetch all the documents from the src as described in the "diffs",
// which is a mapping of docs IDs to revisions. If the state ever
// changes to "cancelled", then the returned promise will be rejected.
// Else it will be resolved with a list of fetched documents.
//
function getDocs(src, target, diffs, state) {
  diffs = clone(diffs); // we do not need to modify this

  var resultDocs = [],
      ok = true;

  function getAllDocs() {

    var bulkGetOpts = createBulkGetOpts(diffs);

    if (!bulkGetOpts.docs.length) { // optimization: skip empty requests
      return;
    }

    return src.bulkGet(bulkGetOpts).then(function (bulkGetResponse) {
      /* istanbul ignore if */
      if (state.cancelled) {
        throw new Error('cancelled');
      }
      return Promise.all(bulkGetResponse.results.map(function (bulkGetInfo) {
        return Promise.all(bulkGetInfo.docs.map(function (doc) {
          var remoteDoc = doc.ok;

          if (doc.error) {
            // when AUTO_COMPACTION is set, docs can be returned which look
            // like this: {"missing":"1-7c3ac256b693c462af8442f992b83696"}
            ok = false;
          }

          if (!remoteDoc || !remoteDoc._attachments) {
            return remoteDoc;
          }

          return getDocAttachmentsFromTargetOrSource(target, src, remoteDoc)
                   .then(function (attachments) {
                           var filenames = Object.keys(remoteDoc._attachments);
                           attachments
                             .forEach(function (attachment, i) {
                                        var att = remoteDoc._attachments[filenames[i]];
                                        delete att.stub;
                                        delete att.length;
                                        att.data = attachment;
                                      });

                                      return remoteDoc;
                                    });
        }));
      }))

      .then(function (results) {
        resultDocs = resultDocs.concat(flatten(results).filter(Boolean));
      });
    });
  }

  function hasAttachments(doc) {
    return doc._attachments && Object.keys(doc._attachments).length > 0;
  }

  function hasConflicts(doc) {
    return doc._conflicts && doc._conflicts.length > 0;
  }

  function fetchRevisionOneDocs(ids) {
    // Optimization: fetch gen-1 docs and attachments in
    // a single request using _all_docs
    return src.allDocs({
      keys: ids,
      include_docs: true,
      conflicts: true
    }).then(function (res) {
      if (state.cancelled) {
        throw new Error('cancelled');
      }
      res.rows.forEach(function (row) {
        if (row.deleted || !row.doc || !isGenOne$1(row.value.rev) ||
            hasAttachments(row.doc) || hasConflicts(row.doc)) {
          // if any of these conditions apply, we need to fetch using get()
          return;
        }

        // strip _conflicts array to appease CSG (#5793)
        /* istanbul ignore if */
        if (row.doc._conflicts) {
          delete row.doc._conflicts;
        }

        // the doc we got back from allDocs() is sufficient
        resultDocs.push(row.doc);
        delete diffs[row.id];
      });
    });
  }

  function getRevisionOneDocs() {
    // filter out the generation 1 docs and get them
    // leaving the non-generation one docs to be got otherwise
    var ids = Object.keys(diffs).filter(function (id) {
      var missing = diffs[id].missing;
      return missing.length === 1 && isGenOne$1(missing[0]);
    });
    if (ids.length > 0) {
      return fetchRevisionOneDocs(ids);
    }
  }

  function returnResult() {
    return { ok:ok, docs:resultDocs };
  }

  return Promise.resolve()
    .then(getRevisionOneDocs)
    .then(getAllDocs)
    .then(returnResult);
}

var CHECKPOINT_VERSION = 1;
var REPLICATOR = "pouchdb";
// This is an arbitrary number to limit the
// amount of replication history we save in the checkpoint.
// If we save too much, the checkpoing docs will become very big,
// if we save fewer, we'll run a greater risk of having to
// read all the changes from 0 when checkpoint PUTs fail
// CouchDB 2.0 has a more involved history pruning,
// but let's go for the simple version for now.
var CHECKPOINT_HISTORY_SIZE = 5;
var LOWEST_SEQ = 0;

function updateCheckpoint(db, id, checkpoint, session, returnValue) {
  return db.get(id).catch(function (err) {
    if (err.status === 404) {
      if (db.adapter === 'http' || db.adapter === 'https') {
        explainError(
          404, 'PouchDB is just checking if a remote checkpoint exists.'
        );
      }
      return {
        session_id: session,
        _id: id,
        history: [],
        replicator: REPLICATOR,
        version: CHECKPOINT_VERSION
      };
    }
    throw err;
  }).then(function (doc) {
    if (returnValue.cancelled) {
      return;
    }

    // if the checkpoint has not changed, do not update
    if (doc.last_seq === checkpoint) {
      return;
    }

    // Filter out current entry for this replication
    doc.history = (doc.history || []).filter(function (item) {
      return item.session_id !== session;
    });

    // Add the latest checkpoint to history
    doc.history.unshift({
      last_seq: checkpoint,
      session_id: session
    });

    // Just take the last pieces in history, to
    // avoid really big checkpoint docs.
    // see comment on history size above
    doc.history = doc.history.slice(0, CHECKPOINT_HISTORY_SIZE);

    doc.version = CHECKPOINT_VERSION;
    doc.replicator = REPLICATOR;

    doc.session_id = session;
    doc.last_seq = checkpoint;

    return db.put(doc).catch(function (err) {
      if (err.status === 409) {
        // retry; someone is trying to write a checkpoint simultaneously
        return updateCheckpoint(db, id, checkpoint, session, returnValue);
      }
      throw err;
    });
  });
}

function Checkpointer(src, target, id, returnValue, opts) {
  this.src = src;
  this.target = target;
  this.id = id;
  this.returnValue = returnValue;
  this.opts = opts || {};
}

Checkpointer.prototype.writeCheckpoint = function (checkpoint, session) {
  var self = this;
  return this.updateTarget(checkpoint, session).then(function () {
    return self.updateSource(checkpoint, session);
  });
};

Checkpointer.prototype.updateTarget = function (checkpoint, session) {
  if (this.opts.writeTargetCheckpoint) {
    return updateCheckpoint(this.target, this.id, checkpoint,
      session, this.returnValue);
  } else {
    return Promise.resolve(true);
  }
};

Checkpointer.prototype.updateSource = function (checkpoint, session) {
  if (this.opts.writeSourceCheckpoint) {
    var self = this;
    return updateCheckpoint(this.src, this.id, checkpoint,
      session, this.returnValue)
      .catch(function (err) {
        if (isForbiddenError(err)) {
          self.opts.writeSourceCheckpoint = false;
          return true;
        }
        throw err;
      });
  } else {
    return Promise.resolve(true);
  }
};

var comparisons = {
  "undefined": function (targetDoc, sourceDoc) {
    // This is the previous comparison function
    if (collate(targetDoc.last_seq, sourceDoc.last_seq) === 0) {
      return sourceDoc.last_seq;
    }
    /* istanbul ignore next */
    return 0;
  },
  "1": function (targetDoc, sourceDoc) {
    // This is the comparison function ported from CouchDB
    return compareReplicationLogs(sourceDoc, targetDoc).last_seq;
  }
};

Checkpointer.prototype.getCheckpoint = function () {
  var self = this;

  if (self.opts && self.opts.writeSourceCheckpoint && !self.opts.writeTargetCheckpoint) {
    return self.src.get(self.id).then(function (sourceDoc) {
      return sourceDoc.last_seq || LOWEST_SEQ;
    }).catch(function (err) {
      /* istanbul ignore if */
      if (err.status !== 404) {
        throw err;
      }
      return LOWEST_SEQ;
    });
  }

  return self.target.get(self.id).then(function (targetDoc) {
    if (self.opts && self.opts.writeTargetCheckpoint && !self.opts.writeSourceCheckpoint) {
      return targetDoc.last_seq || LOWEST_SEQ;
    }

    return self.src.get(self.id).then(function (sourceDoc) {
      // Since we can't migrate an old version doc to a new one
      // (no session id), we just go with the lowest seq in this case
      /* istanbul ignore if */
      if (targetDoc.version !== sourceDoc.version) {
        return LOWEST_SEQ;
      }

      var version;
      if (targetDoc.version) {
        version = targetDoc.version.toString();
      } else {
        version = "undefined";
      }

      if (version in comparisons) {
        return comparisons[version](targetDoc, sourceDoc);
      }
      /* istanbul ignore next */
      return LOWEST_SEQ;
    }, function (err) {
      if (err.status === 404 && targetDoc.last_seq) {
        return self.src.put({
          _id: self.id,
          last_seq: LOWEST_SEQ
        }).then(function () {
          return LOWEST_SEQ;
        }, function (err) {
          if (isForbiddenError(err)) {
            self.opts.writeSourceCheckpoint = false;
            return targetDoc.last_seq;
          }
          /* istanbul ignore next */
          return LOWEST_SEQ;
        });
      }
      throw err;
    });
  }).catch(function (err) {
    if (err.status !== 404) {
      throw err;
    }
    return LOWEST_SEQ;
  });
};
// This checkpoint comparison is ported from CouchDBs source
// they come from here:
// https://github.com/apache/couchdb-couch-replicator/blob/master/src/couch_replicator.erl#L863-L906

function compareReplicationLogs(srcDoc, tgtDoc) {
  if (srcDoc.session_id === tgtDoc.session_id) {
    return {
      last_seq: srcDoc.last_seq,
      history: srcDoc.history
    };
  }

  return compareReplicationHistory(srcDoc.history, tgtDoc.history);
}

function compareReplicationHistory(sourceHistory, targetHistory) {
  // the erlang loop via function arguments is not so easy to repeat in JS
  // therefore, doing this as recursion
  var S = sourceHistory[0];
  var sourceRest = sourceHistory.slice(1);
  var T = targetHistory[0];
  var targetRest = targetHistory.slice(1);

  if (!S || targetHistory.length === 0) {
    return {
      last_seq: LOWEST_SEQ,
      history: []
    };
  }

  var sourceId = S.session_id;
  /* istanbul ignore if */
  if (hasSessionId(sourceId, targetHistory)) {
    return {
      last_seq: S.last_seq,
      history: sourceHistory
    };
  }

  var targetId = T.session_id;
  if (hasSessionId(targetId, sourceRest)) {
    return {
      last_seq: T.last_seq,
      history: targetRest
    };
  }

  return compareReplicationHistory(sourceRest, targetRest);
}

function hasSessionId(sessionId, history) {
  var props = history[0];
  var rest = history.slice(1);

  if (!sessionId || history.length === 0) {
    return false;
  }

  if (sessionId === props.session_id) {
    return true;
  }

  return hasSessionId(sessionId, rest);
}

function isForbiddenError(err) {
  return typeof err.status === 'number' && Math.floor(err.status / 100) === 4;
}

var STARTING_BACK_OFF = 0;

function backOff(opts, returnValue, error, callback) {
  if (opts.retry === false) {
    returnValue.emit('error', error);
    returnValue.removeAllListeners();
    return;
  }
  /* istanbul ignore if */
  if (typeof opts.back_off_function !== 'function') {
    opts.back_off_function = defaultBackOff;
  }
  returnValue.emit('requestError', error);
  if (returnValue.state === 'active' || returnValue.state === 'pending') {
    returnValue.emit('paused', error);
    returnValue.state = 'stopped';
    var backOffSet = function backoffTimeSet() {
      opts.current_back_off = STARTING_BACK_OFF;
    };
    var removeBackOffSetter = function removeBackOffTimeSet() {
      returnValue.removeListener('active', backOffSet);
    };
    returnValue.once('paused', removeBackOffSetter);
    returnValue.once('active', backOffSet);
  }

  opts.current_back_off = opts.current_back_off || STARTING_BACK_OFF;
  opts.current_back_off = opts.back_off_function(opts.current_back_off);
  setTimeout(callback, opts.current_back_off);
}

function sortObjectPropertiesByKey(queryParams) {
  return Object.keys(queryParams).sort(collate).reduce(function (result, key) {
    result[key] = queryParams[key];
    return result;
  }, {});
}

// Generate a unique id particular to this replication.
// Not guaranteed to align perfectly with CouchDB's rep ids.
function generateReplicationId(src, target, opts) {
  var docIds = opts.doc_ids ? opts.doc_ids.sort(collate) : '';
  var filterFun = opts.filter ? opts.filter.toString() : '';
  var queryParams = '';
  var filterViewName =  '';
  var selector = '';

  // possibility for checkpoints to be lost here as behaviour of
  // JSON.stringify is not stable (see #6226)
  /* istanbul ignore if */
  if (opts.selector) {
    selector = JSON.stringify(opts.selector);
  }

  if (opts.filter && opts.query_params) {
    queryParams = JSON.stringify(sortObjectPropertiesByKey(opts.query_params));
  }

  if (opts.filter && opts.filter === '_view') {
    filterViewName = opts.view.toString();
  }

  return Promise.all([src.id(), target.id()]).then(function (res) {
    var queryData = res[0] + res[1] + filterFun + filterViewName +
      queryParams + docIds + selector;
    return new Promise(function (resolve) {
      binaryMd5(queryData, resolve);
    });
  }).then(function (md5sum) {
    // can't use straight-up md5 alphabet, because
    // the char '/' is interpreted as being for attachments,
    // and + is also not url-safe
    md5sum = md5sum.replace(/\//g, '.').replace(/\+/g, '_');
    return '_local/' + md5sum;
  });
}

function replicate(src, target, opts, returnValue, result) {
  var batches = [];               // list of batches to be processed
  var currentBatch;               // the batch currently being processed
  var pendingBatch = {
    seq: 0,
    changes: [],
    docs: []
  }; // next batch, not yet ready to be processed
  var writingCheckpoint = false;  // true while checkpoint is being written
  var changesCompleted = false;   // true when all changes received
  var replicationCompleted = false; // true when replication has completed
  var last_seq = 0;
  var continuous = opts.continuous || opts.live || false;
  var batch_size = opts.batch_size || 100;
  var batches_limit = opts.batches_limit || 10;
  var changesPending = false;     // true while src.changes is running
  var doc_ids = opts.doc_ids;
  var selector = opts.selector;
  var repId;
  var checkpointer;
  var changedDocs = [];
  // Like couchdb, every replication gets a unique session id
  var session = uuid();

  result = result || {
    ok: true,
    start_time: new Date().toISOString(),
    docs_read: 0,
    docs_written: 0,
    doc_write_failures: 0,
    errors: []
  };

  var changesOpts = {};
  returnValue.ready(src, target);

  function initCheckpointer() {
    if (checkpointer) {
      return Promise.resolve();
    }
    return generateReplicationId(src, target, opts).then(function (res) {
      repId = res;

      var checkpointOpts = {};
      if (opts.checkpoint === false) {
        checkpointOpts = { writeSourceCheckpoint: false, writeTargetCheckpoint: false };
      } else if (opts.checkpoint === 'source') {
        checkpointOpts = { writeSourceCheckpoint: true, writeTargetCheckpoint: false };
      } else if (opts.checkpoint === 'target') {
        checkpointOpts = { writeSourceCheckpoint: false, writeTargetCheckpoint: true };
      } else {
        checkpointOpts = { writeSourceCheckpoint: true, writeTargetCheckpoint: true };
      }

      checkpointer = new Checkpointer(src, target, repId, returnValue, checkpointOpts);
    });
  }

  function writeDocs() {
    changedDocs = [];

    if (currentBatch.docs.length === 0) {
      return;
    }
    var docs = currentBatch.docs;
    var bulkOpts = {timeout: opts.timeout};
    return target.bulkDocs({docs: docs, new_edits: false}, bulkOpts).then(function (res) {
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        throw new Error('cancelled');
      }

      // `res` doesn't include full documents (which live in `docs`), so we create a map of 
      // (id -> error), and check for errors while iterating over `docs`
      var errorsById = Object.create(null);
      res.forEach(function (res) {
        if (res.error) {
          errorsById[res.id] = res;
        }
      });

      var errorsNo = Object.keys(errorsById).length;
      result.doc_write_failures += errorsNo;
      result.docs_written += docs.length - errorsNo;

      docs.forEach(function (doc) {
        var error = errorsById[doc._id];
        if (error) {
          result.errors.push(error);
          // Normalize error name. i.e. 'Unauthorized' -> 'unauthorized' (eg Sync Gateway)
          var errorName = (error.name || '').toLowerCase();
          if (errorName === 'unauthorized' || errorName === 'forbidden') {
            returnValue.emit('denied', clone(error));
          } else {
            throw error;
          }
        } else {
          changedDocs.push(doc);
        }
      });

    }, function (err) {
      result.doc_write_failures += docs.length;
      throw err;
    });
  }

  function finishBatch() {
    if (currentBatch.error) {
      throw new Error('There was a problem getting docs.');
    }
    result.last_seq = last_seq = currentBatch.seq;
    var outResult = clone(result);
    if (changedDocs.length) {
      outResult.docs = changedDocs;
      // Attach 'pending' property if server supports it (CouchDB 2.0+)
      /* istanbul ignore if */
      if (typeof currentBatch.pending === 'number') {
        outResult.pending = currentBatch.pending;
        delete currentBatch.pending;
      }
      returnValue.emit('change', outResult);
    }
    writingCheckpoint = true;
    return checkpointer.writeCheckpoint(currentBatch.seq,
        session).then(function () {
      writingCheckpoint = false;
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        throw new Error('cancelled');
      }
      currentBatch = undefined;
      getChanges();
    }).catch(function (err) {
      onCheckpointError(err);
      throw err;
    });
  }

  function getDiffs() {
    var diff = {};
    currentBatch.changes.forEach(function (change) {
      // Couchbase Sync Gateway emits these, but we can ignore them
      /* istanbul ignore if */
      if (change.id === "_user/") {
        return;
      }
      diff[change.id] = change.changes.map(function (x) {
        return x.rev;
      });
    });
    return target.revsDiff(diff).then(function (diffs) {
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        throw new Error('cancelled');
      }
      // currentBatch.diffs elements are deleted as the documents are written
      currentBatch.diffs = diffs;
    });
  }

  function getBatchDocs() {
    return getDocs(src, target, currentBatch.diffs, returnValue).then(function (got) {
      currentBatch.error = !got.ok;
      got.docs.forEach(function (doc) {
        delete currentBatch.diffs[doc._id];
        result.docs_read++;
        currentBatch.docs.push(doc);
      });
    });
  }

  function startNextBatch() {
    if (returnValue.cancelled || currentBatch) {
      return;
    }
    if (batches.length === 0) {
      processPendingBatch(true);
      return;
    }
    currentBatch = batches.shift();
    getDiffs()
      .then(getBatchDocs)
      .then(writeDocs)
      .then(finishBatch)
      .then(startNextBatch)
      .catch(function (err) {
        abortReplication('batch processing terminated with error', err);
      });
  }


  function processPendingBatch(immediate$$1) {
    if (pendingBatch.changes.length === 0) {
      if (batches.length === 0 && !currentBatch) {
        if ((continuous && changesOpts.live) || changesCompleted) {
          returnValue.state = 'pending';
          returnValue.emit('paused');
        }
        if (changesCompleted) {
          completeReplication();
        }
      }
      return;
    }
    if (
      immediate$$1 ||
      changesCompleted ||
      pendingBatch.changes.length >= batch_size
    ) {
      batches.push(pendingBatch);
      pendingBatch = {
        seq: 0,
        changes: [],
        docs: []
      };
      if (returnValue.state === 'pending' || returnValue.state === 'stopped') {
        returnValue.state = 'active';
        returnValue.emit('active');
      }
      startNextBatch();
    }
  }


  function abortReplication(reason, err) {
    if (replicationCompleted) {
      return;
    }
    if (!err.message) {
      err.message = reason;
    }
    result.ok = false;
    result.status = 'aborting';
    batches = [];
    pendingBatch = {
      seq: 0,
      changes: [],
      docs: []
    };
    completeReplication(err);
  }


  function completeReplication(fatalError) {
    if (replicationCompleted) {
      return;
    }
    /* istanbul ignore if */
    if (returnValue.cancelled) {
      result.status = 'cancelled';
      if (writingCheckpoint) {
        return;
      }
    }
    result.status = result.status || 'complete';
    result.end_time = new Date().toISOString();
    result.last_seq = last_seq;
    replicationCompleted = true;

    if (fatalError) {
      // need to extend the error because Firefox considers ".result" read-only
      fatalError = createError(fatalError);
      fatalError.result = result;

      // Normalize error name. i.e. 'Unauthorized' -> 'unauthorized' (eg Sync Gateway)
      var errorName = (fatalError.name || '').toLowerCase();
      if (errorName === 'unauthorized' || errorName === 'forbidden') {
        returnValue.emit('error', fatalError);
        returnValue.removeAllListeners();
      } else {
        backOff(opts, returnValue, fatalError, function () {
          replicate(src, target, opts, returnValue);
        });
      }
    } else {
      returnValue.emit('complete', result);
      returnValue.removeAllListeners();
    }
  }


  function onChange(change, pending, lastSeq) {
    /* istanbul ignore if */
    if (returnValue.cancelled) {
      return completeReplication();
    }
    // Attach 'pending' property if server supports it (CouchDB 2.0+)
    /* istanbul ignore if */
    if (typeof pending === 'number') {
      pendingBatch.pending = pending;
    }

    var filter = filterChange(opts)(change);
    if (!filter) {
      return;
    }
    pendingBatch.seq = change.seq || lastSeq;
    pendingBatch.changes.push(change);
    immediate(function () {
      processPendingBatch(batches.length === 0 && changesOpts.live);
    });
  }


  function onChangesComplete(changes) {
    changesPending = false;
    /* istanbul ignore if */
    if (returnValue.cancelled) {
      return completeReplication();
    }

    // if no results were returned then we're done,
    // else fetch more
    if (changes.results.length > 0) {
      changesOpts.since = changes.results[changes.results.length - 1].seq;
      getChanges();
      processPendingBatch(true);
    } else {

      var complete = function () {
        if (continuous) {
          changesOpts.live = true;
          getChanges();
        } else {
          changesCompleted = true;
        }
        processPendingBatch(true);
      };

      // update the checkpoint so we start from the right seq next time
      if (!currentBatch && changes.results.length === 0) {
        writingCheckpoint = true;
        checkpointer.writeCheckpoint(changes.last_seq,
            session).then(function () {
          writingCheckpoint = false;
          result.last_seq = last_seq = changes.last_seq;
          complete();
        })
        .catch(onCheckpointError);
      } else {
        complete();
      }
    }
  }


  function onChangesError(err) {
    changesPending = false;
    /* istanbul ignore if */
    if (returnValue.cancelled) {
      return completeReplication();
    }
    abortReplication('changes rejected', err);
  }


  function getChanges() {
    if (!(
      !changesPending &&
      !changesCompleted &&
      batches.length < batches_limit
      )) {
      return;
    }
    changesPending = true;
    function abortChanges() {
      changes.cancel();
    }
    function removeListener() {
      returnValue.removeListener('cancel', abortChanges);
    }

    if (returnValue._changes) { // remove old changes() and listeners
      returnValue.removeListener('cancel', returnValue._abortChanges);
      returnValue._changes.cancel();
    }
    returnValue.once('cancel', abortChanges);

    var changes = src.changes(changesOpts)
      .on('change', onChange);
    changes.then(removeListener, removeListener);
    changes.then(onChangesComplete)
      .catch(onChangesError);

    if (opts.retry) {
      // save for later so we can cancel if necessary
      returnValue._changes = changes;
      returnValue._abortChanges = abortChanges;
    }
  }


  function startChanges() {
    initCheckpointer().then(function () {
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        return;
      }
      return checkpointer.getCheckpoint().then(function (checkpoint) {
        last_seq = checkpoint;
        changesOpts = {
          since: last_seq,
          limit: batch_size,
          batch_size: batch_size,
          style: 'all_docs',
          doc_ids: doc_ids,
          selector: selector,
          return_docs: true // required so we know when we're done
        };
        if (opts.filter) {
          if (typeof opts.filter !== 'string') {
            // required for the client-side filter in onChange
            changesOpts.include_docs = true;
          } else { // ddoc filter
            changesOpts.filter = opts.filter;
          }
        }
        if ('heartbeat' in opts) {
          changesOpts.heartbeat = opts.heartbeat;
        }
        if ('timeout' in opts) {
          changesOpts.timeout = opts.timeout;
        }
        if (opts.query_params) {
          changesOpts.query_params = opts.query_params;
        }
        if (opts.view) {
          changesOpts.view = opts.view;
        }
        getChanges();
      });
    }).catch(function (err) {
      abortReplication('getCheckpoint rejected with ', err);
    });
  }

  /* istanbul ignore next */
  function onCheckpointError(err) {
    writingCheckpoint = false;
    abortReplication('writeCheckpoint completed with error', err);
  }

  /* istanbul ignore if */
  if (returnValue.cancelled) { // cancelled immediately
    completeReplication();
    return;
  }

  if (!returnValue._addedListeners) {
    returnValue.once('cancel', completeReplication);

    if (typeof opts.complete === 'function') {
      returnValue.once('error', opts.complete);
      returnValue.once('complete', function (result) {
        opts.complete(null, result);
      });
    }
    returnValue._addedListeners = true;
  }

  if (typeof opts.since === 'undefined') {
    startChanges();
  } else {
    initCheckpointer().then(function () {
      writingCheckpoint = true;
      return checkpointer.writeCheckpoint(opts.since, session);
    }).then(function () {
      writingCheckpoint = false;
      /* istanbul ignore if */
      if (returnValue.cancelled) {
        completeReplication();
        return;
      }
      last_seq = opts.since;
      startChanges();
    }).catch(onCheckpointError);
  }
}

// We create a basic promise so the caller can cancel the replication possibly
// before we have actually started listening to changes etc
inherits(Replication, events.EventEmitter);
function Replication() {
  events.EventEmitter.call(this);
  this.cancelled = false;
  this.state = 'pending';
  var self = this;
  var promise = new Promise(function (fulfill, reject) {
    self.once('complete', fulfill);
    self.once('error', reject);
  });
  self.then = function (resolve, reject) {
    return promise.then(resolve, reject);
  };
  self.catch = function (reject) {
    return promise.catch(reject);
  };
  // As we allow error handling via "error" event as well,
  // put a stub in here so that rejecting never throws UnhandledError.
  self.catch(function () {});
}

Replication.prototype.cancel = function () {
  this.cancelled = true;
  this.state = 'cancelled';
  this.emit('cancel');
};

Replication.prototype.ready = function (src, target) {
  var self = this;
  if (self._readyCalled) {
    return;
  }
  self._readyCalled = true;

  function onDestroy() {
    self.cancel();
  }
  src.once('destroyed', onDestroy);
  target.once('destroyed', onDestroy);
  function cleanup() {
    src.removeListener('destroyed', onDestroy);
    target.removeListener('destroyed', onDestroy);
  }
  self.once('complete', cleanup);
};

function toPouch(db, opts) {
  var PouchConstructor = opts.PouchConstructor;
  if (typeof db === 'string') {
    return new PouchConstructor(db, opts);
  } else {
    return db;
  }
}

function replicateWrapper(src, target, opts, callback) {

  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  if (typeof opts === 'undefined') {
    opts = {};
  }

  if (opts.doc_ids && !Array.isArray(opts.doc_ids)) {
    throw createError(BAD_REQUEST,
                       "`doc_ids` filter parameter is not a list.");
  }

  opts.complete = callback;
  opts = clone(opts);
  opts.continuous = opts.continuous || opts.live;
  opts.retry = ('retry' in opts) ? opts.retry : false;
  /*jshint validthis:true */
  opts.PouchConstructor = opts.PouchConstructor || this;
  var replicateRet = new Replication(opts);
  var srcPouch = toPouch(src, opts);
  var targetPouch = toPouch(target, opts);
  replicate(srcPouch, targetPouch, opts, replicateRet);
  return replicateRet;
}

inherits(Sync, events.EventEmitter);
function sync(src, target, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  if (typeof opts === 'undefined') {
    opts = {};
  }
  opts = clone(opts);
  /*jshint validthis:true */
  opts.PouchConstructor = opts.PouchConstructor || this;
  src = toPouch(src, opts);
  target = toPouch(target, opts);
  return new Sync(src, target, opts, callback);
}

function Sync(src, target, opts, callback) {
  var self = this;
  this.canceled = false;

  var optsPush = opts.push ? $inject_Object_assign({}, opts, opts.push) : opts;
  var optsPull = opts.pull ? $inject_Object_assign({}, opts, opts.pull) : opts;

  this.push = replicateWrapper(src, target, optsPush);
  this.pull = replicateWrapper(target, src, optsPull);

  this.pushPaused = true;
  this.pullPaused = true;

  function pullChange(change) {
    self.emit('change', {
      direction: 'pull',
      change: change
    });
  }
  function pushChange(change) {
    self.emit('change', {
      direction: 'push',
      change: change
    });
  }
  function pushDenied(doc) {
    self.emit('denied', {
      direction: 'push',
      doc: doc
    });
  }
  function pullDenied(doc) {
    self.emit('denied', {
      direction: 'pull',
      doc: doc
    });
  }
  function pushPaused() {
    self.pushPaused = true;
    /* istanbul ignore if */
    if (self.pullPaused) {
      self.emit('paused');
    }
  }
  function pullPaused() {
    self.pullPaused = true;
    /* istanbul ignore if */
    if (self.pushPaused) {
      self.emit('paused');
    }
  }
  function pushActive() {
    self.pushPaused = false;
    /* istanbul ignore if */
    if (self.pullPaused) {
      self.emit('active', {
        direction: 'push'
      });
    }
  }
  function pullActive() {
    self.pullPaused = false;
    /* istanbul ignore if */
    if (self.pushPaused) {
      self.emit('active', {
        direction: 'pull'
      });
    }
  }

  var removed = {};

  function removeAll(type) { // type is 'push' or 'pull'
    return function (event, func) {
      var isChange = event === 'change' &&
        (func === pullChange || func === pushChange);
      var isDenied = event === 'denied' &&
        (func === pullDenied || func === pushDenied);
      var isPaused = event === 'paused' &&
        (func === pullPaused || func === pushPaused);
      var isActive = event === 'active' &&
        (func === pullActive || func === pushActive);

      if (isChange || isDenied || isPaused || isActive) {
        if (!(event in removed)) {
          removed[event] = {};
        }
        removed[event][type] = true;
        if (Object.keys(removed[event]).length === 2) {
          // both push and pull have asked to be removed
          self.removeAllListeners(event);
        }
      }
    };
  }

  if (opts.live) {
    this.push.on('complete', self.pull.cancel.bind(self.pull));
    this.pull.on('complete', self.push.cancel.bind(self.push));
  }

  function addOneListener(ee, event, listener) {
    if (ee.listeners(event).indexOf(listener) == -1) {
      ee.on(event, listener);
    }
  }

  this.on('newListener', function (event) {
    if (event === 'change') {
      addOneListener(self.pull, 'change', pullChange);
      addOneListener(self.push, 'change', pushChange);
    } else if (event === 'denied') {
      addOneListener(self.pull, 'denied', pullDenied);
      addOneListener(self.push, 'denied', pushDenied);
    } else if (event === 'active') {
      addOneListener(self.pull, 'active', pullActive);
      addOneListener(self.push, 'active', pushActive);
    } else if (event === 'paused') {
      addOneListener(self.pull, 'paused', pullPaused);
      addOneListener(self.push, 'paused', pushPaused);
    }
  });

  this.on('removeListener', function (event) {
    if (event === 'change') {
      self.pull.removeListener('change', pullChange);
      self.push.removeListener('change', pushChange);
    } else if (event === 'denied') {
      self.pull.removeListener('denied', pullDenied);
      self.push.removeListener('denied', pushDenied);
    } else if (event === 'active') {
      self.pull.removeListener('active', pullActive);
      self.push.removeListener('active', pushActive);
    } else if (event === 'paused') {
      self.pull.removeListener('paused', pullPaused);
      self.push.removeListener('paused', pushPaused);
    }
  });

  this.pull.on('removeListener', removeAll('pull'));
  this.push.on('removeListener', removeAll('push'));

  var promise = Promise.all([
    this.push,
    this.pull
  ]).then(function (resp) {
    var out = {
      push: resp[0],
      pull: resp[1]
    };
    self.emit('complete', out);
    if (callback) {
      callback(null, out);
    }
    self.removeAllListeners();
    return out;
  }, function (err) {
    self.cancel();
    if (callback) {
      // if there's a callback, then the callback can receive
      // the error event
      callback(err);
    } else {
      // if there's no callback, then we're safe to emit an error
      // event, which would otherwise throw an unhandled error
      // due to 'error' being a special event in EventEmitters
      self.emit('error', err);
    }
    self.removeAllListeners();
    if (callback) {
      // no sense throwing if we're already emitting an 'error' event
      throw err;
    }
  });

  this.then = function (success, err) {
    return promise.then(success, err);
  };

  this.catch = function (err) {
    return promise.catch(err);
  };
}

Sync.prototype.cancel = function () {
  if (!this.canceled) {
    this.canceled = true;
    this.push.cancel();
    this.pull.cancel();
  }
};

function replication(PouchDB) {
  PouchDB.replicate = replicateWrapper;
  PouchDB.sync = sync;

  Object.defineProperty(PouchDB.prototype, 'replicate', {
    get: function () {
      var self = this;
      if (typeof this.replicateMethods === 'undefined') {
        this.replicateMethods = {
          from: function (other, opts, callback) {
            return self.constructor.replicate(other, self, opts, callback);
          },
          to: function (other, opts, callback) {
            return self.constructor.replicate(self, other, opts, callback);
          }
        };
      }
      return this.replicateMethods;
    }
  });

  PouchDB.prototype.sync = function (dbName, opts, callback) {
    return this.constructor.sync(this, dbName, opts, callback);
  };
}

PouchDB.plugin(IDBPouch)
  .plugin(HttpPouch$1)
  .plugin(mapreduce)
  .plugin(replication);

module.exports = PouchDB;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":6,"argsarray":1,"events":2,"immediate":3,"inherits":4,"spark-md5":7,"uuid":9,"vuvuzela":18}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
(function (factory) {
    if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals (with support for web workers)
        var glob;

        try {
            glob = window;
        } catch (e) {
            glob = self;
        }

        glob.SparkMD5 = factory();
    }
}(function (undefined) {

    'use strict';

    /*
     * Fastest md5 implementation around (JKM md5).
     * Credits: Joseph Myers
     *
     * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
     * @see http://jsperf.com/md5-shootout/7
     */

    /* this function is much faster,
      so if possible we use it. Some IEs
      are the only ones I know of that
      need the idiotic second function,
      generated by an if clause.  */
    var add32 = function (a, b) {
        return (a + b) & 0xFFFFFFFF;
    },
        hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];


    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function md5cycle(x, k) {
        var a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];

        a += (b & c | ~b & d) + k[0] - 680876936 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[1] - 389564586 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[2] + 606105819 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[4] - 176418897 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[7] - 45705983 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[10] - 42063 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
        a  = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[13] - 40341101 | 0;
        d  = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
        c  = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
        b  = (b << 22 | b >>> 10) + c | 0;

        a += (b & d | c & ~d) + k[1] - 165796510 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[11] + 643717713 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[0] - 373897302 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[5] - 701558691 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[10] + 38016083 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[15] - 660478335 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[4] - 405537848 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[9] + 568446438 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[3] - 187363961 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
        a  = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[2] - 51403784 | 0;
        d  = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
        c  = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
        b  = (b << 20 | b >>> 12) + c | 0;

        a += (b ^ c ^ d) + k[5] - 378558 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[14] - 35309556 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[7] - 155497632 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[13] + 681279174 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[0] - 358537222 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[3] - 722521979 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[6] + 76029189 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[9] - 640364487 | 0;
        a  = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[12] - 421815835 | 0;
        d  = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[15] + 530742520 | 0;
        c  = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[2] - 995338651 | 0;
        b  = (b << 23 | b >>> 9) + c | 0;

        a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
        b  = (b << 21 |b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
        a  = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
        d  = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
        c  = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
        b  = (b << 21 | b >>> 11) + c | 0;

        x[0] = a + x[0] | 0;
        x[1] = b + x[1] | 0;
        x[2] = c + x[2] | 0;
        x[3] = d + x[3] | 0;
    }

    function md5blk(s) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }

    function md5blk_array(a) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
    }

    function md51(s) {
        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        }
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);
        return state;
    }

    function md51_array(a) {
        var n = a.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }

        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
        // containing the last element of the parent array if the sub array specified starts
        // beyond the length of the parent array - weird.
        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
        a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= a[i] << ((i % 4) << 3);
        }

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);

        return state;
    }

    function rhex(n) {
        var s = '',
            j;
        for (j = 0; j < 4; j += 1) {
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        }
        return s;
    }

    function hex(x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
            x[i] = rhex(x[i]);
        }
        return x.join('');
    }

    // In some cases the fast add32 function cannot be used..
    if (hex(md51('hello')) !== '5d41402abc4b2a76b9719d911017c592') {
        add32 = function (x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        };
    }

    // ---------------------------------------------------

    /**
     * ArrayBuffer slice polyfill.
     *
     * @see https://github.com/ttaubert/node-arraybuffer-slice
     */

    if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
        (function () {
            function clamp(val, length) {
                val = (val | 0) || 0;

                if (val < 0) {
                    return Math.max(val + length, 0);
                }

                return Math.min(val, length);
            }

            ArrayBuffer.prototype.slice = function (from, to) {
                var length = this.byteLength,
                    begin = clamp(from, length),
                    end = length,
                    num,
                    target,
                    targetArray,
                    sourceArray;

                if (to !== undefined) {
                    end = clamp(to, length);
                }

                if (begin > end) {
                    return new ArrayBuffer(0);
                }

                num = end - begin;
                target = new ArrayBuffer(num);
                targetArray = new Uint8Array(target);

                sourceArray = new Uint8Array(this, begin, num);
                targetArray.set(sourceArray);

                return target;
            };
        })();
    }

    // ---------------------------------------------------

    /**
     * Helpers.
     */

    function toUtf8(str) {
        if (/[\u0080-\uFFFF]/.test(str)) {
            str = unescape(encodeURIComponent(str));
        }

        return str;
    }

    function utf8Str2ArrayBuffer(str, returnUInt8Array) {
        var length = str.length,
           buff = new ArrayBuffer(length),
           arr = new Uint8Array(buff),
           i;

        for (i = 0; i < length; i += 1) {
            arr[i] = str.charCodeAt(i);
        }

        return returnUInt8Array ? arr : buff;
    }

    function arrayBuffer2Utf8Str(buff) {
        return String.fromCharCode.apply(null, new Uint8Array(buff));
    }

    function concatenateArrayBuffers(first, second, returnUInt8Array) {
        var result = new Uint8Array(first.byteLength + second.byteLength);

        result.set(new Uint8Array(first));
        result.set(new Uint8Array(second), first.byteLength);

        return returnUInt8Array ? result : result.buffer;
    }

    function hexToBinaryString(hex) {
        var bytes = [],
            length = hex.length,
            x;

        for (x = 0; x < length - 1; x += 2) {
            bytes.push(parseInt(hex.substr(x, 2), 16));
        }

        return String.fromCharCode.apply(String, bytes);
    }

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation.
     *
     * Use this class to perform an incremental md5, otherwise use the
     * static methods instead.
     */

    function SparkMD5() {
        // call reset to init the instance
        this.reset();
    }

    /**
     * Appends a string.
     * A conversion will be applied if an utf8 string is detected.
     *
     * @param {String} str The string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.append = function (str) {
        // Converts the string to utf8 bytes if necessary
        // Then append as binary
        this.appendBinary(toUtf8(str));

        return this;
    };

    /**
     * Appends a binary string.
     *
     * @param {String} contents The binary string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.appendBinary = function (contents) {
        this._buff += contents;
        this._length += contents.length;

        var length = this._buff.length,
            i;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
        }

        this._buff = this._buff.substring(i - 64);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            i,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.reset = function () {
        this._buff = '';
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.prototype.getState = function () {
        return {
            buff: this._buff,
            length: this._length,
            hash: this._hash
        };
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.setState = function (state) {
        this._buff = state.buff;
        this._length = state.length;
        this._hash = state.hash;

        return this;
    };

    /**
     * Releases memory used by the incremental buffer and other additional
     * resources. If you plan to use the instance again, use reset instead.
     */
    SparkMD5.prototype.destroy = function () {
        delete this._hash;
        delete this._buff;
        delete this._length;
    };

    /**
     * Finish the final calculation based on the tail.
     *
     * @param {Array}  tail   The tail (will be modified)
     * @param {Number} length The length of the remaining buffer
     */
    SparkMD5.prototype._finish = function (tail, length) {
        var i = length,
            tmp,
            lo,
            hi;

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(this._hash, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Do the final computation based on the tail and length
        // Beware that the final length may not fit in 32 bits so we take care of that
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._hash, tail);
    };

    /**
     * Performs the md5 hash on a string.
     * A conversion will be applied if utf8 string is detected.
     *
     * @param {String}  str The string
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hash = function (str, raw) {
        // Converts the string to utf8 bytes if necessary
        // Then compute it using the binary function
        return SparkMD5.hashBinary(toUtf8(str), raw);
    };

    /**
     * Performs the md5 hash on a binary string.
     *
     * @param {String}  content The binary string
     * @param {Boolean} raw     True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hashBinary = function (content, raw) {
        var hash = md51(content),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation for array buffers.
     *
     * Use this class to perform an incremental md5 ONLY for array buffers.
     */
    SparkMD5.ArrayBuffer = function () {
        // call reset to init the instance
        this.reset();
    };

    /**
     * Appends an array buffer.
     *
     * @param {ArrayBuffer} arr The array to be appended
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true),
            length = buff.length,
            i;

        this._length += arr.byteLength;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
        }

        this._buff = (i - 64) < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            i,
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.reset = function () {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.ArrayBuffer.prototype.getState = function () {
        var state = SparkMD5.prototype.getState.call(this);

        // Convert buffer to a string
        state.buff = arrayBuffer2Utf8Str(state.buff);

        return state;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.setState = function (state) {
        // Convert string to buffer
        state.buff = utf8Str2ArrayBuffer(state.buff, true);

        return SparkMD5.prototype.setState.call(this, state);
    };

    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

    /**
     * Performs the md5 hash on an array buffer.
     *
     * @param {ArrayBuffer} arr The array buffer
     * @param {Boolean}     raw True to get the raw string, false to get the hex one
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
        var hash = md51_array(new Uint8Array(arr)),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    return SparkMD5;
}));

},{}],8:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":6,"timers":8}],9:[function(require,module,exports){
var v1 = require('./v1');
var v4 = require('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":12,"./v4":13}],10:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return ([bth[buf[i++]], bth[buf[i++]], 
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]]]).join('');
}

module.exports = bytesToUuid;

},{}],11:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto
// implementation. Also, find the complete implementation of crypto on IE11.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && typeof window.msCrypto.getRandomValues == 'function' && msCrypto.getRandomValues.bind(msCrypto));

if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

},{}],12:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;
var _clockseq;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189
  if (node == null || clockseq == null) {
    var seedBytes = rng();
    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [
        seedBytes[0] | 0x01,
        seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
      ];
    }
    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  }

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":10,"./lib/rng":11}],13:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":10,"./lib/rng":11}],14:[function(require,module,exports){
var Vue // late bind
var version
var map = Object.create(null)
if (typeof window !== 'undefined') {
  window.__VUE_HOT_MAP__ = map
}
var installed = false
var isBrowserify = false
var initHookName = 'beforeCreate'

exports.install = function (vue, browserify) {
  if (installed) { return }
  installed = true

  Vue = vue.__esModule ? vue.default : vue
  version = Vue.version.split('.').map(Number)
  isBrowserify = browserify

  // compat with < 2.0.0-alpha.7
  if (Vue.config._lifecycleHooks.indexOf('init') > -1) {
    initHookName = 'init'
  }

  exports.compatible = version[0] >= 2
  if (!exports.compatible) {
    console.warn(
      '[HMR] You are using a version of vue-hot-reload-api that is ' +
        'only compatible with Vue.js core ^2.0.0.'
    )
    return
  }
}

/**
 * Create a record for a hot module, which keeps track of its constructor
 * and instances
 *
 * @param {String} id
 * @param {Object} options
 */

exports.createRecord = function (id, options) {
  if(map[id]) { return }

  var Ctor = null
  if (typeof options === 'function') {
    Ctor = options
    options = Ctor.options
  }
  makeOptionsHot(id, options)
  map[id] = {
    Ctor: Ctor,
    options: options,
    instances: []
  }
}

/**
 * Check if module is recorded
 *
 * @param {String} id
 */

exports.isRecorded = function (id) {
  return typeof map[id] !== 'undefined'
}

/**
 * Make a Component options object hot.
 *
 * @param {String} id
 * @param {Object} options
 */

function makeOptionsHot(id, options) {
  if (options.functional) {
    var render = options.render
    options.render = function (h, ctx) {
      var instances = map[id].instances
      if (ctx && instances.indexOf(ctx.parent) < 0) {
        instances.push(ctx.parent)
      }
      return render(h, ctx)
    }
  } else {
    injectHook(options, initHookName, function() {
      var record = map[id]
      if (!record.Ctor) {
        record.Ctor = this.constructor
      }
      record.instances.push(this)
    })
    injectHook(options, 'beforeDestroy', function() {
      var instances = map[id].instances
      instances.splice(instances.indexOf(this), 1)
    })
  }
}

/**
 * Inject a hook to a hot reloadable component so that
 * we can keep track of it.
 *
 * @param {Object} options
 * @param {String} name
 * @param {Function} hook
 */

function injectHook(options, name, hook) {
  var existing = options[name]
  options[name] = existing
    ? Array.isArray(existing) ? existing.concat(hook) : [existing, hook]
    : [hook]
}

function tryWrap(fn) {
  return function (id, arg) {
    try {
      fn(id, arg)
    } catch (e) {
      console.error(e)
      console.warn(
        'Something went wrong during Vue component hot-reload. Full reload required.'
      )
    }
  }
}

function updateOptions (oldOptions, newOptions) {
  for (var key in oldOptions) {
    if (!(key in newOptions)) {
      delete oldOptions[key]
    }
  }
  for (var key$1 in newOptions) {
    oldOptions[key$1] = newOptions[key$1]
  }
}

exports.rerender = tryWrap(function (id, options) {
  var record = map[id]
  if (!options) {
    record.instances.slice().forEach(function (instance) {
      instance.$forceUpdate()
    })
    return
  }
  if (typeof options === 'function') {
    options = options.options
  }
  if (record.Ctor) {
    record.Ctor.options.render = options.render
    record.Ctor.options.staticRenderFns = options.staticRenderFns
    record.instances.slice().forEach(function (instance) {
      instance.$options.render = options.render
      instance.$options.staticRenderFns = options.staticRenderFns
      // reset static trees
      // pre 2.5, all static trees are cached together on the instance
      if (instance._staticTrees) {
        instance._staticTrees = []
      }
      // 2.5.0
      if (Array.isArray(record.Ctor.options.cached)) {
        record.Ctor.options.cached = []
      }
      // 2.5.3
      if (Array.isArray(instance.$options.cached)) {
        instance.$options.cached = []
      }

      // post 2.5.4: v-once trees are cached on instance._staticTrees.
      // Pure static trees are cached on the staticRenderFns array
      // (both already reset above)

      // 2.6: temporarily mark rendered scoped slots as unstable so that
      // child components can be forced to update
      var restore = patchScopedSlots(instance)
      instance.$forceUpdate()
      instance.$nextTick(restore)
    })
  } else {
    // functional or no instance created yet
    record.options.render = options.render
    record.options.staticRenderFns = options.staticRenderFns

    // handle functional component re-render
    if (record.options.functional) {
      // rerender with full options
      if (Object.keys(options).length > 2) {
        updateOptions(record.options, options)
      } else {
        // template-only rerender.
        // need to inject the style injection code for CSS modules
        // to work properly.
        var injectStyles = record.options._injectStyles
        if (injectStyles) {
          var render = options.render
          record.options.render = function (h, ctx) {
            injectStyles.call(ctx)
            return render(h, ctx)
          }
        }
      }
      record.options._Ctor = null
      // 2.5.3
      if (Array.isArray(record.options.cached)) {
        record.options.cached = []
      }
      record.instances.slice().forEach(function (instance) {
        instance.$forceUpdate()
      })
    }
  }
})

exports.reload = tryWrap(function (id, options) {
  var record = map[id]
  if (options) {
    if (typeof options === 'function') {
      options = options.options
    }
    makeOptionsHot(id, options)
    if (record.Ctor) {
      if (version[1] < 2) {
        // preserve pre 2.2 behavior for global mixin handling
        record.Ctor.extendOptions = options
      }
      var newCtor = record.Ctor.super.extend(options)
      // prevent record.options._Ctor from being overwritten accidentally
      newCtor.options._Ctor = record.options._Ctor
      record.Ctor.options = newCtor.options
      record.Ctor.cid = newCtor.cid
      record.Ctor.prototype = newCtor.prototype
      if (newCtor.release) {
        // temporary global mixin strategy used in < 2.0.0-alpha.6
        newCtor.release()
      }
    } else {
      updateOptions(record.options, options)
    }
  }
  record.instances.slice().forEach(function (instance) {
    if (instance.$vnode && instance.$vnode.context) {
      instance.$vnode.context.$forceUpdate()
    } else {
      console.warn(
        'Root or manually mounted instance modified. Full reload required.'
      )
    }
  })
})

// 2.6 optimizes template-compiled scoped slots and skips updates if child
// only uses scoped slots. We need to patch the scoped slots resolving helper
// to temporarily mark all scoped slots as unstable in order to force child
// updates.
function patchScopedSlots (instance) {
  if (!instance._u) { return }
  // https://github.com/vuejs/vue/blob/dev/src/core/instance/render-helpers/resolve-scoped-slots.js
  var original = instance._u
  instance._u = function (slots) {
    try {
      // 2.6.4 ~ 2.6.6
      return original(slots, true)
    } catch (e) {
      // 2.5 / >= 2.6.7
      return original(slots, null, true)
    }
  }
  return function () {
    instance._u = original
  }
}

},{}],15:[function(require,module,exports){
(function (global,setImmediate){
/*!
 * Vue.js v2.6.11
 * (c) 2014-2019 Evan You
 * Released under the MIT License.
 */
'use strict';

/*  */

var emptyObject = Object.freeze({});

// These helpers produce better VM code in JS engines due to their
// explicitness and function inlining.
function isUndef (v) {
  return v === undefined || v === null
}

function isDef (v) {
  return v !== undefined && v !== null
}

function isTrue (v) {
  return v === true
}

function isFalse (v) {
  return v === false
}

/**
 * Check if value is primitive.
 */
function isPrimitive (value) {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

/**
 * Get the raw type string of a value, e.g., [object Object].
 */
var _toString = Object.prototype.toString;

function toRawType (value) {
  return _toString.call(value).slice(8, -1)
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
function isPlainObject (obj) {
  return _toString.call(obj) === '[object Object]'
}

function isRegExp (v) {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * Check if val is a valid array index.
 */
function isValidArrayIndex (val) {
  var n = parseFloat(String(val));
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

function isPromise (val) {
  return (
    isDef(val) &&
    typeof val.then === 'function' &&
    typeof val.catch === 'function'
  )
}

/**
 * Convert a value to a string that is actually rendered.
 */
function toString (val) {
  return val == null
    ? ''
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
      ? JSON.stringify(val, null, 2)
      : String(val)
}

/**
 * Convert an input value to a number for persistence.
 * If the conversion fails, return original string.
 */
function toNumber (val) {
  var n = parseFloat(val);
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap (
  str,
  expectsLowerCase
) {
  var map = Object.create(null);
  var list = str.split(',');
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase
    ? function (val) { return map[val.toLowerCase()]; }
    : function (val) { return map[val]; }
}

/**
 * Check if a tag is a built-in tag.
 */
var isBuiltInTag = makeMap('slot,component', true);

/**
 * Check if an attribute is a reserved attribute.
 */
var isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');

/**
 * Remove an item from an array.
 */
function remove (arr, item) {
  if (arr.length) {
    var index = arr.indexOf(item);
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

/**
 * Check whether an object has the property.
 */
var hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn (obj, key) {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 */
function cached (fn) {
  var cache = Object.create(null);
  return (function cachedFn (str) {
    var hit = cache[str];
    return hit || (cache[str] = fn(str))
  })
}

/**
 * Camelize a hyphen-delimited string.
 */
var camelizeRE = /-(\w)/g;
var camelize = cached(function (str) {
  return str.replace(camelizeRE, function (_, c) { return c ? c.toUpperCase() : ''; })
});

/**
 * Capitalize a string.
 */
var capitalize = cached(function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
});

/**
 * Hyphenate a camelCase string.
 */
var hyphenateRE = /\B([A-Z])/g;
var hyphenate = cached(function (str) {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
});

/**
 * Simple bind polyfill for environments that do not support it,
 * e.g., PhantomJS 1.x. Technically, we don't need this anymore
 * since native bind is now performant enough in most browsers.
 * But removing it would mean breaking code that was able to run in
 * PhantomJS 1.x, so this must be kept for backward compatibility.
 */

/* istanbul ignore next */
function polyfillBind (fn, ctx) {
  function boundFn (a) {
    var l = arguments.length;
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }

  boundFn._length = fn.length;
  return boundFn
}

function nativeBind (fn, ctx) {
  return fn.bind(ctx)
}

var bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind;

/**
 * Convert an Array-like object to a real Array.
 */
function toArray (list, start) {
  start = start || 0;
  var i = list.length - start;
  var ret = new Array(i);
  while (i--) {
    ret[i] = list[i + start];
  }
  return ret
}

/**
 * Mix properties into target object.
 */
function extend (to, _from) {
  for (var key in _from) {
    to[key] = _from[key];
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 */
function toObject (arr) {
  var res = {};
  for (var i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i]);
    }
  }
  return res
}

/* eslint-disable no-unused-vars */

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
function noop (a, b, c) {}

/**
 * Always return false.
 */
var no = function (a, b, c) { return false; };

/* eslint-enable no-unused-vars */

/**
 * Return the same value.
 */
var identity = function (_) { return _; };

/**
 * Generate a string containing static keys from compiler modules.
 */
function genStaticKeys (modules) {
  return modules.reduce(function (keys, m) {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 */
function looseEqual (a, b) {
  if (a === b) { return true }
  var isObjectA = isObject(a);
  var isObjectB = isObject(b);
  if (isObjectA && isObjectB) {
    try {
      var isArrayA = Array.isArray(a);
      var isArrayB = Array.isArray(b);
      if (isArrayA && isArrayB) {
        return a.length === b.length && a.every(function (e, i) {
          return looseEqual(e, b[i])
        })
      } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
      } else if (!isArrayA && !isArrayB) {
        var keysA = Object.keys(a);
        var keysB = Object.keys(b);
        return keysA.length === keysB.length && keysA.every(function (key) {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}

/**
 * Return the first index at which a loosely equal value can be
 * found in the array (if value is a plain object, the array must
 * contain an object of the same shape), or -1 if it is not present.
 */
function looseIndexOf (arr, val) {
  for (var i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) { return i }
  }
  return -1
}

/**
 * Ensure a function is called only once.
 */
function once (fn) {
  var called = false;
  return function () {
    if (!called) {
      called = true;
      fn.apply(this, arguments);
    }
  }
}

var SSR_ATTR = 'data-server-rendered';

var ASSET_TYPES = [
  'component',
  'directive',
  'filter'
];

var LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'errorCaptured',
  'serverPrefetch'
];

/*  */



var config = ({
  /**
   * Option merge strategies (used in core/util/options)
   */
  // $flow-disable-line
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   */
  productionTip: "development" !== 'production',

  /**
   * Whether to enable devtools
   */
  devtools: "development" !== 'production',

  /**
   * Whether to record perf
   */
  performance: false,

  /**
   * Error handler for watcher errors
   */
  errorHandler: null,

  /**
   * Warn handler for watcher warns
   */
  warnHandler: null,

  /**
   * Ignore certain custom elements
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   */
  // $flow-disable-line
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   */
  isReservedTag: no,

  /**
   * Check if an attribute is reserved so that it cannot be used as a component
   * prop. This is platform-dependent and may be overwritten.
   */
  isReservedAttr: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   */
  mustUseProp: no,

  /**
   * Perform updates asynchronously. Intended to be used by Vue Test Utils
   * This will significantly reduce performance if set to false.
   */
  async: true,

  /**
   * Exposed for legacy reasons
   */
  _lifecycleHooks: LIFECYCLE_HOOKS
});

/*  */

/**
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 */
var unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

/**
 * Check if a string starts with $ or _
 */
function isReserved (str) {
  var c = (str + '').charCodeAt(0);
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 */
function def (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  });
}

/**
 * Parse simple path.
 */
var bailRE = new RegExp(("[^" + (unicodeRegExp.source) + ".$_\\d]"));
function parsePath (path) {
  if (bailRE.test(path)) {
    return
  }
  var segments = path.split('.');
  return function (obj) {
    for (var i = 0; i < segments.length; i++) {
      if (!obj) { return }
      obj = obj[segments[i]];
    }
    return obj
  }
}

/*  */

// can we use __proto__?
var hasProto = '__proto__' in {};

// Browser environment sniffing
var inBrowser = typeof window !== 'undefined';
var inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform;
var weexPlatform = inWeex && WXEnvironment.platform.toLowerCase();
var UA = inBrowser && window.navigator.userAgent.toLowerCase();
var isIE = UA && /msie|trident/.test(UA);
var isIE9 = UA && UA.indexOf('msie 9.0') > 0;
var isEdge = UA && UA.indexOf('edge/') > 0;
var isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android');
var isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios');
var isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;
var isPhantomJS = UA && /phantomjs/.test(UA);
var isFF = UA && UA.match(/firefox\/(\d+)/);

// Firefox has a "watch" function on Object.prototype...
var nativeWatch = ({}).watch;

var supportsPassive = false;
if (inBrowser) {
  try {
    var opts = {};
    Object.defineProperty(opts, 'passive', ({
      get: function get () {
        /* istanbul ignore next */
        supportsPassive = true;
      }
    })); // https://github.com/facebook/flow/issues/285
    window.addEventListener('test-passive', null, opts);
  } catch (e) {}
}

// this needs to be lazy-evaled because vue may be required before
// vue-server-renderer can set VUE_ENV
var _isServer;
var isServerRendering = function () {
  if (_isServer === undefined) {
    /* istanbul ignore if */
    if (!inBrowser && !inWeex && typeof global !== 'undefined') {
      // detect presence of vue-server-renderer and avoid
      // Webpack shimming the process
      _isServer = global['process'] && global['process'].env.VUE_ENV === 'server';
    } else {
      _isServer = false;
    }
  }
  return _isServer
};

// detect devtools
var devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__;

/* istanbul ignore next */
function isNative (Ctor) {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}

var hasSymbol =
  typeof Symbol !== 'undefined' && isNative(Symbol) &&
  typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys);

var _Set;
/* istanbul ignore if */ // $flow-disable-line
if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  _Set = Set;
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = /*@__PURE__*/(function () {
    function Set () {
      this.set = Object.create(null);
    }
    Set.prototype.has = function has (key) {
      return this.set[key] === true
    };
    Set.prototype.add = function add (key) {
      this.set[key] = true;
    };
    Set.prototype.clear = function clear () {
      this.set = Object.create(null);
    };

    return Set;
  }());
}

/*  */

var warn = noop;
var tip = noop;
var generateComponentTrace = (noop); // work around flow check
var formatComponentName = (noop);

{
  var hasConsole = typeof console !== 'undefined';
  var classifyRE = /(?:^|[-_])(\w)/g;
  var classify = function (str) { return str
    .replace(classifyRE, function (c) { return c.toUpperCase(); })
    .replace(/[-_]/g, ''); };

  warn = function (msg, vm) {
    var trace = vm ? generateComponentTrace(vm) : '';

    if (config.warnHandler) {
      config.warnHandler.call(null, msg, vm, trace);
    } else if (hasConsole && (!config.silent)) {
      console.error(("[Vue warn]: " + msg + trace));
    }
  };

  tip = function (msg, vm) {
    if (hasConsole && (!config.silent)) {
      console.warn("[Vue tip]: " + msg + (
        vm ? generateComponentTrace(vm) : ''
      ));
    }
  };

  formatComponentName = function (vm, includeFile) {
    if (vm.$root === vm) {
      return '<Root>'
    }
    var options = typeof vm === 'function' && vm.cid != null
      ? vm.options
      : vm._isVue
        ? vm.$options || vm.constructor.options
        : vm;
    var name = options.name || options._componentTag;
    var file = options.__file;
    if (!name && file) {
      var match = file.match(/([^/\\]+)\.vue$/);
      name = match && match[1];
    }

    return (
      (name ? ("<" + (classify(name)) + ">") : "<Anonymous>") +
      (file && includeFile !== false ? (" at " + file) : '')
    )
  };

  var repeat = function (str, n) {
    var res = '';
    while (n) {
      if (n % 2 === 1) { res += str; }
      if (n > 1) { str += str; }
      n >>= 1;
    }
    return res
  };

  generateComponentTrace = function (vm) {
    if (vm._isVue && vm.$parent) {
      var tree = [];
      var currentRecursiveSequence = 0;
      while (vm) {
        if (tree.length > 0) {
          var last = tree[tree.length - 1];
          if (last.constructor === vm.constructor) {
            currentRecursiveSequence++;
            vm = vm.$parent;
            continue
          } else if (currentRecursiveSequence > 0) {
            tree[tree.length - 1] = [last, currentRecursiveSequence];
            currentRecursiveSequence = 0;
          }
        }
        tree.push(vm);
        vm = vm.$parent;
      }
      return '\n\nfound in\n\n' + tree
        .map(function (vm, i) { return ("" + (i === 0 ? '---> ' : repeat(' ', 5 + i * 2)) + (Array.isArray(vm)
            ? ((formatComponentName(vm[0])) + "... (" + (vm[1]) + " recursive calls)")
            : formatComponentName(vm))); })
        .join('\n')
    } else {
      return ("\n\n(found in " + (formatComponentName(vm)) + ")")
    }
  };
}

/*  */

var uid = 0;

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
var Dep = function Dep () {
  this.id = uid++;
  this.subs = [];
};

Dep.prototype.addSub = function addSub (sub) {
  this.subs.push(sub);
};

Dep.prototype.removeSub = function removeSub (sub) {
  remove(this.subs, sub);
};

Dep.prototype.depend = function depend () {
  if (Dep.target) {
    Dep.target.addDep(this);
  }
};

Dep.prototype.notify = function notify () {
  // stabilize the subscriber list first
  var subs = this.subs.slice();
  if (!config.async) {
    // subs aren't sorted in scheduler if not running async
    // we need to sort them now to make sure they fire in correct
    // order
    subs.sort(function (a, b) { return a.id - b.id; });
  }
  for (var i = 0, l = subs.length; i < l; i++) {
    subs[i].update();
  }
};

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null;
var targetStack = [];

function pushTarget (target) {
  targetStack.push(target);
  Dep.target = target;
}

function popTarget () {
  targetStack.pop();
  Dep.target = targetStack[targetStack.length - 1];
}

/*  */

var VNode = function VNode (
  tag,
  data,
  children,
  text,
  elm,
  context,
  componentOptions,
  asyncFactory
) {
  this.tag = tag;
  this.data = data;
  this.children = children;
  this.text = text;
  this.elm = elm;
  this.ns = undefined;
  this.context = context;
  this.fnContext = undefined;
  this.fnOptions = undefined;
  this.fnScopeId = undefined;
  this.key = data && data.key;
  this.componentOptions = componentOptions;
  this.componentInstance = undefined;
  this.parent = undefined;
  this.raw = false;
  this.isStatic = false;
  this.isRootInsert = true;
  this.isComment = false;
  this.isCloned = false;
  this.isOnce = false;
  this.asyncFactory = asyncFactory;
  this.asyncMeta = undefined;
  this.isAsyncPlaceholder = false;
};

var prototypeAccessors = { child: { configurable: true } };

// DEPRECATED: alias for componentInstance for backwards compat.
/* istanbul ignore next */
prototypeAccessors.child.get = function () {
  return this.componentInstance
};

Object.defineProperties( VNode.prototype, prototypeAccessors );

var createEmptyVNode = function (text) {
  if ( text === void 0 ) text = '';

  var node = new VNode();
  node.text = text;
  node.isComment = true;
  return node
};

function createTextVNode (val) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
function cloneVNode (vnode) {
  var cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  );
  cloned.ns = vnode.ns;
  cloned.isStatic = vnode.isStatic;
  cloned.key = vnode.key;
  cloned.isComment = vnode.isComment;
  cloned.fnContext = vnode.fnContext;
  cloned.fnOptions = vnode.fnOptions;
  cloned.fnScopeId = vnode.fnScopeId;
  cloned.asyncMeta = vnode.asyncMeta;
  cloned.isCloned = true;
  return cloned
}

/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

var arrayProto = Array.prototype;
var arrayMethods = Object.create(arrayProto);

var methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
];

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  var original = arrayProto[method];
  def(arrayMethods, method, function mutator () {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

    var result = original.apply(this, args);
    var ob = this.__ob__;
    var inserted;
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args;
        break
      case 'splice':
        inserted = args.slice(2);
        break
    }
    if (inserted) { ob.observeArray(inserted); }
    // notify change
    ob.dep.notify();
    return result
  });
});

/*  */

var arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
var shouldObserve = true;

function toggleObserving (value) {
  shouldObserve = value;
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
var Observer = function Observer (value) {
  this.value = value;
  this.dep = new Dep();
  this.vmCount = 0;
  def(value, '__ob__', this);
  if (Array.isArray(value)) {
    if (hasProto) {
      protoAugment(value, arrayMethods);
    } else {
      copyAugment(value, arrayMethods, arrayKeys);
    }
    this.observeArray(value);
  } else {
    this.walk(value);
  }
};

/**
 * Walk through all properties and convert them into
 * getter/setters. This method should only be called when
 * value type is Object.
 */
Observer.prototype.walk = function walk (obj) {
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    defineReactive$$1(obj, keys[i]);
  }
};

/**
 * Observe a list of Array items.
 */
Observer.prototype.observeArray = function observeArray (items) {
  for (var i = 0, l = items.length; i < l; i++) {
    observe(items[i]);
  }
};

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src) {
  /* eslint-disable no-proto */
  target.__proto__ = src;
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target, src, keys) {
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    def(target, key, src[key]);
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
function observe (value, asRootData) {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  var ob;
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value);
  }
  if (asRootData && ob) {
    ob.vmCount++;
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
function defineReactive$$1 (
  obj,
  key,
  val,
  customSetter,
  shallow
) {
  var dep = new Dep();

  var property = Object.getOwnPropertyDescriptor(obj, key);
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  var getter = property && property.get;
  var setter = property && property.set;
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key];
  }

  var childOb = !shallow && observe(val);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      var value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        dep.depend();
        if (childOb) {
          childOb.dep.depend();
          if (Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      var value = getter ? getter.call(obj) : val;
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (customSetter) {
        customSetter();
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) { return }
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }
      childOb = !shallow && observe(newVal);
      dep.notify();
    }
  });
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
function set (target, key, val) {
  if (isUndef(target) || isPrimitive(target)
  ) {
    warn(("Cannot set reactive property on undefined, null, or primitive value: " + ((target))));
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val;
    return val
  }
  var ob = (target).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    );
    return val
  }
  if (!ob) {
    target[key] = val;
    return val
  }
  defineReactive$$1(ob.value, key, val);
  ob.dep.notify();
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
function del (target, key) {
  if (isUndef(target) || isPrimitive(target)
  ) {
    warn(("Cannot delete reactive property on undefined, null, or primitive value: " + ((target))));
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1);
    return
  }
  var ob = (target).__ob__;
  if (target._isVue || (ob && ob.vmCount)) {
    warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    );
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key];
  if (!ob) {
    return
  }
  ob.dep.notify();
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value) {
  for (var e = (void 0), i = 0, l = value.length; i < l; i++) {
    e = value[i];
    e && e.__ob__ && e.__ob__.dep.depend();
    if (Array.isArray(e)) {
      dependArray(e);
    }
  }
}

/*  */

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
var strats = config.optionMergeStrategies;

/**
 * Options with restrictions
 */
{
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        "option \"" + key + "\" can only be used during instance " +
        'creation with the `new` keyword.'
      );
    }
    return defaultStrat(parent, child)
  };
}

/**
 * Helper that recursively merges two data objects together.
 */
function mergeData (to, from) {
  if (!from) { return to }
  var key, toVal, fromVal;

  var keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from);

  for (var i = 0; i < keys.length; i++) {
    key = keys[i];
    // in case the object is already observed...
    if (key === '__ob__') { continue }
    toVal = to[key];
    fromVal = from[key];
    if (!hasOwn(to, key)) {
      set(to, key, fromVal);
    } else if (
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      mergeData(toVal, fromVal);
    }
  }
  return to
}

/**
 * Data
 */
function mergeDataOrFn (
  parentVal,
  childVal,
  vm
) {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn () {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn () {
      // instance merge
      var instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal;
      var defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal;
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

strats.data = function (
  parentVal,
  childVal,
  vm
) {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      );

      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
};

/**
 * Hooks and props are merged as arrays.
 */
function mergeHook (
  parentVal,
  childVal
) {
  var res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal;
  return res
    ? dedupeHooks(res)
    : res
}

function dedupeHooks (hooks) {
  var res = [];
  for (var i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i]);
    }
  }
  return res
}

LIFECYCLE_HOOKS.forEach(function (hook) {
  strats[hook] = mergeHook;
});

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
function mergeAssets (
  parentVal,
  childVal,
  vm,
  key
) {
  var res = Object.create(parentVal || null);
  if (childVal) {
    assertObjectType(key, childVal, vm);
    return extend(res, childVal)
  } else {
    return res
  }
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets;
});

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
strats.watch = function (
  parentVal,
  childVal,
  vm,
  key
) {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) { parentVal = undefined; }
  if (childVal === nativeWatch) { childVal = undefined; }
  /* istanbul ignore if */
  if (!childVal) { return Object.create(parentVal || null) }
  {
    assertObjectType(key, childVal, vm);
  }
  if (!parentVal) { return childVal }
  var ret = {};
  extend(ret, parentVal);
  for (var key$1 in childVal) {
    var parent = ret[key$1];
    var child = childVal[key$1];
    if (parent && !Array.isArray(parent)) {
      parent = [parent];
    }
    ret[key$1] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child];
  }
  return ret
};

/**
 * Other object hashes.
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal,
  childVal,
  vm,
  key
) {
  if (childVal && "development" !== 'production') {
    assertObjectType(key, childVal, vm);
  }
  if (!parentVal) { return childVal }
  var ret = Object.create(null);
  extend(ret, parentVal);
  if (childVal) { extend(ret, childVal); }
  return ret
};
strats.provide = mergeDataOrFn;

/**
 * Default strategy.
 */
var defaultStrat = function (parentVal, childVal) {
  return childVal === undefined
    ? parentVal
    : childVal
};

/**
 * Validate component names
 */
function checkComponents (options) {
  for (var key in options.components) {
    validateComponentName(key);
  }
}

function validateComponentName (name) {
  if (!new RegExp(("^[a-zA-Z][\\-\\.0-9_" + (unicodeRegExp.source) + "]*$")).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    );
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    );
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
function normalizeProps (options, vm) {
  var props = options.props;
  if (!props) { return }
  var res = {};
  var i, val, name;
  if (Array.isArray(props)) {
    i = props.length;
    while (i--) {
      val = props[i];
      if (typeof val === 'string') {
        name = camelize(val);
        res[name] = { type: null };
      } else {
        warn('props must be strings when using array syntax.');
      }
    }
  } else if (isPlainObject(props)) {
    for (var key in props) {
      val = props[key];
      name = camelize(key);
      res[name] = isPlainObject(val)
        ? val
        : { type: val };
    }
  } else {
    warn(
      "Invalid value for option \"props\": expected an Array or an Object, " +
      "but got " + (toRawType(props)) + ".",
      vm
    );
  }
  options.props = res;
}

/**
 * Normalize all injections into Object-based format
 */
function normalizeInject (options, vm) {
  var inject = options.inject;
  if (!inject) { return }
  var normalized = options.inject = {};
  if (Array.isArray(inject)) {
    for (var i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] };
    }
  } else if (isPlainObject(inject)) {
    for (var key in inject) {
      var val = inject[key];
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val };
    }
  } else {
    warn(
      "Invalid value for option \"inject\": expected an Array or an Object, " +
      "but got " + (toRawType(inject)) + ".",
      vm
    );
  }
}

/**
 * Normalize raw function directives into object format.
 */
function normalizeDirectives (options) {
  var dirs = options.directives;
  if (dirs) {
    for (var key in dirs) {
      var def$$1 = dirs[key];
      if (typeof def$$1 === 'function') {
        dirs[key] = { bind: def$$1, update: def$$1 };
      }
    }
  }
}

function assertObjectType (name, value, vm) {
  if (!isPlainObject(value)) {
    warn(
      "Invalid value for option \"" + name + "\": expected an Object, " +
      "but got " + (toRawType(value)) + ".",
      vm
    );
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
function mergeOptions (
  parent,
  child,
  vm
) {
  {
    checkComponents(child);
  }

  if (typeof child === 'function') {
    child = child.options;
  }

  normalizeProps(child, vm);
  normalizeInject(child, vm);
  normalizeDirectives(child);

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  if (!child._base) {
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm);
    }
    if (child.mixins) {
      for (var i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm);
      }
    }
  }

  var options = {};
  var key;
  for (key in parent) {
    mergeField(key);
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key);
    }
  }
  function mergeField (key) {
    var strat = strats[key] || defaultStrat;
    options[key] = strat(parent[key], child[key], vm, key);
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
function resolveAsset (
  options,
  type,
  id,
  warnMissing
) {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  var assets = options[type];
  // check local registration variations first
  if (hasOwn(assets, id)) { return assets[id] }
  var camelizedId = camelize(id);
  if (hasOwn(assets, camelizedId)) { return assets[camelizedId] }
  var PascalCaseId = capitalize(camelizedId);
  if (hasOwn(assets, PascalCaseId)) { return assets[PascalCaseId] }
  // fallback to prototype chain
  var res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
  if (warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    );
  }
  return res
}

/*  */



function validateProp (
  key,
  propOptions,
  propsData,
  vm
) {
  var prop = propOptions[key];
  var absent = !hasOwn(propsData, key);
  var value = propsData[key];
  // boolean casting
  var booleanIndex = getTypeIndex(Boolean, prop.type);
  if (booleanIndex > -1) {
    if (absent && !hasOwn(prop, 'default')) {
      value = false;
    } else if (value === '' || value === hyphenate(key)) {
      // only cast empty string / same name to boolean if
      // boolean has higher priority
      var stringIndex = getTypeIndex(String, prop.type);
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true;
      }
    }
  }
  // check default value
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key);
    // since the default value is a fresh copy,
    // make sure to observe it.
    var prevShouldObserve = shouldObserve;
    toggleObserving(true);
    observe(value);
    toggleObserving(prevShouldObserve);
  }
  {
    assertProp(prop, key, value, vm, absent);
  }
  return value
}

/**
 * Get the default value of a prop.
 */
function getPropDefaultValue (vm, prop, key) {
  // no default, return undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  var def = prop.default;
  // warn against non-factory defaults for Object & Array
  if (isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    );
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 */
function assertProp (
  prop,
  name,
  value,
  vm,
  absent
) {
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    );
    return
  }
  if (value == null && !prop.required) {
    return
  }
  var type = prop.type;
  var valid = !type || type === true;
  var expectedTypes = [];
  if (type) {
    if (!Array.isArray(type)) {
      type = [type];
    }
    for (var i = 0; i < type.length && !valid; i++) {
      var assertedType = assertType(value, type[i]);
      expectedTypes.push(assertedType.expectedType || '');
      valid = assertedType.valid;
    }
  }

  if (!valid) {
    warn(
      getInvalidTypeMessage(name, value, expectedTypes),
      vm
    );
    return
  }
  var validator = prop.validator;
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      );
    }
  }
}

var simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/;

function assertType (value, type) {
  var valid;
  var expectedType = getType(type);
  if (simpleCheckRE.test(expectedType)) {
    var t = typeof value;
    valid = t === expectedType.toLowerCase();
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type;
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value);
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value);
  } else {
    valid = value instanceof type;
  }
  return {
    valid: valid,
    expectedType: expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType (fn) {
  var match = fn && fn.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : ''
}

function isSameType (a, b) {
  return getType(a) === getType(b)
}

function getTypeIndex (type, expectedTypes) {
  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  for (var i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  return -1
}

function getInvalidTypeMessage (name, value, expectedTypes) {
  var message = "Invalid prop: type check failed for prop \"" + name + "\"." +
    " Expected " + (expectedTypes.map(capitalize).join(', '));
  var expectedType = expectedTypes[0];
  var receivedType = toRawType(value);
  var expectedValue = styleValue(value, expectedType);
  var receivedValue = styleValue(value, receivedType);
  // check if we need to specify expected value
  if (expectedTypes.length === 1 &&
      isExplicable(expectedType) &&
      !isBoolean(expectedType, receivedType)) {
    message += " with value " + expectedValue;
  }
  message += ", got " + receivedType + " ";
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    message += "with value " + receivedValue + ".";
  }
  return message
}

function styleValue (value, type) {
  if (type === 'String') {
    return ("\"" + value + "\"")
  } else if (type === 'Number') {
    return ("" + (Number(value)))
  } else {
    return ("" + value)
  }
}

function isExplicable (value) {
  var explicitTypes = ['string', 'number', 'boolean'];
  return explicitTypes.some(function (elem) { return value.toLowerCase() === elem; })
}

function isBoolean () {
  var args = [], len = arguments.length;
  while ( len-- ) args[ len ] = arguments[ len ];

  return args.some(function (elem) { return elem.toLowerCase() === 'boolean'; })
}

/*  */

function handleError (err, vm, info) {
  // Deactivate deps tracking while processing error handler to avoid possible infinite rendering.
  // See: https://github.com/vuejs/vuex/issues/1505
  pushTarget();
  try {
    if (vm) {
      var cur = vm;
      while ((cur = cur.$parent)) {
        var hooks = cur.$options.errorCaptured;
        if (hooks) {
          for (var i = 0; i < hooks.length; i++) {
            try {
              var capture = hooks[i].call(cur, err, vm, info) === false;
              if (capture) { return }
            } catch (e) {
              globalHandleError(e, cur, 'errorCaptured hook');
            }
          }
        }
      }
    }
    globalHandleError(err, vm, info);
  } finally {
    popTarget();
  }
}

function invokeWithErrorHandling (
  handler,
  context,
  args,
  vm,
  info
) {
  var res;
  try {
    res = args ? handler.apply(context, args) : handler.call(context);
    if (res && !res._isVue && isPromise(res) && !res._handled) {
      res.catch(function (e) { return handleError(e, vm, info + " (Promise/async)"); });
      // issue #9511
      // avoid catch triggering multiple times when nested calls
      res._handled = true;
    }
  } catch (e) {
    handleError(e, vm, info);
  }
  return res
}

function globalHandleError (err, vm, info) {
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      // if the user intentionally throws the original error in the handler,
      // do not log it twice
      if (e !== err) {
        logError(e, null, 'config.errorHandler');
      }
    }
  }
  logError(err, vm, info);
}

function logError (err, vm, info) {
  {
    warn(("Error in " + info + ": \"" + (err.toString()) + "\""), vm);
  }
  /* istanbul ignore else */
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    console.error(err);
  } else {
    throw err
  }
}

/*  */

var isUsingMicroTask = false;

var callbacks = [];
var pending = false;

function flushCallbacks () {
  pending = false;
  var copies = callbacks.slice(0);
  callbacks.length = 0;
  for (var i = 0; i < copies.length; i++) {
    copies[i]();
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
var timerFunc;

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  var p = Promise.resolve();
  timerFunc = function () {
    p.then(flushCallbacks);
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) { setTimeout(noop); }
  };
  isUsingMicroTask = true;
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  var counter = 1;
  var observer = new MutationObserver(flushCallbacks);
  var textNode = document.createTextNode(String(counter));
  observer.observe(textNode, {
    characterData: true
  });
  timerFunc = function () {
    counter = (counter + 1) % 2;
    textNode.data = String(counter);
  };
  isUsingMicroTask = true;
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = function () {
    setImmediate(flushCallbacks);
  };
} else {
  // Fallback to setTimeout.
  timerFunc = function () {
    setTimeout(flushCallbacks, 0);
  };
}

function nextTick (cb, ctx) {
  var _resolve;
  callbacks.push(function () {
    if (cb) {
      try {
        cb.call(ctx);
      } catch (e) {
        handleError(e, ctx, 'nextTick');
      }
    } else if (_resolve) {
      _resolve(ctx);
    }
  });
  if (!pending) {
    pending = true;
    timerFunc();
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(function (resolve) {
      _resolve = resolve;
    })
  }
}

/*  */

var mark;
var measure;

{
  var perf = inBrowser && window.performance;
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = function (tag) { return perf.mark(tag); };
    measure = function (name, startTag, endTag) {
      perf.measure(name, startTag, endTag);
      perf.clearMarks(startTag);
      perf.clearMarks(endTag);
      // perf.clearMeasures(name)
    };
  }
}

/* not type checking this file because flow doesn't play well with Proxy */

var initProxy;

{
  var allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  );

  var warnNonPresent = function (target, key) {
    warn(
      "Property or method \"" + key + "\" is not defined on the instance but " +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    );
  };

  var warnReservedPrefix = function (target, key) {
    warn(
      "Property \"" + key + "\" must be accessed with \"$data." + key + "\" because " +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals. ' +
      'See: https://vuejs.org/v2/api/#data',
      target
    );
  };

  var hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy);

  if (hasProxy) {
    var isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact');
    config.keyCodes = new Proxy(config.keyCodes, {
      set: function set (target, key, value) {
        if (isBuiltInModifier(key)) {
          warn(("Avoid overwriting built-in modifier in config.keyCodes: ." + key));
          return false
        } else {
          target[key] = value;
          return true
        }
      }
    });
  }

  var hasHandler = {
    has: function has (target, key) {
      var has = key in target;
      var isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data));
      if (!has && !isAllowed) {
        if (key in target.$data) { warnReservedPrefix(target, key); }
        else { warnNonPresent(target, key); }
      }
      return has || !isAllowed
    }
  };

  var getHandler = {
    get: function get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        if (key in target.$data) { warnReservedPrefix(target, key); }
        else { warnNonPresent(target, key); }
      }
      return target[key]
    }
  };

  initProxy = function initProxy (vm) {
    if (hasProxy) {
      // determine which proxy handler to use
      var options = vm.$options;
      var handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler;
      vm._renderProxy = new Proxy(vm, handlers);
    } else {
      vm._renderProxy = vm;
    }
  };
}

/*  */

var seenObjects = new _Set();

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
function traverse (val) {
  _traverse(val, seenObjects);
  seenObjects.clear();
}

function _traverse (val, seen) {
  var i, keys;
  var isA = Array.isArray(val);
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  if (val.__ob__) {
    var depId = val.__ob__.dep.id;
    if (seen.has(depId)) {
      return
    }
    seen.add(depId);
  }
  if (isA) {
    i = val.length;
    while (i--) { _traverse(val[i], seen); }
  } else {
    keys = Object.keys(val);
    i = keys.length;
    while (i--) { _traverse(val[keys[i]], seen); }
  }
}

/*  */

var normalizeEvent = cached(function (name) {
  var passive = name.charAt(0) === '&';
  name = passive ? name.slice(1) : name;
  var once$$1 = name.charAt(0) === '~'; // Prefixed last, checked first
  name = once$$1 ? name.slice(1) : name;
  var capture = name.charAt(0) === '!';
  name = capture ? name.slice(1) : name;
  return {
    name: name,
    once: once$$1,
    capture: capture,
    passive: passive
  }
});

function createFnInvoker (fns, vm) {
  function invoker () {
    var arguments$1 = arguments;

    var fns = invoker.fns;
    if (Array.isArray(fns)) {
      var cloned = fns.slice();
      for (var i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments$1, vm, "v-on handler");
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, "v-on handler")
    }
  }
  invoker.fns = fns;
  return invoker
}

function updateListeners (
  on,
  oldOn,
  add,
  remove$$1,
  createOnceHandler,
  vm
) {
  var name, def$$1, cur, old, event;
  for (name in on) {
    def$$1 = cur = on[name];
    old = oldOn[name];
    event = normalizeEvent(name);
    if (isUndef(cur)) {
      warn(
        "Invalid handler for event \"" + (event.name) + "\": got " + String(cur),
        vm
      );
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm);
      }
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture);
      }
      add(event.name, cur, event.capture, event.passive, event.params);
    } else if (cur !== old) {
      old.fns = cur;
      on[name] = old;
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name);
      remove$$1(event.name, oldOn[name], event.capture);
    }
  }
}

/*  */

function mergeVNodeHook (def, hookKey, hook) {
  if (def instanceof VNode) {
    def = def.data.hook || (def.data.hook = {});
  }
  var invoker;
  var oldHook = def[hookKey];

  function wrappedHook () {
    hook.apply(this, arguments);
    // important: remove merged hook to ensure it's called only once
    // and prevent memory leak
    remove(invoker.fns, wrappedHook);
  }

  if (isUndef(oldHook)) {
    // no existing hook
    invoker = createFnInvoker([wrappedHook]);
  } else {
    /* istanbul ignore if */
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // already a merged invoker
      invoker = oldHook;
      invoker.fns.push(wrappedHook);
    } else {
      // existing plain hook
      invoker = createFnInvoker([oldHook, wrappedHook]);
    }
  }

  invoker.merged = true;
  def[hookKey] = invoker;
}

/*  */

function extractPropsFromVNodeData (
  data,
  Ctor,
  tag
) {
  // we are only extracting raw values here.
  // validation and default values are handled in the child
  // component itself.
  var propOptions = Ctor.options.props;
  if (isUndef(propOptions)) {
    return
  }
  var res = {};
  var attrs = data.attrs;
  var props = data.props;
  if (isDef(attrs) || isDef(props)) {
    for (var key in propOptions) {
      var altKey = hyphenate(key);
      {
        var keyInLowerCase = key.toLowerCase();
        if (
          key !== keyInLowerCase &&
          attrs && hasOwn(attrs, keyInLowerCase)
        ) {
          tip(
            "Prop \"" + keyInLowerCase + "\" is passed to component " +
            (formatComponentName(tag || Ctor)) + ", but the declared prop name is" +
            " \"" + key + "\". " +
            "Note that HTML attributes are case-insensitive and camelCased " +
            "props need to use their kebab-case equivalents when using in-DOM " +
            "templates. You should probably use \"" + altKey + "\" instead of \"" + key + "\"."
          );
        }
      }
      checkProp(res, props, key, altKey, true) ||
      checkProp(res, attrs, key, altKey, false);
    }
  }
  return res
}

function checkProp (
  res,
  hash,
  key,
  altKey,
  preserve
) {
  if (isDef(hash)) {
    if (hasOwn(hash, key)) {
      res[key] = hash[key];
      if (!preserve) {
        delete hash[key];
      }
      return true
    } else if (hasOwn(hash, altKey)) {
      res[key] = hash[altKey];
      if (!preserve) {
        delete hash[altKey];
      }
      return true
    }
  }
  return false
}

/*  */

// The template compiler attempts to minimize the need for normalization by
// statically analyzing the template at compile time.
//
// For plain HTML markup, normalization can be completely skipped because the
// generated render function is guaranteed to return Array<VNode>. There are
// two cases where extra normalization is needed:

// 1. When the children contains components - because a functional component
// may return an Array instead of a single root. In this case, just a simple
// normalization is needed - if any child is an Array, we flatten the whole
// thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
// because functional components already normalize their own children.
function simpleNormalizeChildren (children) {
  for (var i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}

// 2. When the children contains constructs that always generated nested Arrays,
// e.g. <template>, <slot>, v-for, or when the children is provided by user
// with hand-written render functions / JSX. In such cases a full normalization
// is needed to cater to all possible types of children values.
function normalizeChildren (children) {
  return isPrimitive(children)
    ? [createTextVNode(children)]
    : Array.isArray(children)
      ? normalizeArrayChildren(children)
      : undefined
}

function isTextNode (node) {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}

function normalizeArrayChildren (children, nestedIndex) {
  var res = [];
  var i, c, lastIndex, last;
  for (i = 0; i < children.length; i++) {
    c = children[i];
    if (isUndef(c) || typeof c === 'boolean') { continue }
    lastIndex = res.length - 1;
    last = res[lastIndex];
    //  nested
    if (Array.isArray(c)) {
      if (c.length > 0) {
        c = normalizeArrayChildren(c, ((nestedIndex || '') + "_" + i));
        // merge adjacent text nodes
        if (isTextNode(c[0]) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + (c[0]).text);
          c.shift();
        }
        res.push.apply(res, c);
      }
    } else if (isPrimitive(c)) {
      if (isTextNode(last)) {
        // merge adjacent text nodes
        // this is necessary for SSR hydration because text nodes are
        // essentially merged when rendered to HTML strings
        res[lastIndex] = createTextVNode(last.text + c);
      } else if (c !== '') {
        // convert primitive to vnode
        res.push(createTextVNode(c));
      }
    } else {
      if (isTextNode(c) && isTextNode(last)) {
        // merge adjacent text nodes
        res[lastIndex] = createTextVNode(last.text + c.text);
      } else {
        // default key for nested array children (likely generated by v-for)
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          c.key = "__vlist" + nestedIndex + "_" + i + "__";
        }
        res.push(c);
      }
    }
  }
  return res
}

/*  */

function initProvide (vm) {
  var provide = vm.$options.provide;
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide;
  }
}

function initInjections (vm) {
  var result = resolveInject(vm.$options.inject, vm);
  if (result) {
    toggleObserving(false);
    Object.keys(result).forEach(function (key) {
      /* istanbul ignore else */
      {
        defineReactive$$1(vm, key, result[key], function () {
          warn(
            "Avoid mutating an injected value directly since the changes will be " +
            "overwritten whenever the provided component re-renders. " +
            "injection being mutated: \"" + key + "\"",
            vm
          );
        });
      }
    });
    toggleObserving(true);
  }
}

function resolveInject (inject, vm) {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    var result = Object.create(null);
    var keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      // #6574 in case the inject object is observed...
      if (key === '__ob__') { continue }
      var provideKey = inject[key].from;
      var source = vm;
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey];
          break
        }
        source = source.$parent;
      }
      if (!source) {
        if ('default' in inject[key]) {
          var provideDefault = inject[key].default;
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault;
        } else {
          warn(("Injection \"" + key + "\" not found"), vm);
        }
      }
    }
    return result
  }
}

/*  */



/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 */
function resolveSlots (
  children,
  context
) {
  if (!children || !children.length) {
    return {}
  }
  var slots = {};
  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i];
    var data = child.data;
    // remove slot attribute if the node is resolved as a Vue slot node
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot;
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      var name = data.slot;
      var slot = (slots[name] || (slots[name] = []));
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || []);
      } else {
        slot.push(child);
      }
    } else {
      (slots.default || (slots.default = [])).push(child);
    }
  }
  // ignore slots that contains only whitespace
  for (var name$1 in slots) {
    if (slots[name$1].every(isWhitespace)) {
      delete slots[name$1];
    }
  }
  return slots
}

function isWhitespace (node) {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}

/*  */

function normalizeScopedSlots (
  slots,
  normalSlots,
  prevSlots
) {
  var res;
  var hasNormalSlots = Object.keys(normalSlots).length > 0;
  var isStable = slots ? !!slots.$stable : !hasNormalSlots;
  var key = slots && slots.$key;
  if (!slots) {
    res = {};
  } else if (slots._normalized) {
    // fast path 1: child component re-render only, parent did not change
    return slots._normalized
  } else if (
    isStable &&
    prevSlots &&
    prevSlots !== emptyObject &&
    key === prevSlots.$key &&
    !hasNormalSlots &&
    !prevSlots.$hasNormal
  ) {
    // fast path 2: stable scoped slots w/ no normal slots to proxy,
    // only need to normalize once
    return prevSlots
  } else {
    res = {};
    for (var key$1 in slots) {
      if (slots[key$1] && key$1[0] !== '$') {
        res[key$1] = normalizeScopedSlot(normalSlots, key$1, slots[key$1]);
      }
    }
  }
  // expose normal slots on scopedSlots
  for (var key$2 in normalSlots) {
    if (!(key$2 in res)) {
      res[key$2] = proxyNormalSlot(normalSlots, key$2);
    }
  }
  // avoriaz seems to mock a non-extensible $scopedSlots object
  // and when that is passed down this would cause an error
  if (slots && Object.isExtensible(slots)) {
    (slots)._normalized = res;
  }
  def(res, '$stable', isStable);
  def(res, '$key', key);
  def(res, '$hasNormal', hasNormalSlots);
  return res
}

function normalizeScopedSlot(normalSlots, key, fn) {
  var normalized = function () {
    var res = arguments.length ? fn.apply(null, arguments) : fn({});
    res = res && typeof res === 'object' && !Array.isArray(res)
      ? [res] // single vnode
      : normalizeChildren(res);
    return res && (
      res.length === 0 ||
      (res.length === 1 && res[0].isComment) // #9658
    ) ? undefined
      : res
  };
  // this is a slot using the new v-slot syntax without scope. although it is
  // compiled as a scoped slot, render fn users would expect it to be present
  // on this.$slots because the usage is semantically a normal slot.
  if (fn.proxy) {
    Object.defineProperty(normalSlots, key, {
      get: normalized,
      enumerable: true,
      configurable: true
    });
  }
  return normalized
}

function proxyNormalSlot(slots, key) {
  return function () { return slots[key]; }
}

/*  */

/**
 * Runtime helper for rendering v-for lists.
 */
function renderList (
  val,
  render
) {
  var ret, i, l, keys, key;
  if (Array.isArray(val) || typeof val === 'string') {
    ret = new Array(val.length);
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i);
    }
  } else if (typeof val === 'number') {
    ret = new Array(val);
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i);
    }
  } else if (isObject(val)) {
    if (hasSymbol && val[Symbol.iterator]) {
      ret = [];
      var iterator = val[Symbol.iterator]();
      var result = iterator.next();
      while (!result.done) {
        ret.push(render(result.value, ret.length));
        result = iterator.next();
      }
    } else {
      keys = Object.keys(val);
      ret = new Array(keys.length);
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i];
        ret[i] = render(val[key], key, i);
      }
    }
  }
  if (!isDef(ret)) {
    ret = [];
  }
  (ret)._isVList = true;
  return ret
}

/*  */

/**
 * Runtime helper for rendering <slot>
 */
function renderSlot (
  name,
  fallback,
  props,
  bindObject
) {
  var scopedSlotFn = this.$scopedSlots[name];
  var nodes;
  if (scopedSlotFn) { // scoped slot
    props = props || {};
    if (bindObject) {
      if (!isObject(bindObject)) {
        warn(
          'slot v-bind without argument expects an Object',
          this
        );
      }
      props = extend(extend({}, bindObject), props);
    }
    nodes = scopedSlotFn(props) || fallback;
  } else {
    nodes = this.$slots[name] || fallback;
  }

  var target = props && props.slot;
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes
  }
}

/*  */

/**
 * Runtime helper for resolving filters
 */
function resolveFilter (id) {
  return resolveAsset(this.$options, 'filters', id, true) || identity
}

/*  */

function isKeyNotMatch (expect, actual) {
  if (Array.isArray(expect)) {
    return expect.indexOf(actual) === -1
  } else {
    return expect !== actual
  }
}

/**
 * Runtime helper for checking keyCodes from config.
 * exposed as Vue.prototype._k
 * passing in eventKeyName as last argument separately for backwards compat
 */
function checkKeyCodes (
  eventKeyCode,
  key,
  builtInKeyCode,
  eventKeyName,
  builtInKeyName
) {
  var mappedKeyCode = config.keyCodes[key] || builtInKeyCode;
  if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
    return isKeyNotMatch(builtInKeyName, eventKeyName)
  } else if (mappedKeyCode) {
    return isKeyNotMatch(mappedKeyCode, eventKeyCode)
  } else if (eventKeyName) {
    return hyphenate(eventKeyName) !== key
  }
}

/*  */

/**
 * Runtime helper for merging v-bind="object" into a VNode's data.
 */
function bindObjectProps (
  data,
  tag,
  value,
  asProp,
  isSync
) {
  if (value) {
    if (!isObject(value)) {
      warn(
        'v-bind without argument expects an Object or Array value',
        this
      );
    } else {
      if (Array.isArray(value)) {
        value = toObject(value);
      }
      var hash;
      var loop = function ( key ) {
        if (
          key === 'class' ||
          key === 'style' ||
          isReservedAttribute(key)
        ) {
          hash = data;
        } else {
          var type = data.attrs && data.attrs.type;
          hash = asProp || config.mustUseProp(tag, type, key)
            ? data.domProps || (data.domProps = {})
            : data.attrs || (data.attrs = {});
        }
        var camelizedKey = camelize(key);
        var hyphenatedKey = hyphenate(key);
        if (!(camelizedKey in hash) && !(hyphenatedKey in hash)) {
          hash[key] = value[key];

          if (isSync) {
            var on = data.on || (data.on = {});
            on[("update:" + key)] = function ($event) {
              value[key] = $event;
            };
          }
        }
      };

      for (var key in value) loop( key );
    }
  }
  return data
}

/*  */

/**
 * Runtime helper for rendering static trees.
 */
function renderStatic (
  index,
  isInFor
) {
  var cached = this._staticTrees || (this._staticTrees = []);
  var tree = cached[index];
  // if has already-rendered static tree and not inside v-for,
  // we can reuse the same tree.
  if (tree && !isInFor) {
    return tree
  }
  // otherwise, render a fresh tree.
  tree = cached[index] = this.$options.staticRenderFns[index].call(
    this._renderProxy,
    null,
    this // for render fns generated for functional component templates
  );
  markStatic(tree, ("__static__" + index), false);
  return tree
}

/**
 * Runtime helper for v-once.
 * Effectively it means marking the node as static with a unique key.
 */
function markOnce (
  tree,
  index,
  key
) {
  markStatic(tree, ("__once__" + index + (key ? ("_" + key) : "")), true);
  return tree
}

function markStatic (
  tree,
  key,
  isOnce
) {
  if (Array.isArray(tree)) {
    for (var i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        markStaticNode(tree[i], (key + "_" + i), isOnce);
      }
    }
  } else {
    markStaticNode(tree, key, isOnce);
  }
}

function markStaticNode (node, key, isOnce) {
  node.isStatic = true;
  node.key = key;
  node.isOnce = isOnce;
}

/*  */

function bindObjectListeners (data, value) {
  if (value) {
    if (!isPlainObject(value)) {
      warn(
        'v-on without argument expects an Object value',
        this
      );
    } else {
      var on = data.on = data.on ? extend({}, data.on) : {};
      for (var key in value) {
        var existing = on[key];
        var ours = value[key];
        on[key] = existing ? [].concat(existing, ours) : ours;
      }
    }
  }
  return data
}

/*  */

function resolveScopedSlots (
  fns, // see flow/vnode
  res,
  // the following are added in 2.6
  hasDynamicKeys,
  contentHashKey
) {
  res = res || { $stable: !hasDynamicKeys };
  for (var i = 0; i < fns.length; i++) {
    var slot = fns[i];
    if (Array.isArray(slot)) {
      resolveScopedSlots(slot, res, hasDynamicKeys);
    } else if (slot) {
      // marker for reverse proxying v-slot without scope on this.$slots
      if (slot.proxy) {
        slot.fn.proxy = true;
      }
      res[slot.key] = slot.fn;
    }
  }
  if (contentHashKey) {
    (res).$key = contentHashKey;
  }
  return res
}

/*  */

function bindDynamicKeys (baseObj, values) {
  for (var i = 0; i < values.length; i += 2) {
    var key = values[i];
    if (typeof key === 'string' && key) {
      baseObj[values[i]] = values[i + 1];
    } else if (key !== '' && key !== null) {
      // null is a special value for explicitly removing a binding
      warn(
        ("Invalid value for dynamic directive argument (expected string or null): " + key),
        this
      );
    }
  }
  return baseObj
}

// helper to dynamically append modifier runtime markers to event names.
// ensure only append when value is already string, otherwise it will be cast
// to string and cause the type check to miss.
function prependModifier (value, symbol) {
  return typeof value === 'string' ? symbol + value : value
}

/*  */

function installRenderHelpers (target) {
  target._o = markOnce;
  target._n = toNumber;
  target._s = toString;
  target._l = renderList;
  target._t = renderSlot;
  target._q = looseEqual;
  target._i = looseIndexOf;
  target._m = renderStatic;
  target._f = resolveFilter;
  target._k = checkKeyCodes;
  target._b = bindObjectProps;
  target._v = createTextVNode;
  target._e = createEmptyVNode;
  target._u = resolveScopedSlots;
  target._g = bindObjectListeners;
  target._d = bindDynamicKeys;
  target._p = prependModifier;
}

/*  */

function FunctionalRenderContext (
  data,
  props,
  children,
  parent,
  Ctor
) {
  var this$1 = this;

  var options = Ctor.options;
  // ensure the createElement function in functional components
  // gets a unique context - this is necessary for correct named slot check
  var contextVm;
  if (hasOwn(parent, '_uid')) {
    contextVm = Object.create(parent);
    // $flow-disable-line
    contextVm._original = parent;
  } else {
    // the context vm passed in is a functional context as well.
    // in this case we want to make sure we are able to get a hold to the
    // real context instance.
    contextVm = parent;
    // $flow-disable-line
    parent = parent._original;
  }
  var isCompiled = isTrue(options._compiled);
  var needNormalization = !isCompiled;

  this.data = data;
  this.props = props;
  this.children = children;
  this.parent = parent;
  this.listeners = data.on || emptyObject;
  this.injections = resolveInject(options.inject, parent);
  this.slots = function () {
    if (!this$1.$slots) {
      normalizeScopedSlots(
        data.scopedSlots,
        this$1.$slots = resolveSlots(children, parent)
      );
    }
    return this$1.$slots
  };

  Object.defineProperty(this, 'scopedSlots', ({
    enumerable: true,
    get: function get () {
      return normalizeScopedSlots(data.scopedSlots, this.slots())
    }
  }));

  // support for compiled functional template
  if (isCompiled) {
    // exposing $options for renderStatic()
    this.$options = options;
    // pre-resolve slots for renderSlot()
    this.$slots = this.slots();
    this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots);
  }

  if (options._scopeId) {
    this._c = function (a, b, c, d) {
      var vnode = createElement(contextVm, a, b, c, d, needNormalization);
      if (vnode && !Array.isArray(vnode)) {
        vnode.fnScopeId = options._scopeId;
        vnode.fnContext = parent;
      }
      return vnode
    };
  } else {
    this._c = function (a, b, c, d) { return createElement(contextVm, a, b, c, d, needNormalization); };
  }
}

installRenderHelpers(FunctionalRenderContext.prototype);

function createFunctionalComponent (
  Ctor,
  propsData,
  data,
  contextVm,
  children
) {
  var options = Ctor.options;
  var props = {};
  var propOptions = options.props;
  if (isDef(propOptions)) {
    for (var key in propOptions) {
      props[key] = validateProp(key, propOptions, propsData || emptyObject);
    }
  } else {
    if (isDef(data.attrs)) { mergeProps(props, data.attrs); }
    if (isDef(data.props)) { mergeProps(props, data.props); }
  }

  var renderContext = new FunctionalRenderContext(
    data,
    props,
    children,
    contextVm,
    Ctor
  );

  var vnode = options.render.call(null, renderContext._c, renderContext);

  if (vnode instanceof VNode) {
    return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)
  } else if (Array.isArray(vnode)) {
    var vnodes = normalizeChildren(vnode) || [];
    var res = new Array(vnodes.length);
    for (var i = 0; i < vnodes.length; i++) {
      res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext);
    }
    return res
  }
}

function cloneAndMarkFunctionalResult (vnode, data, contextVm, options, renderContext) {
  // #7817 clone node before setting fnContext, otherwise if the node is reused
  // (e.g. it was from a cached normal slot) the fnContext causes named slots
  // that should not be matched to match.
  var clone = cloneVNode(vnode);
  clone.fnContext = contextVm;
  clone.fnOptions = options;
  {
    (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext;
  }
  if (data.slot) {
    (clone.data || (clone.data = {})).slot = data.slot;
  }
  return clone
}

function mergeProps (to, from) {
  for (var key in from) {
    to[camelize(key)] = from[key];
  }
}

/*  */

/*  */

/*  */

/*  */

// inline hooks to be invoked on component VNodes during patch
var componentVNodeHooks = {
  init: function init (vnode, hydrating) {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      var mountedNode = vnode; // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode);
    } else {
      var child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      );
      child.$mount(hydrating ? vnode.elm : undefined, hydrating);
    }
  },

  prepatch: function prepatch (oldVnode, vnode) {
    var options = vnode.componentOptions;
    var child = vnode.componentInstance = oldVnode.componentInstance;
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    );
  },

  insert: function insert (vnode) {
    var context = vnode.context;
    var componentInstance = vnode.componentInstance;
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true;
      callHook(componentInstance, 'mounted');
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance);
      } else {
        activateChildComponent(componentInstance, true /* direct */);
      }
    }
  },

  destroy: function destroy (vnode) {
    var componentInstance = vnode.componentInstance;
    if (!componentInstance._isDestroyed) {
      if (!vnode.data.keepAlive) {
        componentInstance.$destroy();
      } else {
        deactivateChildComponent(componentInstance, true /* direct */);
      }
    }
  }
};

var hooksToMerge = Object.keys(componentVNodeHooks);

function createComponent (
  Ctor,
  data,
  context,
  children,
  tag
) {
  if (isUndef(Ctor)) {
    return
  }

  var baseCtor = context.$options._base;

  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor);
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  if (typeof Ctor !== 'function') {
    {
      warn(("Invalid Component definition: " + (String(Ctor))), context);
    }
    return
  }

  // async component
  var asyncFactory;
  if (isUndef(Ctor.cid)) {
    asyncFactory = Ctor;
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor);
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {};

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor);

  // transform component v-model data into props & events
  if (isDef(data.model)) {
    transformModel(Ctor.options, data);
  }

  // extract props
  var propsData = extractPropsFromVNodeData(data, Ctor, tag);

  // functional component
  if (isTrue(Ctor.options.functional)) {
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  var listeners = data.on;
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  data.on = data.nativeOn;

  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    var slot = data.slot;
    data = {};
    if (slot) {
      data.slot = slot;
    }
  }

  // install component management hooks onto the placeholder node
  installComponentHooks(data);

  // return a placeholder vnode
  var name = Ctor.options.name || tag;
  var vnode = new VNode(
    ("vue-component-" + (Ctor.cid) + (name ? ("-" + name) : '')),
    data, undefined, undefined, undefined, context,
    { Ctor: Ctor, propsData: propsData, listeners: listeners, tag: tag, children: children },
    asyncFactory
  );

  return vnode
}

function createComponentInstanceForVnode (
  vnode, // we know it's MountedComponentVNode but flow doesn't
  parent // activeInstance in lifecycle state
) {
  var options = {
    _isComponent: true,
    _parentVnode: vnode,
    parent: parent
  };
  // check inline-template render functions
  var inlineTemplate = vnode.data.inlineTemplate;
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render;
    options.staticRenderFns = inlineTemplate.staticRenderFns;
  }
  return new vnode.componentOptions.Ctor(options)
}

function installComponentHooks (data) {
  var hooks = data.hook || (data.hook = {});
  for (var i = 0; i < hooksToMerge.length; i++) {
    var key = hooksToMerge[i];
    var existing = hooks[key];
    var toMerge = componentVNodeHooks[key];
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook$1(toMerge, existing) : toMerge;
    }
  }
}

function mergeHook$1 (f1, f2) {
  var merged = function (a, b) {
    // flow complains about extra args which is why we use any
    f1(a, b);
    f2(a, b);
  };
  merged._merged = true;
  return merged
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
function transformModel (options, data) {
  var prop = (options.model && options.model.prop) || 'value';
  var event = (options.model && options.model.event) || 'input'
  ;(data.attrs || (data.attrs = {}))[prop] = data.model.value;
  var on = data.on || (data.on = {});
  var existing = on[event];
  var callback = data.model.callback;
  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing);
    }
  } else {
    on[event] = callback;
  }
}

/*  */

var SIMPLE_NORMALIZE = 1;
var ALWAYS_NORMALIZE = 2;

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
function createElement (
  context,
  tag,
  data,
  children,
  normalizationType,
  alwaysNormalize
) {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children;
    children = data;
    data = undefined;
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE;
  }
  return _createElement(context, tag, data, children, normalizationType)
}

function _createElement (
  context,
  tag,
  data,
  children,
  normalizationType
) {
  if (isDef(data) && isDef((data).__ob__)) {
    warn(
      "Avoid using observed data object as vnode data: " + (JSON.stringify(data)) + "\n" +
      'Always create fresh vnode data objects in each render!',
      context
    );
    return createEmptyVNode()
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is;
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  if (isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      );
    }
  }
  // support single function children as default scoped slot
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {};
    data.scopedSlots = { default: children[0] };
    children.length = 0;
  }
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children);
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children);
  }
  var vnode, ns;
  if (typeof tag === 'string') {
    var Ctor;
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag);
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      if (isDef(data) && isDef(data.nativeOn)) {
        warn(
          ("The .native modifier for v-on is only valid on components but it was used on <" + tag + ">."),
          context
        );
      }
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      );
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag);
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      );
    }
  } else {
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children);
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) { applyNS(vnode, ns); }
    if (isDef(data)) { registerDeepBindings(data); }
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns;
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined;
    force = true;
  }
  if (isDef(vnode.children)) {
    for (var i = 0, l = vnode.children.length; i < l; i++) {
      var child = vnode.children[i];
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force);
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style);
  }
  if (isObject(data.class)) {
    traverse(data.class);
  }
}

/*  */

function initRender (vm) {
  vm._vnode = null; // the root of the child tree
  vm._staticTrees = null; // v-once cached trees
  var options = vm.$options;
  var parentVnode = vm.$vnode = options._parentVnode; // the placeholder node in parent tree
  var renderContext = parentVnode && parentVnode.context;
  vm.$slots = resolveSlots(options._renderChildren, renderContext);
  vm.$scopedSlots = emptyObject;
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  vm._c = function (a, b, c, d) { return createElement(vm, a, b, c, d, false); };
  // normalization is always applied for the public version, used in
  // user-written render functions.
  vm.$createElement = function (a, b, c, d) { return createElement(vm, a, b, c, d, true); };

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  var parentData = parentVnode && parentVnode.data;

  /* istanbul ignore else */
  {
    defineReactive$$1(vm, '$attrs', parentData && parentData.attrs || emptyObject, function () {
      !isUpdatingChildComponent && warn("$attrs is readonly.", vm);
    }, true);
    defineReactive$$1(vm, '$listeners', options._parentListeners || emptyObject, function () {
      !isUpdatingChildComponent && warn("$listeners is readonly.", vm);
    }, true);
  }
}

var currentRenderingInstance = null;

function renderMixin (Vue) {
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype);

  Vue.prototype.$nextTick = function (fn) {
    return nextTick(fn, this)
  };

  Vue.prototype._render = function () {
    var vm = this;
    var ref = vm.$options;
    var render = ref.render;
    var _parentVnode = ref._parentVnode;

    if (_parentVnode) {
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      );
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode;
    // render self
    var vnode;
    try {
      // There's no need to maintain a stack because all render fns are called
      // separately from one another. Nested component's render fns are called
      // when parent component is patched.
      currentRenderingInstance = vm;
      vnode = render.call(vm._renderProxy, vm.$createElement);
    } catch (e) {
      handleError(e, vm, "render");
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (vm.$options.renderError) {
        try {
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e);
        } catch (e) {
          handleError(e, vm, "renderError");
          vnode = vm._vnode;
        }
      } else {
        vnode = vm._vnode;
      }
    } finally {
      currentRenderingInstance = null;
    }
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0];
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        );
      }
      vnode = createEmptyVNode();
    }
    // set parent
    vnode.parent = _parentVnode;
    return vnode
  };
}

/*  */

function ensureCtor (comp, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default;
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

function createAsyncPlaceholder (
  factory,
  data,
  context,
  children,
  tag
) {
  var node = createEmptyVNode();
  node.asyncFactory = factory;
  node.asyncMeta = { data: data, context: context, children: children, tag: tag };
  return node
}

function resolveAsyncComponent (
  factory,
  baseCtor
) {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  var owner = currentRenderingInstance;
  if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    // already pending
    factory.owners.push(owner);
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (owner && !isDef(factory.owners)) {
    var owners = factory.owners = [owner];
    var sync = true;
    var timerLoading = null;
    var timerTimeout = null

    ;(owner).$on('hook:destroyed', function () { return remove(owners, owner); });

    var forceRender = function (renderCompleted) {
      for (var i = 0, l = owners.length; i < l; i++) {
        (owners[i]).$forceUpdate();
      }

      if (renderCompleted) {
        owners.length = 0;
        if (timerLoading !== null) {
          clearTimeout(timerLoading);
          timerLoading = null;
        }
        if (timerTimeout !== null) {
          clearTimeout(timerTimeout);
          timerTimeout = null;
        }
      }
    };

    var resolve = once(function (res) {
      // cache resolved
      factory.resolved = ensureCtor(res, baseCtor);
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        forceRender(true);
      } else {
        owners.length = 0;
      }
    });

    var reject = once(function (reason) {
      warn(
        "Failed to resolve async component: " + (String(factory)) +
        (reason ? ("\nReason: " + reason) : '')
      );
      if (isDef(factory.errorComp)) {
        factory.error = true;
        forceRender(true);
      }
    });

    var res = factory(resolve, reject);

    if (isObject(res)) {
      if (isPromise(res)) {
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject);
        }
      } else if (isPromise(res.component)) {
        res.component.then(resolve, reject);

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor);
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor);
          if (res.delay === 0) {
            factory.loading = true;
          } else {
            timerLoading = setTimeout(function () {
              timerLoading = null;
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true;
                forceRender(false);
              }
            }, res.delay || 200);
          }
        }

        if (isDef(res.timeout)) {
          timerTimeout = setTimeout(function () {
            timerTimeout = null;
            if (isUndef(factory.resolved)) {
              reject(
                "timeout (" + (res.timeout) + "ms)"
              );
            }
          }, res.timeout);
        }
      }
    }

    sync = false;
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}

/*  */

function isAsyncPlaceholder (node) {
  return node.isComment && node.asyncFactory
}

/*  */

function getFirstComponentChild (children) {
  if (Array.isArray(children)) {
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
        return c
      }
    }
  }
}

/*  */

/*  */

function initEvents (vm) {
  vm._events = Object.create(null);
  vm._hasHookEvent = false;
  // init parent attached events
  var listeners = vm.$options._parentListeners;
  if (listeners) {
    updateComponentListeners(vm, listeners);
  }
}

var target;

function add (event, fn) {
  target.$on(event, fn);
}

function remove$1 (event, fn) {
  target.$off(event, fn);
}

function createOnceHandler (event, fn) {
  var _target = target;
  return function onceHandler () {
    var res = fn.apply(null, arguments);
    if (res !== null) {
      _target.$off(event, onceHandler);
    }
  }
}

function updateComponentListeners (
  vm,
  listeners,
  oldListeners
) {
  target = vm;
  updateListeners(listeners, oldListeners || {}, add, remove$1, createOnceHandler, vm);
  target = undefined;
}

function eventsMixin (Vue) {
  var hookRE = /^hook:/;
  Vue.prototype.$on = function (event, fn) {
    var vm = this;
    if (Array.isArray(event)) {
      for (var i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn);
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn);
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true;
      }
    }
    return vm
  };

  Vue.prototype.$once = function (event, fn) {
    var vm = this;
    function on () {
      vm.$off(event, on);
      fn.apply(vm, arguments);
    }
    on.fn = fn;
    vm.$on(event, on);
    return vm
  };

  Vue.prototype.$off = function (event, fn) {
    var vm = this;
    // all
    if (!arguments.length) {
      vm._events = Object.create(null);
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (var i$1 = 0, l = event.length; i$1 < l; i$1++) {
        vm.$off(event[i$1], fn);
      }
      return vm
    }
    // specific event
    var cbs = vm._events[event];
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null;
      return vm
    }
    // specific handler
    var cb;
    var i = cbs.length;
    while (i--) {
      cb = cbs[i];
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1);
        break
      }
    }
    return vm
  };

  Vue.prototype.$emit = function (event) {
    var vm = this;
    {
      var lowerCaseEvent = event.toLowerCase();
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          "Event \"" + lowerCaseEvent + "\" is emitted in component " +
          (formatComponentName(vm)) + " but the handler is registered for \"" + event + "\". " +
          "Note that HTML attributes are case-insensitive and you cannot use " +
          "v-on to listen to camelCase events when using in-DOM templates. " +
          "You should probably use \"" + (hyphenate(event)) + "\" instead of \"" + event + "\"."
        );
      }
    }
    var cbs = vm._events[event];
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs;
      var args = toArray(arguments, 1);
      var info = "event handler for \"" + event + "\"";
      for (var i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info);
      }
    }
    return vm
  };
}

/*  */

var activeInstance = null;
var isUpdatingChildComponent = false;

function setActiveInstance(vm) {
  var prevActiveInstance = activeInstance;
  activeInstance = vm;
  return function () {
    activeInstance = prevActiveInstance;
  }
}

function initLifecycle (vm) {
  var options = vm.$options;

  // locate first non-abstract parent
  var parent = options.parent;
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent;
    }
    parent.$children.push(vm);
  }

  vm.$parent = parent;
  vm.$root = parent ? parent.$root : vm;

  vm.$children = [];
  vm.$refs = {};

  vm._watcher = null;
  vm._inactive = null;
  vm._directInactive = false;
  vm._isMounted = false;
  vm._isDestroyed = false;
  vm._isBeingDestroyed = false;
}

function lifecycleMixin (Vue) {
  Vue.prototype._update = function (vnode, hydrating) {
    var vm = this;
    var prevEl = vm.$el;
    var prevVnode = vm._vnode;
    var restoreActiveInstance = setActiveInstance(vm);
    vm._vnode = vnode;
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    restoreActiveInstance();
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null;
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm;
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el;
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  };

  Vue.prototype.$forceUpdate = function () {
    var vm = this;
    if (vm._watcher) {
      vm._watcher.update();
    }
  };

  Vue.prototype.$destroy = function () {
    var vm = this;
    if (vm._isBeingDestroyed) {
      return
    }
    callHook(vm, 'beforeDestroy');
    vm._isBeingDestroyed = true;
    // remove self from parent
    var parent = vm.$parent;
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm);
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown();
    }
    var i = vm._watchers.length;
    while (i--) {
      vm._watchers[i].teardown();
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--;
    }
    // call the last hook...
    vm._isDestroyed = true;
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null);
    // fire destroyed hook
    callHook(vm, 'destroyed');
    // turn off all instance listeners.
    vm.$off();
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null;
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null;
    }
  };
}

function mountComponent (
  vm,
  el,
  hydrating
) {
  vm.$el = el;
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode;
    {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        );
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        );
      }
    }
  }
  callHook(vm, 'beforeMount');

  var updateComponent;
  /* istanbul ignore if */
  if (config.performance && mark) {
    updateComponent = function () {
      var name = vm._name;
      var id = vm._uid;
      var startTag = "vue-perf-start:" + id;
      var endTag = "vue-perf-end:" + id;

      mark(startTag);
      var vnode = vm._render();
      mark(endTag);
      measure(("vue " + name + " render"), startTag, endTag);

      mark(startTag);
      vm._update(vnode, hydrating);
      mark(endTag);
      measure(("vue " + name + " patch"), startTag, endTag);
    };
  } else {
    updateComponent = function () {
      vm._update(vm._render(), hydrating);
    };
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  new Watcher(vm, updateComponent, noop, {
    before: function before () {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate');
      }
    }
  }, true /* isRenderWatcher */);
  hydrating = false;

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true;
    callHook(vm, 'mounted');
  }
  return vm
}

function updateChildComponent (
  vm,
  propsData,
  listeners,
  parentVnode,
  renderChildren
) {
  {
    isUpdatingChildComponent = true;
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  var newScopedSlots = parentVnode.data.scopedSlots;
  var oldScopedSlots = vm.$scopedSlots;
  var hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
  );

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  var needsForceUpdate = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    hasDynamicScopedSlot
  );

  vm.$options._parentVnode = parentVnode;
  vm.$vnode = parentVnode; // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode;
  }
  vm.$options._renderChildren = renderChildren;

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject;
  vm.$listeners = listeners || emptyObject;

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false);
    var props = vm._props;
    var propKeys = vm.$options._propKeys || [];
    for (var i = 0; i < propKeys.length; i++) {
      var key = propKeys[i];
      var propOptions = vm.$options.props; // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm);
    }
    toggleObserving(true);
    // keep a copy of raw propsData
    vm.$options.propsData = propsData;
  }

  // update listeners
  listeners = listeners || emptyObject;
  var oldListeners = vm.$options._parentListeners;
  vm.$options._parentListeners = listeners;
  updateComponentListeners(vm, listeners, oldListeners);

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context);
    vm.$forceUpdate();
  }

  {
    isUpdatingChildComponent = false;
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) { return true }
  }
  return false
}

function activateChildComponent (vm, direct) {
  if (direct) {
    vm._directInactive = false;
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false;
    for (var i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i]);
    }
    callHook(vm, 'activated');
  }
}

function deactivateChildComponent (vm, direct) {
  if (direct) {
    vm._directInactive = true;
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true;
    for (var i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i]);
    }
    callHook(vm, 'deactivated');
  }
}

function callHook (vm, hook) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget();
  var handlers = vm.$options[hook];
  var info = hook + " hook";
  if (handlers) {
    for (var i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info);
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook);
  }
  popTarget();
}

/*  */

var MAX_UPDATE_COUNT = 100;

var queue = [];
var activatedChildren = [];
var has = {};
var circular = {};
var waiting = false;
var flushing = false;
var index = 0;

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0;
  has = {};
  {
    circular = {};
  }
  waiting = flushing = false;
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
var currentFlushTimestamp = 0;

// Async edge case fix requires storing an event listener's attach timestamp.
var getNow = Date.now;

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  var performance = window.performance;
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = function () { return performance.now(); };
  }
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow();
  flushing = true;
  var watcher, id;

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  queue.sort(function (a, b) { return a.id - b.id; });

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index];
    if (watcher.before) {
      watcher.before();
    }
    id = watcher.id;
    has[id] = null;
    watcher.run();
    // in dev build, check and stop circular updates.
    if (has[id] != null) {
      circular[id] = (circular[id] || 0) + 1;
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? ("in watcher with expression \"" + (watcher.expression) + "\"")
              : "in a component render function."
          ),
          watcher.vm
        );
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  var activatedQueue = activatedChildren.slice();
  var updatedQueue = queue.slice();

  resetSchedulerState();

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue);
  callUpdatedHooks(updatedQueue);

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush');
  }
}

function callUpdatedHooks (queue) {
  var i = queue.length;
  while (i--) {
    var watcher = queue[i];
    var vm = watcher.vm;
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated');
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
function queueActivatedComponent (vm) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false;
  activatedChildren.push(vm);
}

function callActivatedHooks (queue) {
  for (var i = 0; i < queue.length; i++) {
    queue[i]._inactive = true;
    activateChildComponent(queue[i], true /* true */);
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
function queueWatcher (watcher) {
  var id = watcher.id;
  if (has[id] == null) {
    has[id] = true;
    if (!flushing) {
      queue.push(watcher);
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      var i = queue.length - 1;
      while (i > index && queue[i].id > watcher.id) {
        i--;
      }
      queue.splice(i + 1, 0, watcher);
    }
    // queue the flush
    if (!waiting) {
      waiting = true;

      if (!config.async) {
        flushSchedulerQueue();
        return
      }
      nextTick(flushSchedulerQueue);
    }
  }
}

/*  */



var uid$2 = 0;

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
var Watcher = function Watcher (
  vm,
  expOrFn,
  cb,
  options,
  isRenderWatcher
) {
  this.vm = vm;
  if (isRenderWatcher) {
    vm._watcher = this;
  }
  vm._watchers.push(this);
  // options
  if (options) {
    this.deep = !!options.deep;
    this.user = !!options.user;
    this.lazy = !!options.lazy;
    this.sync = !!options.sync;
    this.before = options.before;
  } else {
    this.deep = this.user = this.lazy = this.sync = false;
  }
  this.cb = cb;
  this.id = ++uid$2; // uid for batching
  this.active = true;
  this.dirty = this.lazy; // for lazy watchers
  this.deps = [];
  this.newDeps = [];
  this.depIds = new _Set();
  this.newDepIds = new _Set();
  this.expression = expOrFn.toString();
  // parse expression for getter
  if (typeof expOrFn === 'function') {
    this.getter = expOrFn;
  } else {
    this.getter = parsePath(expOrFn);
    if (!this.getter) {
      this.getter = noop;
      warn(
        "Failed watching path: \"" + expOrFn + "\" " +
        'Watcher only accepts simple dot-delimited paths. ' +
        'For full control, use a function instead.',
        vm
      );
    }
  }
  this.value = this.lazy
    ? undefined
    : this.get();
};

/**
 * Evaluate the getter, and re-collect dependencies.
 */
Watcher.prototype.get = function get () {
  pushTarget(this);
  var value;
  var vm = this.vm;
  try {
    value = this.getter.call(vm, vm);
  } catch (e) {
    if (this.user) {
      handleError(e, vm, ("getter for watcher \"" + (this.expression) + "\""));
    } else {
      throw e
    }
  } finally {
    // "touch" every property so they are all tracked as
    // dependencies for deep watching
    if (this.deep) {
      traverse(value);
    }
    popTarget();
    this.cleanupDeps();
  }
  return value
};

/**
 * Add a dependency to this directive.
 */
Watcher.prototype.addDep = function addDep (dep) {
  var id = dep.id;
  if (!this.newDepIds.has(id)) {
    this.newDepIds.add(id);
    this.newDeps.push(dep);
    if (!this.depIds.has(id)) {
      dep.addSub(this);
    }
  }
};

/**
 * Clean up for dependency collection.
 */
Watcher.prototype.cleanupDeps = function cleanupDeps () {
  var i = this.deps.length;
  while (i--) {
    var dep = this.deps[i];
    if (!this.newDepIds.has(dep.id)) {
      dep.removeSub(this);
    }
  }
  var tmp = this.depIds;
  this.depIds = this.newDepIds;
  this.newDepIds = tmp;
  this.newDepIds.clear();
  tmp = this.deps;
  this.deps = this.newDeps;
  this.newDeps = tmp;
  this.newDeps.length = 0;
};

/**
 * Subscriber interface.
 * Will be called when a dependency changes.
 */
Watcher.prototype.update = function update () {
  /* istanbul ignore else */
  if (this.lazy) {
    this.dirty = true;
  } else if (this.sync) {
    this.run();
  } else {
    queueWatcher(this);
  }
};

/**
 * Scheduler job interface.
 * Will be called by the scheduler.
 */
Watcher.prototype.run = function run () {
  if (this.active) {
    var value = this.get();
    if (
      value !== this.value ||
      // Deep watchers and watchers on Object/Arrays should fire even
      // when the value is the same, because the value may
      // have mutated.
      isObject(value) ||
      this.deep
    ) {
      // set new value
      var oldValue = this.value;
      this.value = value;
      if (this.user) {
        try {
          this.cb.call(this.vm, value, oldValue);
        } catch (e) {
          handleError(e, this.vm, ("callback for watcher \"" + (this.expression) + "\""));
        }
      } else {
        this.cb.call(this.vm, value, oldValue);
      }
    }
  }
};

/**
 * Evaluate the value of the watcher.
 * This only gets called for lazy watchers.
 */
Watcher.prototype.evaluate = function evaluate () {
  this.value = this.get();
  this.dirty = false;
};

/**
 * Depend on all deps collected by this watcher.
 */
Watcher.prototype.depend = function depend () {
  var i = this.deps.length;
  while (i--) {
    this.deps[i].depend();
  }
};

/**
 * Remove self from all dependencies' subscriber list.
 */
Watcher.prototype.teardown = function teardown () {
  if (this.active) {
    // remove self from vm's watcher list
    // this is a somewhat expensive operation so we skip it
    // if the vm is being destroyed.
    if (!this.vm._isBeingDestroyed) {
      remove(this.vm._watchers, this);
    }
    var i = this.deps.length;
    while (i--) {
      this.deps[i].removeSub(this);
    }
    this.active = false;
  }
};

/*  */

var sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
};

function proxy (target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  };
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val;
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function initState (vm) {
  vm._watchers = [];
  var opts = vm.$options;
  if (opts.props) { initProps(vm, opts.props); }
  if (opts.methods) { initMethods(vm, opts.methods); }
  if (opts.data) {
    initData(vm);
  } else {
    observe(vm._data = {}, true /* asRootData */);
  }
  if (opts.computed) { initComputed(vm, opts.computed); }
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch);
  }
}

function initProps (vm, propsOptions) {
  var propsData = vm.$options.propsData || {};
  var props = vm._props = {};
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  var keys = vm.$options._propKeys = [];
  var isRoot = !vm.$parent;
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false);
  }
  var loop = function ( key ) {
    keys.push(key);
    var value = validateProp(key, propsOptions, propsData, vm);
    /* istanbul ignore else */
    {
      var hyphenatedKey = hyphenate(key);
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          ("\"" + hyphenatedKey + "\" is a reserved attribute and cannot be used as component prop."),
          vm
        );
      }
      defineReactive$$1(props, key, value, function () {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            "Avoid mutating a prop directly since the value will be " +
            "overwritten whenever the parent component re-renders. " +
            "Instead, use a data or computed property based on the prop's " +
            "value. Prop being mutated: \"" + key + "\"",
            vm
          );
        }
      });
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, "_props", key);
    }
  };

  for (var key in propsOptions) loop( key );
  toggleObserving(true);
}

function initData (vm) {
  var data = vm.$options.data;
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {};
  if (!isPlainObject(data)) {
    data = {};
    warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    );
  }
  // proxy data on instance
  var keys = Object.keys(data);
  var props = vm.$options.props;
  var methods = vm.$options.methods;
  var i = keys.length;
  while (i--) {
    var key = keys[i];
    {
      if (methods && hasOwn(methods, key)) {
        warn(
          ("Method \"" + key + "\" has already been defined as a data property."),
          vm
        );
      }
    }
    if (props && hasOwn(props, key)) {
      warn(
        "The data property \"" + key + "\" is already declared as a prop. " +
        "Use prop default value instead.",
        vm
      );
    } else if (!isReserved(key)) {
      proxy(vm, "_data", key);
    }
  }
  // observe data
  observe(data, true /* asRootData */);
}

function getData (data, vm) {
  // #7573 disable dep collection when invoking data getters
  pushTarget();
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, "data()");
    return {}
  } finally {
    popTarget();
  }
}

var computedWatcherOptions = { lazy: true };

function initComputed (vm, computed) {
  // $flow-disable-line
  var watchers = vm._computedWatchers = Object.create(null);
  // computed properties are just getters during SSR
  var isSSR = isServerRendering();

  for (var key in computed) {
    var userDef = computed[key];
    var getter = typeof userDef === 'function' ? userDef : userDef.get;
    if (getter == null) {
      warn(
        ("Getter is missing for computed property \"" + key + "\"."),
        vm
      );
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      );
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef);
    } else {
      if (key in vm.$data) {
        warn(("The computed property \"" + key + "\" is already defined in data."), vm);
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(("The computed property \"" + key + "\" is already defined as a prop."), vm);
      }
    }
  }
}

function defineComputed (
  target,
  key,
  userDef
) {
  var shouldCache = !isServerRendering();
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef);
    sharedPropertyDefinition.set = noop;
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop;
    sharedPropertyDefinition.set = userDef.set || noop;
  }
  if (sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        ("Computed property \"" + key + "\" was assigned to but it has no setter."),
        this
      );
    };
  }
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function createComputedGetter (key) {
  return function computedGetter () {
    var watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm, methods) {
  var props = vm.$options.props;
  for (var key in methods) {
    {
      if (typeof methods[key] !== 'function') {
        warn(
          "Method \"" + key + "\" has type \"" + (typeof methods[key]) + "\" in the component definition. " +
          "Did you reference the function correctly?",
          vm
        );
      }
      if (props && hasOwn(props, key)) {
        warn(
          ("Method \"" + key + "\" has already been defined as a prop."),
          vm
        );
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          "Method \"" + key + "\" conflicts with an existing Vue instance method. " +
          "Avoid defining component methods that start with _ or $."
        );
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm);
  }
}

function initWatch (vm, watch) {
  for (var key in watch) {
    var handler = watch[key];
    if (Array.isArray(handler)) {
      for (var i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher (
  vm,
  expOrFn,
  handler,
  options
) {
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  if (typeof handler === 'string') {
    handler = vm[handler];
  }
  return vm.$watch(expOrFn, handler, options)
}

function stateMixin (Vue) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  var dataDef = {};
  dataDef.get = function () { return this._data };
  var propsDef = {};
  propsDef.get = function () { return this._props };
  {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      );
    };
    propsDef.set = function () {
      warn("$props is readonly.", this);
    };
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef);
  Object.defineProperty(Vue.prototype, '$props', propsDef);

  Vue.prototype.$set = set;
  Vue.prototype.$delete = del;

  Vue.prototype.$watch = function (
    expOrFn,
    cb,
    options
  ) {
    var vm = this;
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {};
    options.user = true;
    var watcher = new Watcher(vm, expOrFn, cb, options);
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value);
      } catch (error) {
        handleError(error, vm, ("callback for immediate watcher \"" + (watcher.expression) + "\""));
      }
    }
    return function unwatchFn () {
      watcher.teardown();
    }
  };
}

/*  */

var uid$3 = 0;

function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    var vm = this;
    // a uid
    vm._uid = uid$3++;

    var startTag, endTag;
    /* istanbul ignore if */
    if (config.performance && mark) {
      startTag = "vue-perf-start:" + (vm._uid);
      endTag = "vue-perf-end:" + (vm._uid);
      mark(startTag);
    }

    // a flag to avoid this being observed
    vm._isVue = true;
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options);
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
    }
    /* istanbul ignore else */
    {
      initProxy(vm);
    }
    // expose real self
    vm._self = vm;
    initLifecycle(vm);
    initEvents(vm);
    initRender(vm);
    callHook(vm, 'beforeCreate');
    initInjections(vm); // resolve injections before data/props
    initState(vm);
    initProvide(vm); // resolve provide after data/props
    callHook(vm, 'created');

    /* istanbul ignore if */
    if (config.performance && mark) {
      vm._name = formatComponentName(vm, false);
      mark(endTag);
      measure(("vue " + (vm._name) + " init"), startTag, endTag);
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };
}

function initInternalComponent (vm, options) {
  var opts = vm.$options = Object.create(vm.constructor.options);
  // doing this because it's faster than dynamic enumeration.
  var parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;

  var vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
}

function resolveConstructorOptions (Ctor) {
  var options = Ctor.options;
  if (Ctor.super) {
    var superOptions = resolveConstructorOptions(Ctor.super);
    var cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions;
      // check if there are any late-modified/attached options (#4976)
      var modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions);
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor) {
  var modified;
  var latest = Ctor.options;
  var sealed = Ctor.sealedOptions;
  for (var key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) { modified = {}; }
      modified[key] = latest[key];
    }
  }
  return modified
}

function Vue (options) {
  if (!(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword');
  }
  this._init(options);
}

initMixin(Vue);
stateMixin(Vue);
eventsMixin(Vue);
lifecycleMixin(Vue);
renderMixin(Vue);

/*  */

function initUse (Vue) {
  Vue.use = function (plugin) {
    var installedPlugins = (this._installedPlugins || (this._installedPlugins = []));
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    var args = toArray(arguments, 1);
    args.unshift(this);
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args);
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args);
    }
    installedPlugins.push(plugin);
    return this
  };
}

/*  */

function initMixin$1 (Vue) {
  Vue.mixin = function (mixin) {
    this.options = mergeOptions(this.options, mixin);
    return this
  };
}

/*  */

function initExtend (Vue) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0;
  var cid = 1;

  /**
   * Class inheritance
   */
  Vue.extend = function (extendOptions) {
    extendOptions = extendOptions || {};
    var Super = this;
    var SuperId = Super.cid;
    var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    var name = extendOptions.name || Super.options.name;
    if (name) {
      validateComponentName(name);
    }

    var Sub = function VueComponent (options) {
      this._init(options);
    };
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    Sub.cid = cid++;
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    );
    Sub['super'] = Super;

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      initProps$1(Sub);
    }
    if (Sub.options.computed) {
      initComputed$1(Sub);
    }

    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend;
    Sub.mixin = Super.mixin;
    Sub.use = Super.use;

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type];
    });
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub;
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options;
    Sub.extendOptions = extendOptions;
    Sub.sealedOptions = extend({}, Sub.options);

    // cache constructor
    cachedCtors[SuperId] = Sub;
    return Sub
  };
}

function initProps$1 (Comp) {
  var props = Comp.options.props;
  for (var key in props) {
    proxy(Comp.prototype, "_props", key);
  }
}

function initComputed$1 (Comp) {
  var computed = Comp.options.computed;
  for (var key in computed) {
    defineComputed(Comp.prototype, key, computed[key]);
  }
}

/*  */

function initAssetRegisters (Vue) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(function (type) {
    Vue[type] = function (
      id,
      definition
    ) {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (type === 'component') {
          validateComponentName(id);
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id;
          definition = this.options._base.extend(definition);
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition };
        }
        this.options[type + 's'][id] = definition;
        return definition
      }
    };
  });
}

/*  */



function getComponentName (opts) {
  return opts && (opts.Ctor.options.name || opts.tag)
}

function matches (pattern, name) {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

function pruneCache (keepAliveInstance, filter) {
  var cache = keepAliveInstance.cache;
  var keys = keepAliveInstance.keys;
  var _vnode = keepAliveInstance._vnode;
  for (var key in cache) {
    var cachedNode = cache[key];
    if (cachedNode) {
      var name = getComponentName(cachedNode.componentOptions);
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode);
      }
    }
  }
}

function pruneCacheEntry (
  cache,
  key,
  keys,
  current
) {
  var cached$$1 = cache[key];
  if (cached$$1 && (!current || cached$$1.tag !== current.tag)) {
    cached$$1.componentInstance.$destroy();
  }
  cache[key] = null;
  remove(keys, key);
}

var patternTypes = [String, RegExp, Array];

var KeepAlive = {
  name: 'keep-alive',
  abstract: true,

  props: {
    include: patternTypes,
    exclude: patternTypes,
    max: [String, Number]
  },

  created: function created () {
    this.cache = Object.create(null);
    this.keys = [];
  },

  destroyed: function destroyed () {
    for (var key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys);
    }
  },

  mounted: function mounted () {
    var this$1 = this;

    this.$watch('include', function (val) {
      pruneCache(this$1, function (name) { return matches(val, name); });
    });
    this.$watch('exclude', function (val) {
      pruneCache(this$1, function (name) { return !matches(val, name); });
    });
  },

  render: function render () {
    var slot = this.$slots.default;
    var vnode = getFirstComponentChild(slot);
    var componentOptions = vnode && vnode.componentOptions;
    if (componentOptions) {
      // check pattern
      var name = getComponentName(componentOptions);
      var ref = this;
      var include = ref.include;
      var exclude = ref.exclude;
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }

      var ref$1 = this;
      var cache = ref$1.cache;
      var keys = ref$1.keys;
      var key = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? ("::" + (componentOptions.tag)) : '')
        : vnode.key;
      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance;
        // make current key freshest
        remove(keys, key);
        keys.push(key);
      } else {
        cache[key] = vnode;
        keys.push(key);
        // prune oldest entry
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode);
        }
      }

      vnode.data.keepAlive = true;
    }
    return vnode || (slot && slot[0])
  }
};

var builtInComponents = {
  KeepAlive: KeepAlive
};

/*  */

function initGlobalAPI (Vue) {
  // config
  var configDef = {};
  configDef.get = function () { return config; };
  {
    configDef.set = function () {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      );
    };
  }
  Object.defineProperty(Vue, 'config', configDef);

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn: warn,
    extend: extend,
    mergeOptions: mergeOptions,
    defineReactive: defineReactive$$1
  };

  Vue.set = set;
  Vue.delete = del;
  Vue.nextTick = nextTick;

  // 2.6 explicit observable API
  Vue.observable = function (obj) {
    observe(obj);
    return obj
  };

  Vue.options = Object.create(null);
  ASSET_TYPES.forEach(function (type) {
    Vue.options[type + 's'] = Object.create(null);
  });

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue;

  extend(Vue.options.components, builtInComponents);

  initUse(Vue);
  initMixin$1(Vue);
  initExtend(Vue);
  initAssetRegisters(Vue);
}

initGlobalAPI(Vue);

Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
});

Object.defineProperty(Vue.prototype, '$ssrContext', {
  get: function get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
});

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
});

Vue.version = '2.6.11';

/*  */

// these are reserved for web because they are directly compiled away
// during template compilation
var isReservedAttr = makeMap('style,class');

// attributes that should be using props for binding
var acceptValue = makeMap('input,textarea,option,select,progress');
var mustUseProp = function (tag, type, attr) {
  return (
    (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
    (attr === 'selected' && tag === 'option') ||
    (attr === 'checked' && tag === 'input') ||
    (attr === 'muted' && tag === 'video')
  )
};

var isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck');

var isValidContentEditableValue = makeMap('events,caret,typing,plaintext-only');

var convertEnumeratedValue = function (key, value) {
  return isFalsyAttrValue(value) || value === 'false'
    ? 'false'
    // allow arbitrary string value for contenteditable
    : key === 'contenteditable' && isValidContentEditableValue(value)
      ? value
      : 'true'
};

var isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
  'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
  'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
  'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
  'required,reversed,scoped,seamless,selected,sortable,translate,' +
  'truespeed,typemustmatch,visible'
);

var xlinkNS = 'http://www.w3.org/1999/xlink';

var isXlink = function (name) {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
};

var getXlinkProp = function (name) {
  return isXlink(name) ? name.slice(6, name.length) : ''
};

var isFalsyAttrValue = function (val) {
  return val == null || val === false
};

/*  */

function genClassForVnode (vnode) {
  var data = vnode.data;
  var parentNode = vnode;
  var childNode = vnode;
  while (isDef(childNode.componentInstance)) {
    childNode = childNode.componentInstance._vnode;
    if (childNode && childNode.data) {
      data = mergeClassData(childNode.data, data);
    }
  }
  while (isDef(parentNode = parentNode.parent)) {
    if (parentNode && parentNode.data) {
      data = mergeClassData(data, parentNode.data);
    }
  }
  return renderClass(data.staticClass, data.class)
}

function mergeClassData (child, parent) {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class)
      ? [child.class, parent.class]
      : parent.class
  }
}

function renderClass (
  staticClass,
  dynamicClass
) {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concat(staticClass, stringifyClass(dynamicClass))
  }
  /* istanbul ignore next */
  return ''
}

function concat (a, b) {
  return a ? b ? (a + ' ' + b) : a : (b || '')
}

function stringifyClass (value) {
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  if (isObject(value)) {
    return stringifyObject(value)
  }
  if (typeof value === 'string') {
    return value
  }
  /* istanbul ignore next */
  return ''
}

function stringifyArray (value) {
  var res = '';
  var stringified;
  for (var i = 0, l = value.length; i < l; i++) {
    if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
      if (res) { res += ' '; }
      res += stringified;
    }
  }
  return res
}

function stringifyObject (value) {
  var res = '';
  for (var key in value) {
    if (value[key]) {
      if (res) { res += ' '; }
      res += key;
    }
  }
  return res
}

/*  */

var namespaceMap = {
  svg: 'http://www.w3.org/2000/svg',
  math: 'http://www.w3.org/1998/Math/MathML'
};

var isHTMLTag = makeMap(
  'html,body,base,head,link,meta,style,title,' +
  'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
  'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
  'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
  's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
  'embed,object,param,source,canvas,script,noscript,del,ins,' +
  'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
  'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
  'output,progress,select,textarea,' +
  'details,dialog,menu,menuitem,summary,' +
  'content,element,shadow,template,blockquote,iframe,tfoot'
);

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
var isSVG = makeMap(
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
  'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
  'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true
);

var isPreTag = function (tag) { return tag === 'pre'; };

var isReservedTag = function (tag) {
  return isHTMLTag(tag) || isSVG(tag)
};

function getTagNamespace (tag) {
  if (isSVG(tag)) {
    return 'svg'
  }
  // basic support for MathML
  // note it doesn't support other MathML elements being component roots
  if (tag === 'math') {
    return 'math'
  }
}

var unknownElementCache = Object.create(null);
function isUnknownElement (tag) {
  /* istanbul ignore if */
  if (!inBrowser) {
    return true
  }
  if (isReservedTag(tag)) {
    return false
  }
  tag = tag.toLowerCase();
  /* istanbul ignore if */
  if (unknownElementCache[tag] != null) {
    return unknownElementCache[tag]
  }
  var el = document.createElement(tag);
  if (tag.indexOf('-') > -1) {
    // http://stackoverflow.com/a/28210364/1070244
    return (unknownElementCache[tag] = (
      el.constructor === window.HTMLUnknownElement ||
      el.constructor === window.HTMLElement
    ))
  } else {
    return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
  }
}

var isTextInputType = makeMap('text,number,password,search,email,tel,url');

/*  */

/**
 * Query an element selector if it's not an element already.
 */
function query (el) {
  if (typeof el === 'string') {
    var selected = document.querySelector(el);
    if (!selected) {
      warn(
        'Cannot find element: ' + el
      );
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}

/*  */

function createElement$1 (tagName, vnode) {
  var elm = document.createElement(tagName);
  if (tagName !== 'select') {
    return elm
  }
  // false or null will remove the attribute but undefined will not
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple');
  }
  return elm
}

function createElementNS (namespace, tagName) {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

function createTextNode (text) {
  return document.createTextNode(text)
}

function createComment (text) {
  return document.createComment(text)
}

function insertBefore (parentNode, newNode, referenceNode) {
  parentNode.insertBefore(newNode, referenceNode);
}

function removeChild (node, child) {
  node.removeChild(child);
}

function appendChild (node, child) {
  node.appendChild(child);
}

function parentNode (node) {
  return node.parentNode
}

function nextSibling (node) {
  return node.nextSibling
}

function tagName (node) {
  return node.tagName
}

function setTextContent (node, text) {
  node.textContent = text;
}

function setStyleScope (node, scopeId) {
  node.setAttribute(scopeId, '');
}

var nodeOps = /*#__PURE__*/Object.freeze({
  createElement: createElement$1,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  createComment: createComment,
  insertBefore: insertBefore,
  removeChild: removeChild,
  appendChild: appendChild,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent,
  setStyleScope: setStyleScope
});

/*  */

var ref = {
  create: function create (_, vnode) {
    registerRef(vnode);
  },
  update: function update (oldVnode, vnode) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true);
      registerRef(vnode);
    }
  },
  destroy: function destroy (vnode) {
    registerRef(vnode, true);
  }
};

function registerRef (vnode, isRemoval) {
  var key = vnode.data.ref;
  if (!isDef(key)) { return }

  var vm = vnode.context;
  var ref = vnode.componentInstance || vnode.elm;
  var refs = vm.$refs;
  if (isRemoval) {
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref);
    } else if (refs[key] === ref) {
      refs[key] = undefined;
    }
  } else {
    if (vnode.data.refInFor) {
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref];
      } else if (refs[key].indexOf(ref) < 0) {
        // $flow-disable-line
        refs[key].push(ref);
      }
    } else {
      refs[key] = ref;
    }
  }
}

/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

var emptyNode = new VNode('', {}, []);

var hooks = ['create', 'activate', 'update', 'remove', 'destroy'];

function sameVnode (a, b) {
  return (
    a.key === b.key && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}

function sameInputType (a, b) {
  if (a.tag !== 'input') { return true }
  var i;
  var typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type;
  var typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type;
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}

function createKeyToOldIdx (children, beginIdx, endIdx) {
  var i, key;
  var map = {};
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) { map[key] = i; }
  }
  return map
}

function createPatchFunction (backend) {
  var i, j;
  var cbs = {};

  var modules = backend.modules;
  var nodeOps = backend.nodeOps;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (isDef(modules[j][hooks[i]])) {
        cbs[hooks[i]].push(modules[j][hooks[i]]);
      }
    }
  }

  function emptyNodeAt (elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  function createRmCb (childElm, listeners) {
    function remove$$1 () {
      if (--remove$$1.listeners === 0) {
        removeNode(childElm);
      }
    }
    remove$$1.listeners = listeners;
    return remove$$1
  }

  function removeNode (el) {
    var parent = nodeOps.parentNode(el);
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el);
    }
  }

  function isUnknownElement$$1 (vnode, inVPre) {
    return (
      !inVPre &&
      !vnode.ns &&
      !(
        config.ignoredElements.length &&
        config.ignoredElements.some(function (ignore) {
          return isRegExp(ignore)
            ? ignore.test(vnode.tag)
            : ignore === vnode.tag
        })
      ) &&
      config.isUnknownElement(vnode.tag)
    )
  }

  var creatingElmInVPre = 0;

  function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode);
    }

    vnode.isRootInsert = !nested; // for transition enter check
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }

    var data = vnode.data;
    var children = vnode.children;
    var tag = vnode.tag;
    if (isDef(tag)) {
      {
        if (data && data.pre) {
          creatingElmInVPre++;
        }
        if (isUnknownElement$$1(vnode, creatingElmInVPre)) {
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          );
        }
      }

      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode);
      setScope(vnode);

      /* istanbul ignore if */
      {
        createChildren(vnode, children, insertedVnodeQueue);
        if (isDef(data)) {
          invokeCreateHooks(vnode, insertedVnodeQueue);
        }
        insert(parentElm, vnode.elm, refElm);
      }

      if (data && data.pre) {
        creatingElmInVPre--;
      }
    } else if (isTrue(vnode.isComment)) {
      vnode.elm = nodeOps.createComment(vnode.text);
      insert(parentElm, vnode.elm, refElm);
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text);
      insert(parentElm, vnode.elm, refElm);
    }
  }

  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    var i = vnode.data;
    if (isDef(i)) {
      var isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        i(vnode, false /* hydrating */);
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue);
        insert(parentElm, vnode.elm, refElm);
        if (isTrue(isReactivated)) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
        }
        return true
      }
    }
  }

  function initComponent (vnode, insertedVnodeQueue) {
    if (isDef(vnode.data.pendingInsert)) {
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert);
      vnode.data.pendingInsert = null;
    }
    vnode.elm = vnode.componentInstance.$el;
    if (isPatchable(vnode)) {
      invokeCreateHooks(vnode, insertedVnodeQueue);
      setScope(vnode);
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode);
      // make sure to invoke the insert hook
      insertedVnodeQueue.push(vnode);
    }
  }

  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    var i;
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    var innerNode = vnode;
    while (innerNode.componentInstance) {
      innerNode = innerNode.componentInstance._vnode;
      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        for (i = 0; i < cbs.activate.length; ++i) {
          cbs.activate[i](emptyNode, innerNode);
        }
        insertedVnodeQueue.push(innerNode);
        break
      }
    }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm);
  }

  function insert (parent, elm, ref$$1) {
    if (isDef(parent)) {
      if (isDef(ref$$1)) {
        if (nodeOps.parentNode(ref$$1) === parent) {
          nodeOps.insertBefore(parent, elm, ref$$1);
        }
      } else {
        nodeOps.appendChild(parent, elm);
      }
    }
  }

  function createChildren (vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children)) {
      {
        checkDuplicateKeys(children);
      }
      for (var i = 0; i < children.length; ++i) {
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i);
      }
    } else if (isPrimitive(vnode.text)) {
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)));
    }
  }

  function isPatchable (vnode) {
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode;
    }
    return isDef(vnode.tag)
  }

  function invokeCreateHooks (vnode, insertedVnodeQueue) {
    for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
      cbs.create[i$1](emptyNode, vnode);
    }
    i = vnode.data.hook; // Reuse variable
    if (isDef(i)) {
      if (isDef(i.create)) { i.create(emptyNode, vnode); }
      if (isDef(i.insert)) { insertedVnodeQueue.push(vnode); }
    }
  }

  // set scope id attribute for scoped CSS.
  // this is implemented as a special case to avoid the overhead
  // of going through the normal attribute patching process.
  function setScope (vnode) {
    var i;
    if (isDef(i = vnode.fnScopeId)) {
      nodeOps.setStyleScope(vnode.elm, i);
    } else {
      var ancestor = vnode;
      while (ancestor) {
        if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i);
        }
        ancestor = ancestor.parent;
      }
    }
    // for slot content they should also get the scopeId from the host instance.
    if (isDef(i = activeInstance) &&
      i !== vnode.context &&
      i !== vnode.fnContext &&
      isDef(i = i.$options._scopeId)
    ) {
      nodeOps.setStyleScope(vnode.elm, i);
    }
  }

  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx);
    }
  }

  function invokeDestroyHook (vnode) {
    var i, j;
    var data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) { i(vnode); }
      for (i = 0; i < cbs.destroy.length; ++i) { cbs.destroy[i](vnode); }
    }
    if (isDef(i = vnode.children)) {
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j]);
      }
    }
  }

  function removeVnodes (vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch);
          invokeDestroyHook(ch);
        } else { // Text node
          removeNode(ch.elm);
        }
      }
    }
  }

  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      var i;
      var listeners = cbs.remove.length + 1;
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners;
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners);
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm);
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm);
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm);
      } else {
        rm();
      }
    } else {
      removeNode(vnode.elm);
    }
  }

  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    var oldStartIdx = 0;
    var newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, vnodeToMove, refElm;

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    var canMove = !removeOnly;

    {
      checkDuplicateKeys(newCh);
    }

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) { oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx); }
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
        } else {
          vnodeToMove = oldCh[idxInOld];
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
            oldCh[idxInOld] = undefined;
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
          } else {
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx);
          }
        }
        newStartVnode = newCh[++newStartIdx];
      }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function checkDuplicateKeys (children) {
    var seenKeys = {};
    for (var i = 0; i < children.length; i++) {
      var vnode = children[i];
      var key = vnode.key;
      if (isDef(key)) {
        if (seenKeys[key]) {
          warn(
            ("Duplicate keys detected: '" + key + "'. This may cause an update error."),
            vnode.context
          );
        } else {
          seenKeys[key] = true;
        }
      }
    }
  }

  function findIdxInOld (node, oldCh, start, end) {
    for (var i = start; i < end; i++) {
      var c = oldCh[i];
      if (isDef(c) && sameVnode(node, c)) { return i }
    }
  }

  function patchVnode (
    oldVnode,
    vnode,
    insertedVnodeQueue,
    ownerArray,
    index,
    removeOnly
  ) {
    if (oldVnode === vnode) {
      return
    }

    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode
      vnode = ownerArray[index] = cloneVNode(vnode);
    }

    var elm = vnode.elm = oldVnode.elm;

    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
      } else {
        vnode.isAsyncPlaceholder = true;
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    if (isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance;
      return
    }

    var i;
    var data = vnode.data;
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      i(oldVnode, vnode);
    }

    var oldCh = oldVnode.children;
    var ch = vnode.children;
    if (isDef(data) && isPatchable(vnode)) {
      for (i = 0; i < cbs.update.length; ++i) { cbs.update[i](oldVnode, vnode); }
      if (isDef(i = data.hook) && isDef(i = i.update)) { i(oldVnode, vnode); }
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) { updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly); }
      } else if (isDef(ch)) {
        {
          checkDuplicateKeys(ch);
        }
        if (isDef(oldVnode.text)) { nodeOps.setTextContent(elm, ''); }
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text);
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) { i(oldVnode, vnode); }
    }
  }

  function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue;
    } else {
      for (var i = 0; i < queue.length; ++i) {
        queue[i].data.hook.insert(queue[i]);
      }
    }
  }

  var hydrationBailed = false;
  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization
  // Note: style is excluded because it relies on initial clone for future
  // deep updates (#7063).
  var isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key');

  // Note: this is a browser-only function so we can assume elms are DOM nodes.
  function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
    var i;
    var tag = vnode.tag;
    var data = vnode.data;
    var children = vnode.children;
    inVPre = inVPre || (data && data.pre);
    vnode.elm = elm;

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true;
      return true
    }
    // assert node match
    {
      if (!assertNodeMatch(elm, vnode, inVPre)) {
        return false
      }
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) { i(vnode, true /* hydrating */); }
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue);
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue);
        } else {
          // v-html and domProps: innerHTML
          if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
            if (i !== elm.innerHTML) {
              /* istanbul ignore if */
              if (typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true;
                console.warn('Parent: ', elm);
                console.warn('server innerHTML: ', i);
                console.warn('client innerHTML: ', elm.innerHTML);
              }
              return false
            }
          } else {
            // iterate and compare children lists
            var childrenMatch = true;
            var childNode = elm.firstChild;
            for (var i$1 = 0; i$1 < children.length; i$1++) {
              if (!childNode || !hydrate(childNode, children[i$1], insertedVnodeQueue, inVPre)) {
                childrenMatch = false;
                break
              }
              childNode = childNode.nextSibling;
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              /* istanbul ignore if */
              if (typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true;
                console.warn('Parent: ', elm);
                console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children);
              }
              return false
            }
          }
        }
      }
      if (isDef(data)) {
        var fullInvoke = false;
        for (var key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true;
            invokeCreateHooks(vnode, insertedVnodeQueue);
            break
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class']);
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text;
    }
    return true
  }

  function assertNodeMatch (node, vnode, inVPre) {
    if (isDef(vnode.tag)) {
      return vnode.tag.indexOf('vue-component') === 0 || (
        !isUnknownElement$$1(vnode, inVPre) &&
        vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
      )
    } else {
      return node.nodeType === (vnode.isComment ? 8 : 3)
    }
  }

  return function patch (oldVnode, vnode, hydrating, removeOnly) {
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) { invokeDestroyHook(oldVnode); }
      return
    }

    var isInitialPatch = false;
    var insertedVnodeQueue = [];

    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      isInitialPatch = true;
      createElm(vnode, insertedVnodeQueue);
    } else {
      var isRealElement = isDef(oldVnode.nodeType);
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
      } else {
        if (isRealElement) {
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            oldVnode.removeAttribute(SSR_ATTR);
            hydrating = true;
          }
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true);
              return oldVnode
            } else {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              );
            }
          }
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          oldVnode = emptyNodeAt(oldVnode);
        }

        // replacing existing element
        var oldElm = oldVnode.elm;
        var parentElm = nodeOps.parentNode(oldElm);

        // create new node
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        );

        // update parent placeholder node element, recursively
        if (isDef(vnode.parent)) {
          var ancestor = vnode.parent;
          var patchable = isPatchable(vnode);
          while (ancestor) {
            for (var i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor);
            }
            ancestor.elm = vnode.elm;
            if (patchable) {
              for (var i$1 = 0; i$1 < cbs.create.length; ++i$1) {
                cbs.create[i$1](emptyNode, ancestor);
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              var insert = ancestor.data.hook.insert;
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (var i$2 = 1; i$2 < insert.fns.length; i$2++) {
                  insert.fns[i$2]();
                }
              }
            } else {
              registerRef(ancestor);
            }
            ancestor = ancestor.parent;
          }
        }

        // destroy old node
        if (isDef(parentElm)) {
          removeVnodes([oldVnode], 0, 0);
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode);
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
    return vnode.elm
  }
}

/*  */

var directives = {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode) {
    updateDirectives(vnode, emptyNode);
  }
};

function updateDirectives (oldVnode, vnode) {
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode);
  }
}

function _update (oldVnode, vnode) {
  var isCreate = oldVnode === emptyNode;
  var isDestroy = vnode === emptyNode;
  var oldDirs = normalizeDirectives$1(oldVnode.data.directives, oldVnode.context);
  var newDirs = normalizeDirectives$1(vnode.data.directives, vnode.context);

  var dirsWithInsert = [];
  var dirsWithPostpatch = [];

  var key, oldDir, dir;
  for (key in newDirs) {
    oldDir = oldDirs[key];
    dir = newDirs[key];
    if (!oldDir) {
      // new directive, bind
      callHook$1(dir, 'bind', vnode, oldVnode);
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir);
      }
    } else {
      // existing directive, update
      dir.oldValue = oldDir.value;
      dir.oldArg = oldDir.arg;
      callHook$1(dir, 'update', vnode, oldVnode);
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir);
      }
    }
  }

  if (dirsWithInsert.length) {
    var callInsert = function () {
      for (var i = 0; i < dirsWithInsert.length; i++) {
        callHook$1(dirsWithInsert[i], 'inserted', vnode, oldVnode);
      }
    };
    if (isCreate) {
      mergeVNodeHook(vnode, 'insert', callInsert);
    } else {
      callInsert();
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', function () {
      for (var i = 0; i < dirsWithPostpatch.length; i++) {
        callHook$1(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode);
      }
    });
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook$1(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy);
      }
    }
  }
}

var emptyModifiers = Object.create(null);

function normalizeDirectives$1 (
  dirs,
  vm
) {
  var res = Object.create(null);
  if (!dirs) {
    // $flow-disable-line
    return res
  }
  var i, dir;
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i];
    if (!dir.modifiers) {
      // $flow-disable-line
      dir.modifiers = emptyModifiers;
    }
    res[getRawDirName(dir)] = dir;
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true);
  }
  // $flow-disable-line
  return res
}

function getRawDirName (dir) {
  return dir.rawName || ((dir.name) + "." + (Object.keys(dir.modifiers || {}).join('.')))
}

function callHook$1 (dir, hook, vnode, oldVnode, isDestroy) {
  var fn = dir.def && dir.def[hook];
  if (fn) {
    try {
      fn(vnode.elm, dir, vnode, oldVnode, isDestroy);
    } catch (e) {
      handleError(e, vnode.context, ("directive " + (dir.name) + " " + hook + " hook"));
    }
  }
}

var baseModules = [
  ref,
  directives
];

/*  */

function updateAttrs (oldVnode, vnode) {
  var opts = vnode.componentOptions;
  if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
    return
  }
  if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
    return
  }
  var key, cur, old;
  var elm = vnode.elm;
  var oldAttrs = oldVnode.data.attrs || {};
  var attrs = vnode.data.attrs || {};
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(attrs.__ob__)) {
    attrs = vnode.data.attrs = extend({}, attrs);
  }

  for (key in attrs) {
    cur = attrs[key];
    old = oldAttrs[key];
    if (old !== cur) {
      setAttr(elm, key, cur);
    }
  }
  // #4391: in IE9, setting type can reset value for input[type=radio]
  // #6666: IE/Edge forces progress value down to 1 before setting a max
  /* istanbul ignore if */
  if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
    setAttr(elm, 'value', attrs.value);
  }
  for (key in oldAttrs) {
    if (isUndef(attrs[key])) {
      if (isXlink(key)) {
        elm.removeAttributeNS(xlinkNS, getXlinkProp(key));
      } else if (!isEnumeratedAttr(key)) {
        elm.removeAttribute(key);
      }
    }
  }
}

function setAttr (el, key, value) {
  if (el.tagName.indexOf('-') > -1) {
    baseSetAttr(el, key, value);
  } else if (isBooleanAttr(key)) {
    // set attribute for blank value
    // e.g. <option disabled>Select one</option>
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key);
    } else {
      // technically allowfullscreen is a boolean attribute for <iframe>,
      // but Flash expects a value of "true" when used on <embed> tag
      value = key === 'allowfullscreen' && el.tagName === 'EMBED'
        ? 'true'
        : key;
      el.setAttribute(key, value);
    }
  } else if (isEnumeratedAttr(key)) {
    el.setAttribute(key, convertEnumeratedValue(key, value));
  } else if (isXlink(key)) {
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key));
    } else {
      el.setAttributeNS(xlinkNS, key, value);
    }
  } else {
    baseSetAttr(el, key, value);
  }
}

function baseSetAttr (el, key, value) {
  if (isFalsyAttrValue(value)) {
    el.removeAttribute(key);
  } else {
    // #7138: IE10 & 11 fires input event when setting placeholder on
    // <textarea>... block the first input event and remove the blocker
    // immediately.
    /* istanbul ignore if */
    if (
      isIE && !isIE9 &&
      el.tagName === 'TEXTAREA' &&
      key === 'placeholder' && value !== '' && !el.__ieph
    ) {
      var blocker = function (e) {
        e.stopImmediatePropagation();
        el.removeEventListener('input', blocker);
      };
      el.addEventListener('input', blocker);
      // $flow-disable-line
      el.__ieph = true; /* IE placeholder patched */
    }
    el.setAttribute(key, value);
  }
}

var attrs = {
  create: updateAttrs,
  update: updateAttrs
};

/*  */

function updateClass (oldVnode, vnode) {
  var el = vnode.elm;
  var data = vnode.data;
  var oldData = oldVnode.data;
  if (
    isUndef(data.staticClass) &&
    isUndef(data.class) && (
      isUndef(oldData) || (
        isUndef(oldData.staticClass) &&
        isUndef(oldData.class)
      )
    )
  ) {
    return
  }

  var cls = genClassForVnode(vnode);

  // handle transition classes
  var transitionClass = el._transitionClasses;
  if (isDef(transitionClass)) {
    cls = concat(cls, stringifyClass(transitionClass));
  }

  // set the class
  if (cls !== el._prevClass) {
    el.setAttribute('class', cls);
    el._prevClass = cls;
  }
}

var klass = {
  create: updateClass,
  update: updateClass
};

/*  */

var validDivisionCharRE = /[\w).+\-_$\]]/;

function parseFilters (exp) {
  var inSingle = false;
  var inDouble = false;
  var inTemplateString = false;
  var inRegex = false;
  var curly = 0;
  var square = 0;
  var paren = 0;
  var lastFilterIndex = 0;
  var c, prev, i, expression, filters;

  for (i = 0; i < exp.length; i++) {
    prev = c;
    c = exp.charCodeAt(i);
    if (inSingle) {
      if (c === 0x27 && prev !== 0x5C) { inSingle = false; }
    } else if (inDouble) {
      if (c === 0x22 && prev !== 0x5C) { inDouble = false; }
    } else if (inTemplateString) {
      if (c === 0x60 && prev !== 0x5C) { inTemplateString = false; }
    } else if (inRegex) {
      if (c === 0x2f && prev !== 0x5C) { inRegex = false; }
    } else if (
      c === 0x7C && // pipe
      exp.charCodeAt(i + 1) !== 0x7C &&
      exp.charCodeAt(i - 1) !== 0x7C &&
      !curly && !square && !paren
    ) {
      if (expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1;
        expression = exp.slice(0, i).trim();
      } else {
        pushFilter();
      }
    } else {
      switch (c) {
        case 0x22: inDouble = true; break         // "
        case 0x27: inSingle = true; break         // '
        case 0x60: inTemplateString = true; break // `
        case 0x28: paren++; break                 // (
        case 0x29: paren--; break                 // )
        case 0x5B: square++; break                // [
        case 0x5D: square--; break                // ]
        case 0x7B: curly++; break                 // {
        case 0x7D: curly--; break                 // }
      }
      if (c === 0x2f) { // /
        var j = i - 1;
        var p = (void 0);
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j);
          if (p !== ' ') { break }
        }
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true;
        }
      }
    }
  }

  if (expression === undefined) {
    expression = exp.slice(0, i).trim();
  } else if (lastFilterIndex !== 0) {
    pushFilter();
  }

  function pushFilter () {
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim());
    lastFilterIndex = i + 1;
  }

  if (filters) {
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i]);
    }
  }

  return expression
}

function wrapFilter (exp, filter) {
  var i = filter.indexOf('(');
  if (i < 0) {
    // _f: resolveFilter
    return ("_f(\"" + filter + "\")(" + exp + ")")
  } else {
    var name = filter.slice(0, i);
    var args = filter.slice(i + 1);
    return ("_f(\"" + name + "\")(" + exp + (args !== ')' ? ',' + args : args))
  }
}

/*  */



/* eslint-disable no-unused-vars */
function baseWarn (msg, range) {
  console.error(("[Vue compiler]: " + msg));
}
/* eslint-enable no-unused-vars */

function pluckModuleFunction (
  modules,
  key
) {
  return modules
    ? modules.map(function (m) { return m[key]; }).filter(function (_) { return _; })
    : []
}

function addProp (el, name, value, range, dynamic) {
  (el.props || (el.props = [])).push(rangeSetItem({ name: name, value: value, dynamic: dynamic }, range));
  el.plain = false;
}

function addAttr (el, name, value, range, dynamic) {
  var attrs = dynamic
    ? (el.dynamicAttrs || (el.dynamicAttrs = []))
    : (el.attrs || (el.attrs = []));
  attrs.push(rangeSetItem({ name: name, value: value, dynamic: dynamic }, range));
  el.plain = false;
}

// add a raw attr (use this in preTransforms)
function addRawAttr (el, name, value, range) {
  el.attrsMap[name] = value;
  el.attrsList.push(rangeSetItem({ name: name, value: value }, range));
}

function addDirective (
  el,
  name,
  rawName,
  value,
  arg,
  isDynamicArg,
  modifiers,
  range
) {
  (el.directives || (el.directives = [])).push(rangeSetItem({
    name: name,
    rawName: rawName,
    value: value,
    arg: arg,
    isDynamicArg: isDynamicArg,
    modifiers: modifiers
  }, range));
  el.plain = false;
}

function prependModifierMarker (symbol, name, dynamic) {
  return dynamic
    ? ("_p(" + name + ",\"" + symbol + "\")")
    : symbol + name // mark the event as captured
}

function addHandler (
  el,
  name,
  value,
  modifiers,
  important,
  warn,
  range,
  dynamic
) {
  modifiers = modifiers || emptyObject;
  // warn prevent and passive modifier
  /* istanbul ignore if */
  if (
    warn &&
    modifiers.prevent && modifiers.passive
  ) {
    warn(
      'passive and prevent can\'t be used together. ' +
      'Passive handler can\'t prevent default event.',
      range
    );
  }

  // normalize click.right and click.middle since they don't actually fire
  // this is technically browser-specific, but at least for now browsers are
  // the only target envs that have right/middle clicks.
  if (modifiers.right) {
    if (dynamic) {
      name = "(" + name + ")==='click'?'contextmenu':(" + name + ")";
    } else if (name === 'click') {
      name = 'contextmenu';
      delete modifiers.right;
    }
  } else if (modifiers.middle) {
    if (dynamic) {
      name = "(" + name + ")==='click'?'mouseup':(" + name + ")";
    } else if (name === 'click') {
      name = 'mouseup';
    }
  }

  // check capture modifier
  if (modifiers.capture) {
    delete modifiers.capture;
    name = prependModifierMarker('!', name, dynamic);
  }
  if (modifiers.once) {
    delete modifiers.once;
    name = prependModifierMarker('~', name, dynamic);
  }
  /* istanbul ignore if */
  if (modifiers.passive) {
    delete modifiers.passive;
    name = prependModifierMarker('&', name, dynamic);
  }

  var events;
  if (modifiers.native) {
    delete modifiers.native;
    events = el.nativeEvents || (el.nativeEvents = {});
  } else {
    events = el.events || (el.events = {});
  }

  var newHandler = rangeSetItem({ value: value.trim(), dynamic: dynamic }, range);
  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers;
  }

  var handlers = events[name];
  /* istanbul ignore if */
  if (Array.isArray(handlers)) {
    important ? handlers.unshift(newHandler) : handlers.push(newHandler);
  } else if (handlers) {
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler];
  } else {
    events[name] = newHandler;
  }

  el.plain = false;
}

function getRawBindingAttr (
  el,
  name
) {
  return el.rawAttrsMap[':' + name] ||
    el.rawAttrsMap['v-bind:' + name] ||
    el.rawAttrsMap[name]
}

function getBindingAttr (
  el,
  name,
  getStatic
) {
  var dynamicValue =
    getAndRemoveAttr(el, ':' + name) ||
    getAndRemoveAttr(el, 'v-bind:' + name);
  if (dynamicValue != null) {
    return parseFilters(dynamicValue)
  } else if (getStatic !== false) {
    var staticValue = getAndRemoveAttr(el, name);
    if (staticValue != null) {
      return JSON.stringify(staticValue)
    }
  }
}

// note: this only removes the attr from the Array (attrsList) so that it
// doesn't get processed by processAttrs.
// By default it does NOT remove it from the map (attrsMap) because the map is
// needed during codegen.
function getAndRemoveAttr (
  el,
  name,
  removeFromMap
) {
  var val;
  if ((val = el.attrsMap[name]) != null) {
    var list = el.attrsList;
    for (var i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1);
        break
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name];
  }
  return val
}

function getAndRemoveAttrByRegex (
  el,
  name
) {
  var list = el.attrsList;
  for (var i = 0, l = list.length; i < l; i++) {
    var attr = list[i];
    if (name.test(attr.name)) {
      list.splice(i, 1);
      return attr
    }
  }
}

function rangeSetItem (
  item,
  range
) {
  if (range) {
    if (range.start != null) {
      item.start = range.start;
    }
    if (range.end != null) {
      item.end = range.end;
    }
  }
  return item
}

/*  */

/**
 * Cross-platform code generation for component v-model
 */
function genComponentModel (
  el,
  value,
  modifiers
) {
  var ref = modifiers || {};
  var number = ref.number;
  var trim = ref.trim;

  var baseValueExpression = '$$v';
  var valueExpression = baseValueExpression;
  if (trim) {
    valueExpression =
      "(typeof " + baseValueExpression + " === 'string'" +
      "? " + baseValueExpression + ".trim()" +
      ": " + baseValueExpression + ")";
  }
  if (number) {
    valueExpression = "_n(" + valueExpression + ")";
  }
  var assignment = genAssignmentCode(value, valueExpression);

  el.model = {
    value: ("(" + value + ")"),
    expression: JSON.stringify(value),
    callback: ("function (" + baseValueExpression + ") {" + assignment + "}")
  };
}

/**
 * Cross-platform codegen helper for generating v-model value assignment code.
 */
function genAssignmentCode (
  value,
  assignment
) {
  var res = parseModel(value);
  if (res.key === null) {
    return (value + "=" + assignment)
  } else {
    return ("$set(" + (res.exp) + ", " + (res.key) + ", " + assignment + ")")
  }
}

/**
 * Parse a v-model expression into a base path and a final key segment.
 * Handles both dot-path and possible square brackets.
 *
 * Possible cases:
 *
 * - test
 * - test[key]
 * - test[test1[key]]
 * - test["a"][key]
 * - xxx.test[a[a].test1[key]]
 * - test.xxx.a["asa"][test1[key]]
 *
 */

var len, str, chr, index$1, expressionPos, expressionEndPos;



function parseModel (val) {
  // Fix https://github.com/vuejs/vue/pull/7730
  // allow v-model="obj.val " (trailing whitespace)
  val = val.trim();
  len = val.length;

  if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
    index$1 = val.lastIndexOf('.');
    if (index$1 > -1) {
      return {
        exp: val.slice(0, index$1),
        key: '"' + val.slice(index$1 + 1) + '"'
      }
    } else {
      return {
        exp: val,
        key: null
      }
    }
  }

  str = val;
  index$1 = expressionPos = expressionEndPos = 0;

  while (!eof()) {
    chr = next();
    /* istanbul ignore if */
    if (isStringStart(chr)) {
      parseString(chr);
    } else if (chr === 0x5B) {
      parseBracket(chr);
    }
  }

  return {
    exp: val.slice(0, expressionPos),
    key: val.slice(expressionPos + 1, expressionEndPos)
  }
}

function next () {
  return str.charCodeAt(++index$1)
}

function eof () {
  return index$1 >= len
}

function isStringStart (chr) {
  return chr === 0x22 || chr === 0x27
}

function parseBracket (chr) {
  var inBracket = 1;
  expressionPos = index$1;
  while (!eof()) {
    chr = next();
    if (isStringStart(chr)) {
      parseString(chr);
      continue
    }
    if (chr === 0x5B) { inBracket++; }
    if (chr === 0x5D) { inBracket--; }
    if (inBracket === 0) {
      expressionEndPos = index$1;
      break
    }
  }
}

function parseString (chr) {
  var stringQuote = chr;
  while (!eof()) {
    chr = next();
    if (chr === stringQuote) {
      break
    }
  }
}

/*  */

var warn$1;

// in some cases, the event used has to be determined at runtime
// so we used some reserved tokens during compile.
var RANGE_TOKEN = '__r';
var CHECKBOX_RADIO_TOKEN = '__c';

function model (
  el,
  dir,
  _warn
) {
  warn$1 = _warn;
  var value = dir.value;
  var modifiers = dir.modifiers;
  var tag = el.tag;
  var type = el.attrsMap.type;

  {
    // inputs with type="file" are read only and setting the input's
    // value will throw an error.
    if (tag === 'input' && type === 'file') {
      warn$1(
        "<" + (el.tag) + " v-model=\"" + value + "\" type=\"file\">:\n" +
        "File inputs are read only. Use a v-on:change listener instead.",
        el.rawAttrsMap['v-model']
      );
    }
  }

  if (el.component) {
    genComponentModel(el, value, modifiers);
    // component v-model doesn't need extra runtime
    return false
  } else if (tag === 'select') {
    genSelect(el, value, modifiers);
  } else if (tag === 'input' && type === 'checkbox') {
    genCheckboxModel(el, value, modifiers);
  } else if (tag === 'input' && type === 'radio') {
    genRadioModel(el, value, modifiers);
  } else if (tag === 'input' || tag === 'textarea') {
    genDefaultModel(el, value, modifiers);
  } else if (!config.isReservedTag(tag)) {
    genComponentModel(el, value, modifiers);
    // component v-model doesn't need extra runtime
    return false
  } else {
    warn$1(
      "<" + (el.tag) + " v-model=\"" + value + "\">: " +
      "v-model is not supported on this element type. " +
      'If you are working with contenteditable, it\'s recommended to ' +
      'wrap a library dedicated for that purpose inside a custom component.',
      el.rawAttrsMap['v-model']
    );
  }

  // ensure runtime directive metadata
  return true
}

function genCheckboxModel (
  el,
  value,
  modifiers
) {
  var number = modifiers && modifiers.number;
  var valueBinding = getBindingAttr(el, 'value') || 'null';
  var trueValueBinding = getBindingAttr(el, 'true-value') || 'true';
  var falseValueBinding = getBindingAttr(el, 'false-value') || 'false';
  addProp(el, 'checked',
    "Array.isArray(" + value + ")" +
    "?_i(" + value + "," + valueBinding + ")>-1" + (
      trueValueBinding === 'true'
        ? (":(" + value + ")")
        : (":_q(" + value + "," + trueValueBinding + ")")
    )
  );
  addHandler(el, 'change',
    "var $$a=" + value + "," +
        '$$el=$event.target,' +
        "$$c=$$el.checked?(" + trueValueBinding + "):(" + falseValueBinding + ");" +
    'if(Array.isArray($$a)){' +
      "var $$v=" + (number ? '_n(' + valueBinding + ')' : valueBinding) + "," +
          '$$i=_i($$a,$$v);' +
      "if($$el.checked){$$i<0&&(" + (genAssignmentCode(value, '$$a.concat([$$v])')) + ")}" +
      "else{$$i>-1&&(" + (genAssignmentCode(value, '$$a.slice(0,$$i).concat($$a.slice($$i+1))')) + ")}" +
    "}else{" + (genAssignmentCode(value, '$$c')) + "}",
    null, true
  );
}

function genRadioModel (
  el,
  value,
  modifiers
) {
  var number = modifiers && modifiers.number;
  var valueBinding = getBindingAttr(el, 'value') || 'null';
  valueBinding = number ? ("_n(" + valueBinding + ")") : valueBinding;
  addProp(el, 'checked', ("_q(" + value + "," + valueBinding + ")"));
  addHandler(el, 'change', genAssignmentCode(value, valueBinding), null, true);
}

function genSelect (
  el,
  value,
  modifiers
) {
  var number = modifiers && modifiers.number;
  var selectedVal = "Array.prototype.filter" +
    ".call($event.target.options,function(o){return o.selected})" +
    ".map(function(o){var val = \"_value\" in o ? o._value : o.value;" +
    "return " + (number ? '_n(val)' : 'val') + "})";

  var assignment = '$event.target.multiple ? $$selectedVal : $$selectedVal[0]';
  var code = "var $$selectedVal = " + selectedVal + ";";
  code = code + " " + (genAssignmentCode(value, assignment));
  addHandler(el, 'change', code, null, true);
}

function genDefaultModel (
  el,
  value,
  modifiers
) {
  var type = el.attrsMap.type;

  // warn if v-bind:value conflicts with v-model
  // except for inputs with v-bind:type
  {
    var value$1 = el.attrsMap['v-bind:value'] || el.attrsMap[':value'];
    var typeBinding = el.attrsMap['v-bind:type'] || el.attrsMap[':type'];
    if (value$1 && !typeBinding) {
      var binding = el.attrsMap['v-bind:value'] ? 'v-bind:value' : ':value';
      warn$1(
        binding + "=\"" + value$1 + "\" conflicts with v-model on the same element " +
        'because the latter already expands to a value binding internally',
        el.rawAttrsMap[binding]
      );
    }
  }

  var ref = modifiers || {};
  var lazy = ref.lazy;
  var number = ref.number;
  var trim = ref.trim;
  var needCompositionGuard = !lazy && type !== 'range';
  var event = lazy
    ? 'change'
    : type === 'range'
      ? RANGE_TOKEN
      : 'input';

  var valueExpression = '$event.target.value';
  if (trim) {
    valueExpression = "$event.target.value.trim()";
  }
  if (number) {
    valueExpression = "_n(" + valueExpression + ")";
  }

  var code = genAssignmentCode(value, valueExpression);
  if (needCompositionGuard) {
    code = "if($event.target.composing)return;" + code;
  }

  addProp(el, 'value', ("(" + value + ")"));
  addHandler(el, event, code, null, true);
  if (trim || number) {
    addHandler(el, 'blur', '$forceUpdate()');
  }
}

/*  */

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.
function normalizeEvents (on) {
  /* istanbul ignore if */
  if (isDef(on[RANGE_TOKEN])) {
    // IE input[type=range] only supports `change` event
    var event = isIE ? 'change' : 'input';
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || []);
    delete on[RANGE_TOKEN];
  }
  // This was originally intended to fix #4521 but no longer necessary
  // after 2.5. Keeping it for backwards compat with generated code from < 2.4
  /* istanbul ignore if */
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || []);
    delete on[CHECKBOX_RADIO_TOKEN];
  }
}

var target$1;

function createOnceHandler$1 (event, handler, capture) {
  var _target = target$1; // save current target element in closure
  return function onceHandler () {
    var res = handler.apply(null, arguments);
    if (res !== null) {
      remove$2(event, onceHandler, capture, _target);
    }
  }
}

// #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
// implementation and does not fire microtasks in between event propagation, so
// safe to exclude.
var useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53);

function add$1 (
  name,
  handler,
  capture,
  passive
) {
  // async edge case #6566: inner click event triggers patch, event handler
  // attached to outer element during patch, and triggered again. This
  // happens because browsers fire microtask ticks between event propagation.
  // the solution is simple: we save the timestamp when a handler is attached,
  // and the handler would only fire if the event passed to it was fired
  // AFTER it was attached.
  if (useMicrotaskFix) {
    var attachedTimestamp = currentFlushTimestamp;
    var original = handler;
    handler = original._wrapper = function (e) {
      if (
        // no bubbling, should always fire.
        // this is just a safety net in case event.timeStamp is unreliable in
        // certain weird environments...
        e.target === e.currentTarget ||
        // event is fired after handler attachment
        e.timeStamp >= attachedTimestamp ||
        // bail for environments that have buggy event.timeStamp implementations
        // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
        // #9681 QtWebEngine event.timeStamp is negative value
        e.timeStamp <= 0 ||
        // #9448 bail if event is fired in another document in a multi-page
        // electron/nw.js app, since event.timeStamp will be using a different
        // starting reference
        e.target.ownerDocument !== document
      ) {
        return original.apply(this, arguments)
      }
    };
  }
  target$1.addEventListener(
    name,
    handler,
    supportsPassive
      ? { capture: capture, passive: passive }
      : capture
  );
}

function remove$2 (
  name,
  handler,
  capture,
  _target
) {
  (_target || target$1).removeEventListener(
    name,
    handler._wrapper || handler,
    capture
  );
}

function updateDOMListeners (oldVnode, vnode) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  var on = vnode.data.on || {};
  var oldOn = oldVnode.data.on || {};
  target$1 = vnode.elm;
  normalizeEvents(on);
  updateListeners(on, oldOn, add$1, remove$2, createOnceHandler$1, vnode.context);
  target$1 = undefined;
}

var events = {
  create: updateDOMListeners,
  update: updateDOMListeners
};

/*  */

var svgContainer;

function updateDOMProps (oldVnode, vnode) {
  if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
    return
  }
  var key, cur;
  var elm = vnode.elm;
  var oldProps = oldVnode.data.domProps || {};
  var props = vnode.data.domProps || {};
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(props.__ob__)) {
    props = vnode.data.domProps = extend({}, props);
  }

  for (key in oldProps) {
    if (!(key in props)) {
      elm[key] = '';
    }
  }

  for (key in props) {
    cur = props[key];
    // ignore children if the node has textContent or innerHTML,
    // as these will throw away existing DOM nodes and cause removal errors
    // on subsequent patches (#3360)
    if (key === 'textContent' || key === 'innerHTML') {
      if (vnode.children) { vnode.children.length = 0; }
      if (cur === oldProps[key]) { continue }
      // #6601 work around Chrome version <= 55 bug where single textNode
      // replaced by innerHTML/textContent retains its parentNode property
      if (elm.childNodes.length === 1) {
        elm.removeChild(elm.childNodes[0]);
      }
    }

    if (key === 'value' && elm.tagName !== 'PROGRESS') {
      // store value as _value as well since
      // non-string values will be stringified
      elm._value = cur;
      // avoid resetting cursor position when value is the same
      var strCur = isUndef(cur) ? '' : String(cur);
      if (shouldUpdateValue(elm, strCur)) {
        elm.value = strCur;
      }
    } else if (key === 'innerHTML' && isSVG(elm.tagName) && isUndef(elm.innerHTML)) {
      // IE doesn't support innerHTML for SVG elements
      svgContainer = svgContainer || document.createElement('div');
      svgContainer.innerHTML = "<svg>" + cur + "</svg>";
      var svg = svgContainer.firstChild;
      while (elm.firstChild) {
        elm.removeChild(elm.firstChild);
      }
      while (svg.firstChild) {
        elm.appendChild(svg.firstChild);
      }
    } else if (
      // skip the update if old and new VDOM state is the same.
      // `value` is handled separately because the DOM value may be temporarily
      // out of sync with VDOM state due to focus, composition and modifiers.
      // This  #4521 by skipping the unnecesarry `checked` update.
      cur !== oldProps[key]
    ) {
      // some property updates can throw
      // e.g. `value` on <progress> w/ non-finite value
      try {
        elm[key] = cur;
      } catch (e) {}
    }
  }
}

// check platforms/web/util/attrs.js acceptValue


function shouldUpdateValue (elm, checkVal) {
  return (!elm.composing && (
    elm.tagName === 'OPTION' ||
    isNotInFocusAndDirty(elm, checkVal) ||
    isDirtyWithModifiers(elm, checkVal)
  ))
}

function isNotInFocusAndDirty (elm, checkVal) {
  // return true when textbox (.number and .trim) loses focus and its value is
  // not equal to the updated value
  var notInFocus = true;
  // #6157
  // work around IE bug when accessing document.activeElement in an iframe
  try { notInFocus = document.activeElement !== elm; } catch (e) {}
  return notInFocus && elm.value !== checkVal
}

function isDirtyWithModifiers (elm, newVal) {
  var value = elm.value;
  var modifiers = elm._vModifiers; // injected by v-model runtime
  if (isDef(modifiers)) {
    if (modifiers.number) {
      return toNumber(value) !== toNumber(newVal)
    }
    if (modifiers.trim) {
      return value.trim() !== newVal.trim()
    }
  }
  return value !== newVal
}

var domProps = {
  create: updateDOMProps,
  update: updateDOMProps
};

/*  */

var parseStyleText = cached(function (cssText) {
  var res = {};
  var listDelimiter = /;(?![^(]*\))/g;
  var propertyDelimiter = /:(.+)/;
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      var tmp = item.split(propertyDelimiter);
      tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
    }
  });
  return res
});

// merge static and dynamic style data on the same vnode
function normalizeStyleData (data) {
  var style = normalizeStyleBinding(data.style);
  // static style is pre-processed into an object during compilation
  // and is always a fresh object, so it's safe to merge into it
  return data.staticStyle
    ? extend(data.staticStyle, style)
    : style
}

// normalize possible array / string values into Object
function normalizeStyleBinding (bindingStyle) {
  if (Array.isArray(bindingStyle)) {
    return toObject(bindingStyle)
  }
  if (typeof bindingStyle === 'string') {
    return parseStyleText(bindingStyle)
  }
  return bindingStyle
}

/**
 * parent component style should be after child's
 * so that parent component's style could override it
 */
function getStyle (vnode, checkChild) {
  var res = {};
  var styleData;

  if (checkChild) {
    var childNode = vnode;
    while (childNode.componentInstance) {
      childNode = childNode.componentInstance._vnode;
      if (
        childNode && childNode.data &&
        (styleData = normalizeStyleData(childNode.data))
      ) {
        extend(res, styleData);
      }
    }
  }

  if ((styleData = normalizeStyleData(vnode.data))) {
    extend(res, styleData);
  }

  var parentNode = vnode;
  while ((parentNode = parentNode.parent)) {
    if (parentNode.data && (styleData = normalizeStyleData(parentNode.data))) {
      extend(res, styleData);
    }
  }
  return res
}

/*  */

var cssVarRE = /^--/;
var importantRE = /\s*!important$/;
var setProp = function (el, name, val) {
  /* istanbul ignore if */
  if (cssVarRE.test(name)) {
    el.style.setProperty(name, val);
  } else if (importantRE.test(val)) {
    el.style.setProperty(hyphenate(name), val.replace(importantRE, ''), 'important');
  } else {
    var normalizedName = normalize(name);
    if (Array.isArray(val)) {
      // Support values array created by autoprefixer, e.g.
      // {display: ["-webkit-box", "-ms-flexbox", "flex"]}
      // Set them one by one, and the browser will only set those it can recognize
      for (var i = 0, len = val.length; i < len; i++) {
        el.style[normalizedName] = val[i];
      }
    } else {
      el.style[normalizedName] = val;
    }
  }
};

var vendorNames = ['Webkit', 'Moz', 'ms'];

var emptyStyle;
var normalize = cached(function (prop) {
  emptyStyle = emptyStyle || document.createElement('div').style;
  prop = camelize(prop);
  if (prop !== 'filter' && (prop in emptyStyle)) {
    return prop
  }
  var capName = prop.charAt(0).toUpperCase() + prop.slice(1);
  for (var i = 0; i < vendorNames.length; i++) {
    var name = vendorNames[i] + capName;
    if (name in emptyStyle) {
      return name
    }
  }
});

function updateStyle (oldVnode, vnode) {
  var data = vnode.data;
  var oldData = oldVnode.data;

  if (isUndef(data.staticStyle) && isUndef(data.style) &&
    isUndef(oldData.staticStyle) && isUndef(oldData.style)
  ) {
    return
  }

  var cur, name;
  var el = vnode.elm;
  var oldStaticStyle = oldData.staticStyle;
  var oldStyleBinding = oldData.normalizedStyle || oldData.style || {};

  // if static style exists, stylebinding already merged into it when doing normalizeStyleData
  var oldStyle = oldStaticStyle || oldStyleBinding;

  var style = normalizeStyleBinding(vnode.data.style) || {};

  // store normalized style under a different key for next diff
  // make sure to clone it if it's reactive, since the user likely wants
  // to mutate it.
  vnode.data.normalizedStyle = isDef(style.__ob__)
    ? extend({}, style)
    : style;

  var newStyle = getStyle(vnode, true);

  for (name in oldStyle) {
    if (isUndef(newStyle[name])) {
      setProp(el, name, '');
    }
  }
  for (name in newStyle) {
    cur = newStyle[name];
    if (cur !== oldStyle[name]) {
      // ie9 setting to null has no effect, must use empty string
      setProp(el, name, cur == null ? '' : cur);
    }
  }
}

var style = {
  create: updateStyle,
  update: updateStyle
};

/*  */

var whitespaceRE = /\s+/;

/**
 * Add class with compatibility for SVG since classList is not supported on
 * SVG elements in IE
 */
function addClass (el, cls) {
  /* istanbul ignore if */
  if (!cls || !(cls = cls.trim())) {
    return
  }

  /* istanbul ignore else */
  if (el.classList) {
    if (cls.indexOf(' ') > -1) {
      cls.split(whitespaceRE).forEach(function (c) { return el.classList.add(c); });
    } else {
      el.classList.add(cls);
    }
  } else {
    var cur = " " + (el.getAttribute('class') || '') + " ";
    if (cur.indexOf(' ' + cls + ' ') < 0) {
      el.setAttribute('class', (cur + cls).trim());
    }
  }
}

/**
 * Remove class with compatibility for SVG since classList is not supported on
 * SVG elements in IE
 */
function removeClass (el, cls) {
  /* istanbul ignore if */
  if (!cls || !(cls = cls.trim())) {
    return
  }

  /* istanbul ignore else */
  if (el.classList) {
    if (cls.indexOf(' ') > -1) {
      cls.split(whitespaceRE).forEach(function (c) { return el.classList.remove(c); });
    } else {
      el.classList.remove(cls);
    }
    if (!el.classList.length) {
      el.removeAttribute('class');
    }
  } else {
    var cur = " " + (el.getAttribute('class') || '') + " ";
    var tar = ' ' + cls + ' ';
    while (cur.indexOf(tar) >= 0) {
      cur = cur.replace(tar, ' ');
    }
    cur = cur.trim();
    if (cur) {
      el.setAttribute('class', cur);
    } else {
      el.removeAttribute('class');
    }
  }
}

/*  */

function resolveTransition (def$$1) {
  if (!def$$1) {
    return
  }
  /* istanbul ignore else */
  if (typeof def$$1 === 'object') {
    var res = {};
    if (def$$1.css !== false) {
      extend(res, autoCssTransition(def$$1.name || 'v'));
    }
    extend(res, def$$1);
    return res
  } else if (typeof def$$1 === 'string') {
    return autoCssTransition(def$$1)
  }
}

var autoCssTransition = cached(function (name) {
  return {
    enterClass: (name + "-enter"),
    enterToClass: (name + "-enter-to"),
    enterActiveClass: (name + "-enter-active"),
    leaveClass: (name + "-leave"),
    leaveToClass: (name + "-leave-to"),
    leaveActiveClass: (name + "-leave-active")
  }
});

var hasTransition = inBrowser && !isIE9;
var TRANSITION = 'transition';
var ANIMATION = 'animation';

// Transition property/event sniffing
var transitionProp = 'transition';
var transitionEndEvent = 'transitionend';
var animationProp = 'animation';
var animationEndEvent = 'animationend';
if (hasTransition) {
  /* istanbul ignore if */
  if (window.ontransitionend === undefined &&
    window.onwebkittransitionend !== undefined
  ) {
    transitionProp = 'WebkitTransition';
    transitionEndEvent = 'webkitTransitionEnd';
  }
  if (window.onanimationend === undefined &&
    window.onwebkitanimationend !== undefined
  ) {
    animationProp = 'WebkitAnimation';
    animationEndEvent = 'webkitAnimationEnd';
  }
}

// binding to window is necessary to make hot reload work in IE in strict mode
var raf = inBrowser
  ? window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : setTimeout
  : /* istanbul ignore next */ function (fn) { return fn(); };

function nextFrame (fn) {
  raf(function () {
    raf(fn);
  });
}

function addTransitionClass (el, cls) {
  var transitionClasses = el._transitionClasses || (el._transitionClasses = []);
  if (transitionClasses.indexOf(cls) < 0) {
    transitionClasses.push(cls);
    addClass(el, cls);
  }
}

function removeTransitionClass (el, cls) {
  if (el._transitionClasses) {
    remove(el._transitionClasses, cls);
  }
  removeClass(el, cls);
}

function whenTransitionEnds (
  el,
  expectedType,
  cb
) {
  var ref = getTransitionInfo(el, expectedType);
  var type = ref.type;
  var timeout = ref.timeout;
  var propCount = ref.propCount;
  if (!type) { return cb() }
  var event = type === TRANSITION ? transitionEndEvent : animationEndEvent;
  var ended = 0;
  var end = function () {
    el.removeEventListener(event, onEnd);
    cb();
  };
  var onEnd = function (e) {
    if (e.target === el) {
      if (++ended >= propCount) {
        end();
      }
    }
  };
  setTimeout(function () {
    if (ended < propCount) {
      end();
    }
  }, timeout + 1);
  el.addEventListener(event, onEnd);
}

var transformRE = /\b(transform|all)(,|$)/;

function getTransitionInfo (el, expectedType) {
  var styles = window.getComputedStyle(el);
  // JSDOM may return undefined for transition properties
  var transitionDelays = (styles[transitionProp + 'Delay'] || '').split(', ');
  var transitionDurations = (styles[transitionProp + 'Duration'] || '').split(', ');
  var transitionTimeout = getTimeout(transitionDelays, transitionDurations);
  var animationDelays = (styles[animationProp + 'Delay'] || '').split(', ');
  var animationDurations = (styles[animationProp + 'Duration'] || '').split(', ');
  var animationTimeout = getTimeout(animationDelays, animationDurations);

  var type;
  var timeout = 0;
  var propCount = 0;
  /* istanbul ignore if */
  if (expectedType === TRANSITION) {
    if (transitionTimeout > 0) {
      type = TRANSITION;
      timeout = transitionTimeout;
      propCount = transitionDurations.length;
    }
  } else if (expectedType === ANIMATION) {
    if (animationTimeout > 0) {
      type = ANIMATION;
      timeout = animationTimeout;
      propCount = animationDurations.length;
    }
  } else {
    timeout = Math.max(transitionTimeout, animationTimeout);
    type = timeout > 0
      ? transitionTimeout > animationTimeout
        ? TRANSITION
        : ANIMATION
      : null;
    propCount = type
      ? type === TRANSITION
        ? transitionDurations.length
        : animationDurations.length
      : 0;
  }
  var hasTransform =
    type === TRANSITION &&
    transformRE.test(styles[transitionProp + 'Property']);
  return {
    type: type,
    timeout: timeout,
    propCount: propCount,
    hasTransform: hasTransform
  }
}

function getTimeout (delays, durations) {
  /* istanbul ignore next */
  while (delays.length < durations.length) {
    delays = delays.concat(delays);
  }

  return Math.max.apply(null, durations.map(function (d, i) {
    return toMs(d) + toMs(delays[i])
  }))
}

// Old versions of Chromium (below 61.0.3163.100) formats floating pointer numbers
// in a locale-dependent way, using a comma instead of a dot.
// If comma is not replaced with a dot, the input will be rounded down (i.e. acting
// as a floor function) causing unexpected behaviors
function toMs (s) {
  return Number(s.slice(0, -1).replace(',', '.')) * 1000
}

/*  */

function enter (vnode, toggleDisplay) {
  var el = vnode.elm;

  // call leave callback now
  if (isDef(el._leaveCb)) {
    el._leaveCb.cancelled = true;
    el._leaveCb();
  }

  var data = resolveTransition(vnode.data.transition);
  if (isUndef(data)) {
    return
  }

  /* istanbul ignore if */
  if (isDef(el._enterCb) || el.nodeType !== 1) {
    return
  }

  var css = data.css;
  var type = data.type;
  var enterClass = data.enterClass;
  var enterToClass = data.enterToClass;
  var enterActiveClass = data.enterActiveClass;
  var appearClass = data.appearClass;
  var appearToClass = data.appearToClass;
  var appearActiveClass = data.appearActiveClass;
  var beforeEnter = data.beforeEnter;
  var enter = data.enter;
  var afterEnter = data.afterEnter;
  var enterCancelled = data.enterCancelled;
  var beforeAppear = data.beforeAppear;
  var appear = data.appear;
  var afterAppear = data.afterAppear;
  var appearCancelled = data.appearCancelled;
  var duration = data.duration;

  // activeInstance will always be the <transition> component managing this
  // transition. One edge case to check is when the <transition> is placed
  // as the root node of a child component. In that case we need to check
  // <transition>'s parent for appear check.
  var context = activeInstance;
  var transitionNode = activeInstance.$vnode;
  while (transitionNode && transitionNode.parent) {
    context = transitionNode.context;
    transitionNode = transitionNode.parent;
  }

  var isAppear = !context._isMounted || !vnode.isRootInsert;

  if (isAppear && !appear && appear !== '') {
    return
  }

  var startClass = isAppear && appearClass
    ? appearClass
    : enterClass;
  var activeClass = isAppear && appearActiveClass
    ? appearActiveClass
    : enterActiveClass;
  var toClass = isAppear && appearToClass
    ? appearToClass
    : enterToClass;

  var beforeEnterHook = isAppear
    ? (beforeAppear || beforeEnter)
    : beforeEnter;
  var enterHook = isAppear
    ? (typeof appear === 'function' ? appear : enter)
    : enter;
  var afterEnterHook = isAppear
    ? (afterAppear || afterEnter)
    : afterEnter;
  var enterCancelledHook = isAppear
    ? (appearCancelled || enterCancelled)
    : enterCancelled;

  var explicitEnterDuration = toNumber(
    isObject(duration)
      ? duration.enter
      : duration
  );

  if (explicitEnterDuration != null) {
    checkDuration(explicitEnterDuration, 'enter', vnode);
  }

  var expectsCSS = css !== false && !isIE9;
  var userWantsControl = getHookArgumentsLength(enterHook);

  var cb = el._enterCb = once(function () {
    if (expectsCSS) {
      removeTransitionClass(el, toClass);
      removeTransitionClass(el, activeClass);
    }
    if (cb.cancelled) {
      if (expectsCSS) {
        removeTransitionClass(el, startClass);
      }
      enterCancelledHook && enterCancelledHook(el);
    } else {
      afterEnterHook && afterEnterHook(el);
    }
    el._enterCb = null;
  });

  if (!vnode.data.show) {
    // remove pending leave element on enter by injecting an insert hook
    mergeVNodeHook(vnode, 'insert', function () {
      var parent = el.parentNode;
      var pendingNode = parent && parent._pending && parent._pending[vnode.key];
      if (pendingNode &&
        pendingNode.tag === vnode.tag &&
        pendingNode.elm._leaveCb
      ) {
        pendingNode.elm._leaveCb();
      }
      enterHook && enterHook(el, cb);
    });
  }

  // start enter transition
  beforeEnterHook && beforeEnterHook(el);
  if (expectsCSS) {
    addTransitionClass(el, startClass);
    addTransitionClass(el, activeClass);
    nextFrame(function () {
      removeTransitionClass(el, startClass);
      if (!cb.cancelled) {
        addTransitionClass(el, toClass);
        if (!userWantsControl) {
          if (isValidDuration(explicitEnterDuration)) {
            setTimeout(cb, explicitEnterDuration);
          } else {
            whenTransitionEnds(el, type, cb);
          }
        }
      }
    });
  }

  if (vnode.data.show) {
    toggleDisplay && toggleDisplay();
    enterHook && enterHook(el, cb);
  }

  if (!expectsCSS && !userWantsControl) {
    cb();
  }
}

function leave (vnode, rm) {
  var el = vnode.elm;

  // call enter callback now
  if (isDef(el._enterCb)) {
    el._enterCb.cancelled = true;
    el._enterCb();
  }

  var data = resolveTransition(vnode.data.transition);
  if (isUndef(data) || el.nodeType !== 1) {
    return rm()
  }

  /* istanbul ignore if */
  if (isDef(el._leaveCb)) {
    return
  }

  var css = data.css;
  var type = data.type;
  var leaveClass = data.leaveClass;
  var leaveToClass = data.leaveToClass;
  var leaveActiveClass = data.leaveActiveClass;
  var beforeLeave = data.beforeLeave;
  var leave = data.leave;
  var afterLeave = data.afterLeave;
  var leaveCancelled = data.leaveCancelled;
  var delayLeave = data.delayLeave;
  var duration = data.duration;

  var expectsCSS = css !== false && !isIE9;
  var userWantsControl = getHookArgumentsLength(leave);

  var explicitLeaveDuration = toNumber(
    isObject(duration)
      ? duration.leave
      : duration
  );

  if (isDef(explicitLeaveDuration)) {
    checkDuration(explicitLeaveDuration, 'leave', vnode);
  }

  var cb = el._leaveCb = once(function () {
    if (el.parentNode && el.parentNode._pending) {
      el.parentNode._pending[vnode.key] = null;
    }
    if (expectsCSS) {
      removeTransitionClass(el, leaveToClass);
      removeTransitionClass(el, leaveActiveClass);
    }
    if (cb.cancelled) {
      if (expectsCSS) {
        removeTransitionClass(el, leaveClass);
      }
      leaveCancelled && leaveCancelled(el);
    } else {
      rm();
      afterLeave && afterLeave(el);
    }
    el._leaveCb = null;
  });

  if (delayLeave) {
    delayLeave(performLeave);
  } else {
    performLeave();
  }

  function performLeave () {
    // the delayed leave may have already been cancelled
    if (cb.cancelled) {
      return
    }
    // record leaving element
    if (!vnode.data.show && el.parentNode) {
      (el.parentNode._pending || (el.parentNode._pending = {}))[(vnode.key)] = vnode;
    }
    beforeLeave && beforeLeave(el);
    if (expectsCSS) {
      addTransitionClass(el, leaveClass);
      addTransitionClass(el, leaveActiveClass);
      nextFrame(function () {
        removeTransitionClass(el, leaveClass);
        if (!cb.cancelled) {
          addTransitionClass(el, leaveToClass);
          if (!userWantsControl) {
            if (isValidDuration(explicitLeaveDuration)) {
              setTimeout(cb, explicitLeaveDuration);
            } else {
              whenTransitionEnds(el, type, cb);
            }
          }
        }
      });
    }
    leave && leave(el, cb);
    if (!expectsCSS && !userWantsControl) {
      cb();
    }
  }
}

// only used in dev mode
function checkDuration (val, name, vnode) {
  if (typeof val !== 'number') {
    warn(
      "<transition> explicit " + name + " duration is not a valid number - " +
      "got " + (JSON.stringify(val)) + ".",
      vnode.context
    );
  } else if (isNaN(val)) {
    warn(
      "<transition> explicit " + name + " duration is NaN - " +
      'the duration expression might be incorrect.',
      vnode.context
    );
  }
}

function isValidDuration (val) {
  return typeof val === 'number' && !isNaN(val)
}

/**
 * Normalize a transition hook's argument length. The hook may be:
 * - a merged hook (invoker) with the original in .fns
 * - a wrapped component method (check ._length)
 * - a plain function (.length)
 */
function getHookArgumentsLength (fn) {
  if (isUndef(fn)) {
    return false
  }
  var invokerFns = fn.fns;
  if (isDef(invokerFns)) {
    // invoker
    return getHookArgumentsLength(
      Array.isArray(invokerFns)
        ? invokerFns[0]
        : invokerFns
    )
  } else {
    return (fn._length || fn.length) > 1
  }
}

function _enter (_, vnode) {
  if (vnode.data.show !== true) {
    enter(vnode);
  }
}

var transition = inBrowser ? {
  create: _enter,
  activate: _enter,
  remove: function remove$$1 (vnode, rm) {
    /* istanbul ignore else */
    if (vnode.data.show !== true) {
      leave(vnode, rm);
    } else {
      rm();
    }
  }
} : {};

var platformModules = [
  attrs,
  klass,
  events,
  domProps,
  style,
  transition
];

/*  */

// the directive module should be applied last, after all
// built-in modules have been applied.
var modules = platformModules.concat(baseModules);

var patch = createPatchFunction({ nodeOps: nodeOps, modules: modules });

/**
 * Not type checking this file because flow doesn't like attaching
 * properties to Elements.
 */

/* istanbul ignore if */
if (isIE9) {
  // http://www.matts411.com/post/internet-explorer-9-oninput/
  document.addEventListener('selectionchange', function () {
    var el = document.activeElement;
    if (el && el.vmodel) {
      trigger(el, 'input');
    }
  });
}

var directive = {
  inserted: function inserted (el, binding, vnode, oldVnode) {
    if (vnode.tag === 'select') {
      // #6903
      if (oldVnode.elm && !oldVnode.elm._vOptions) {
        mergeVNodeHook(vnode, 'postpatch', function () {
          directive.componentUpdated(el, binding, vnode);
        });
      } else {
        setSelected(el, binding, vnode.context);
      }
      el._vOptions = [].map.call(el.options, getValue);
    } else if (vnode.tag === 'textarea' || isTextInputType(el.type)) {
      el._vModifiers = binding.modifiers;
      if (!binding.modifiers.lazy) {
        el.addEventListener('compositionstart', onCompositionStart);
        el.addEventListener('compositionend', onCompositionEnd);
        // Safari < 10.2 & UIWebView doesn't fire compositionend when
        // switching focus before confirming composition choice
        // this also fixes the issue where some browsers e.g. iOS Chrome
        // fires "change" instead of "input" on autocomplete.
        el.addEventListener('change', onCompositionEnd);
        /* istanbul ignore if */
        if (isIE9) {
          el.vmodel = true;
        }
      }
    }
  },

  componentUpdated: function componentUpdated (el, binding, vnode) {
    if (vnode.tag === 'select') {
      setSelected(el, binding, vnode.context);
      // in case the options rendered by v-for have changed,
      // it's possible that the value is out-of-sync with the rendered options.
      // detect such cases and filter out values that no longer has a matching
      // option in the DOM.
      var prevOptions = el._vOptions;
      var curOptions = el._vOptions = [].map.call(el.options, getValue);
      if (curOptions.some(function (o, i) { return !looseEqual(o, prevOptions[i]); })) {
        // trigger change event if
        // no matching option found for at least one value
        var needReset = el.multiple
          ? binding.value.some(function (v) { return hasNoMatchingOption(v, curOptions); })
          : binding.value !== binding.oldValue && hasNoMatchingOption(binding.value, curOptions);
        if (needReset) {
          trigger(el, 'change');
        }
      }
    }
  }
};

function setSelected (el, binding, vm) {
  actuallySetSelected(el, binding, vm);
  /* istanbul ignore if */
  if (isIE || isEdge) {
    setTimeout(function () {
      actuallySetSelected(el, binding, vm);
    }, 0);
  }
}

function actuallySetSelected (el, binding, vm) {
  var value = binding.value;
  var isMultiple = el.multiple;
  if (isMultiple && !Array.isArray(value)) {
    warn(
      "<select multiple v-model=\"" + (binding.expression) + "\"> " +
      "expects an Array value for its binding, but got " + (Object.prototype.toString.call(value).slice(8, -1)),
      vm
    );
    return
  }
  var selected, option;
  for (var i = 0, l = el.options.length; i < l; i++) {
    option = el.options[i];
    if (isMultiple) {
      selected = looseIndexOf(value, getValue(option)) > -1;
      if (option.selected !== selected) {
        option.selected = selected;
      }
    } else {
      if (looseEqual(getValue(option), value)) {
        if (el.selectedIndex !== i) {
          el.selectedIndex = i;
        }
        return
      }
    }
  }
  if (!isMultiple) {
    el.selectedIndex = -1;
  }
}

function hasNoMatchingOption (value, options) {
  return options.every(function (o) { return !looseEqual(o, value); })
}

function getValue (option) {
  return '_value' in option
    ? option._value
    : option.value
}

function onCompositionStart (e) {
  e.target.composing = true;
}

function onCompositionEnd (e) {
  // prevent triggering an input event for no reason
  if (!e.target.composing) { return }
  e.target.composing = false;
  trigger(e.target, 'input');
}

function trigger (el, type) {
  var e = document.createEvent('HTMLEvents');
  e.initEvent(type, true, true);
  el.dispatchEvent(e);
}

/*  */

// recursively search for possible transition defined inside the component root
function locateNode (vnode) {
  return vnode.componentInstance && (!vnode.data || !vnode.data.transition)
    ? locateNode(vnode.componentInstance._vnode)
    : vnode
}

var show = {
  bind: function bind (el, ref, vnode) {
    var value = ref.value;

    vnode = locateNode(vnode);
    var transition$$1 = vnode.data && vnode.data.transition;
    var originalDisplay = el.__vOriginalDisplay =
      el.style.display === 'none' ? '' : el.style.display;
    if (value && transition$$1) {
      vnode.data.show = true;
      enter(vnode, function () {
        el.style.display = originalDisplay;
      });
    } else {
      el.style.display = value ? originalDisplay : 'none';
    }
  },

  update: function update (el, ref, vnode) {
    var value = ref.value;
    var oldValue = ref.oldValue;

    /* istanbul ignore if */
    if (!value === !oldValue) { return }
    vnode = locateNode(vnode);
    var transition$$1 = vnode.data && vnode.data.transition;
    if (transition$$1) {
      vnode.data.show = true;
      if (value) {
        enter(vnode, function () {
          el.style.display = el.__vOriginalDisplay;
        });
      } else {
        leave(vnode, function () {
          el.style.display = 'none';
        });
      }
    } else {
      el.style.display = value ? el.__vOriginalDisplay : 'none';
    }
  },

  unbind: function unbind (
    el,
    binding,
    vnode,
    oldVnode,
    isDestroy
  ) {
    if (!isDestroy) {
      el.style.display = el.__vOriginalDisplay;
    }
  }
};

var platformDirectives = {
  model: directive,
  show: show
};

/*  */

var transitionProps = {
  name: String,
  appear: Boolean,
  css: Boolean,
  mode: String,
  type: String,
  enterClass: String,
  leaveClass: String,
  enterToClass: String,
  leaveToClass: String,
  enterActiveClass: String,
  leaveActiveClass: String,
  appearClass: String,
  appearActiveClass: String,
  appearToClass: String,
  duration: [Number, String, Object]
};

// in case the child is also an abstract component, e.g. <keep-alive>
// we want to recursively retrieve the real component to be rendered
function getRealChild (vnode) {
  var compOptions = vnode && vnode.componentOptions;
  if (compOptions && compOptions.Ctor.options.abstract) {
    return getRealChild(getFirstComponentChild(compOptions.children))
  } else {
    return vnode
  }
}

function extractTransitionData (comp) {
  var data = {};
  var options = comp.$options;
  // props
  for (var key in options.propsData) {
    data[key] = comp[key];
  }
  // events.
  // extract listeners and pass them directly to the transition methods
  var listeners = options._parentListeners;
  for (var key$1 in listeners) {
    data[camelize(key$1)] = listeners[key$1];
  }
  return data
}

function placeholder (h, rawChild) {
  if (/\d-keep-alive$/.test(rawChild.tag)) {
    return h('keep-alive', {
      props: rawChild.componentOptions.propsData
    })
  }
}

function hasParentTransition (vnode) {
  while ((vnode = vnode.parent)) {
    if (vnode.data.transition) {
      return true
    }
  }
}

function isSameChild (child, oldChild) {
  return oldChild.key === child.key && oldChild.tag === child.tag
}

var isNotTextNode = function (c) { return c.tag || isAsyncPlaceholder(c); };

var isVShowDirective = function (d) { return d.name === 'show'; };

var Transition = {
  name: 'transition',
  props: transitionProps,
  abstract: true,

  render: function render (h) {
    var this$1 = this;

    var children = this.$slots.default;
    if (!children) {
      return
    }

    // filter out text nodes (possible whitespaces)
    children = children.filter(isNotTextNode);
    /* istanbul ignore if */
    if (!children.length) {
      return
    }

    // warn multiple elements
    if (children.length > 1) {
      warn(
        '<transition> can only be used on a single element. Use ' +
        '<transition-group> for lists.',
        this.$parent
      );
    }

    var mode = this.mode;

    // warn invalid mode
    if (mode && mode !== 'in-out' && mode !== 'out-in'
    ) {
      warn(
        'invalid <transition> mode: ' + mode,
        this.$parent
      );
    }

    var rawChild = children[0];

    // if this is a component root node and the component's
    // parent container node also has transition, skip.
    if (hasParentTransition(this.$vnode)) {
      return rawChild
    }

    // apply transition data to child
    // use getRealChild() to ignore abstract components e.g. keep-alive
    var child = getRealChild(rawChild);
    /* istanbul ignore if */
    if (!child) {
      return rawChild
    }

    if (this._leaving) {
      return placeholder(h, rawChild)
    }

    // ensure a key that is unique to the vnode type and to this transition
    // component instance. This key will be used to remove pending leaving nodes
    // during entering.
    var id = "__transition-" + (this._uid) + "-";
    child.key = child.key == null
      ? child.isComment
        ? id + 'comment'
        : id + child.tag
      : isPrimitive(child.key)
        ? (String(child.key).indexOf(id) === 0 ? child.key : id + child.key)
        : child.key;

    var data = (child.data || (child.data = {})).transition = extractTransitionData(this);
    var oldRawChild = this._vnode;
    var oldChild = getRealChild(oldRawChild);

    // mark v-show
    // so that the transition module can hand over the control to the directive
    if (child.data.directives && child.data.directives.some(isVShowDirective)) {
      child.data.show = true;
    }

    if (
      oldChild &&
      oldChild.data &&
      !isSameChild(child, oldChild) &&
      !isAsyncPlaceholder(oldChild) &&
      // #6687 component root is a comment node
      !(oldChild.componentInstance && oldChild.componentInstance._vnode.isComment)
    ) {
      // replace old child transition data with fresh one
      // important for dynamic transitions!
      var oldData = oldChild.data.transition = extend({}, data);
      // handle transition mode
      if (mode === 'out-in') {
        // return placeholder node and queue update when leave finishes
        this._leaving = true;
        mergeVNodeHook(oldData, 'afterLeave', function () {
          this$1._leaving = false;
          this$1.$forceUpdate();
        });
        return placeholder(h, rawChild)
      } else if (mode === 'in-out') {
        if (isAsyncPlaceholder(child)) {
          return oldRawChild
        }
        var delayedLeave;
        var performLeave = function () { delayedLeave(); };
        mergeVNodeHook(data, 'afterEnter', performLeave);
        mergeVNodeHook(data, 'enterCancelled', performLeave);
        mergeVNodeHook(oldData, 'delayLeave', function (leave) { delayedLeave = leave; });
      }
    }

    return rawChild
  }
};

/*  */

var props = extend({
  tag: String,
  moveClass: String
}, transitionProps);

delete props.mode;

var TransitionGroup = {
  props: props,

  beforeMount: function beforeMount () {
    var this$1 = this;

    var update = this._update;
    this._update = function (vnode, hydrating) {
      var restoreActiveInstance = setActiveInstance(this$1);
      // force removing pass
      this$1.__patch__(
        this$1._vnode,
        this$1.kept,
        false, // hydrating
        true // removeOnly (!important, avoids unnecessary moves)
      );
      this$1._vnode = this$1.kept;
      restoreActiveInstance();
      update.call(this$1, vnode, hydrating);
    };
  },

  render: function render (h) {
    var tag = this.tag || this.$vnode.data.tag || 'span';
    var map = Object.create(null);
    var prevChildren = this.prevChildren = this.children;
    var rawChildren = this.$slots.default || [];
    var children = this.children = [];
    var transitionData = extractTransitionData(this);

    for (var i = 0; i < rawChildren.length; i++) {
      var c = rawChildren[i];
      if (c.tag) {
        if (c.key != null && String(c.key).indexOf('__vlist') !== 0) {
          children.push(c);
          map[c.key] = c
          ;(c.data || (c.data = {})).transition = transitionData;
        } else {
          var opts = c.componentOptions;
          var name = opts ? (opts.Ctor.options.name || opts.tag || '') : c.tag;
          warn(("<transition-group> children must be keyed: <" + name + ">"));
        }
      }
    }

    if (prevChildren) {
      var kept = [];
      var removed = [];
      for (var i$1 = 0; i$1 < prevChildren.length; i$1++) {
        var c$1 = prevChildren[i$1];
        c$1.data.transition = transitionData;
        c$1.data.pos = c$1.elm.getBoundingClientRect();
        if (map[c$1.key]) {
          kept.push(c$1);
        } else {
          removed.push(c$1);
        }
      }
      this.kept = h(tag, null, kept);
      this.removed = removed;
    }

    return h(tag, null, children)
  },

  updated: function updated () {
    var children = this.prevChildren;
    var moveClass = this.moveClass || ((this.name || 'v') + '-move');
    if (!children.length || !this.hasMove(children[0].elm, moveClass)) {
      return
    }

    // we divide the work into three loops to avoid mixing DOM reads and writes
    // in each iteration - which helps prevent layout thrashing.
    children.forEach(callPendingCbs);
    children.forEach(recordPosition);
    children.forEach(applyTranslation);

    // force reflow to put everything in position
    // assign to this to avoid being removed in tree-shaking
    // $flow-disable-line
    this._reflow = document.body.offsetHeight;

    children.forEach(function (c) {
      if (c.data.moved) {
        var el = c.elm;
        var s = el.style;
        addTransitionClass(el, moveClass);
        s.transform = s.WebkitTransform = s.transitionDuration = '';
        el.addEventListener(transitionEndEvent, el._moveCb = function cb (e) {
          if (e && e.target !== el) {
            return
          }
          if (!e || /transform$/.test(e.propertyName)) {
            el.removeEventListener(transitionEndEvent, cb);
            el._moveCb = null;
            removeTransitionClass(el, moveClass);
          }
        });
      }
    });
  },

  methods: {
    hasMove: function hasMove (el, moveClass) {
      /* istanbul ignore if */
      if (!hasTransition) {
        return false
      }
      /* istanbul ignore if */
      if (this._hasMove) {
        return this._hasMove
      }
      // Detect whether an element with the move class applied has
      // CSS transitions. Since the element may be inside an entering
      // transition at this very moment, we make a clone of it and remove
      // all other transition classes applied to ensure only the move class
      // is applied.
      var clone = el.cloneNode();
      if (el._transitionClasses) {
        el._transitionClasses.forEach(function (cls) { removeClass(clone, cls); });
      }
      addClass(clone, moveClass);
      clone.style.display = 'none';
      this.$el.appendChild(clone);
      var info = getTransitionInfo(clone);
      this.$el.removeChild(clone);
      return (this._hasMove = info.hasTransform)
    }
  }
};

function callPendingCbs (c) {
  /* istanbul ignore if */
  if (c.elm._moveCb) {
    c.elm._moveCb();
  }
  /* istanbul ignore if */
  if (c.elm._enterCb) {
    c.elm._enterCb();
  }
}

function recordPosition (c) {
  c.data.newPos = c.elm.getBoundingClientRect();
}

function applyTranslation (c) {
  var oldPos = c.data.pos;
  var newPos = c.data.newPos;
  var dx = oldPos.left - newPos.left;
  var dy = oldPos.top - newPos.top;
  if (dx || dy) {
    c.data.moved = true;
    var s = c.elm.style;
    s.transform = s.WebkitTransform = "translate(" + dx + "px," + dy + "px)";
    s.transitionDuration = '0s';
  }
}

var platformComponents = {
  Transition: Transition,
  TransitionGroup: TransitionGroup
};

/*  */

// install platform specific utils
Vue.config.mustUseProp = mustUseProp;
Vue.config.isReservedTag = isReservedTag;
Vue.config.isReservedAttr = isReservedAttr;
Vue.config.getTagNamespace = getTagNamespace;
Vue.config.isUnknownElement = isUnknownElement;

// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives);
extend(Vue.options.components, platformComponents);

// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop;

// public mount method
Vue.prototype.$mount = function (
  el,
  hydrating
) {
  el = el && inBrowser ? query(el) : undefined;
  return mountComponent(this, el, hydrating)
};

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(function () {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue);
      } else {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        );
      }
    }
    if (config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        "You are running Vue in development mode.\n" +
        "Make sure to turn on production mode when deploying for production.\n" +
        "See more tips at https://vuejs.org/guide/deployment.html"
      );
    }
  }, 0);
}

/*  */

var defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;

var buildRegex = cached(function (delimiters) {
  var open = delimiters[0].replace(regexEscapeRE, '\\$&');
  var close = delimiters[1].replace(regexEscapeRE, '\\$&');
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
});



function parseText (
  text,
  delimiters
) {
  var tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE;
  if (!tagRE.test(text)) {
    return
  }
  var tokens = [];
  var rawTokens = [];
  var lastIndex = tagRE.lastIndex = 0;
  var match, index, tokenValue;
  while ((match = tagRE.exec(text))) {
    index = match.index;
    // push text token
    if (index > lastIndex) {
      rawTokens.push(tokenValue = text.slice(lastIndex, index));
      tokens.push(JSON.stringify(tokenValue));
    }
    // tag token
    var exp = parseFilters(match[1].trim());
    tokens.push(("_s(" + exp + ")"));
    rawTokens.push({ '@binding': exp });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    rawTokens.push(tokenValue = text.slice(lastIndex));
    tokens.push(JSON.stringify(tokenValue));
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}

/*  */

function transformNode (el, options) {
  var warn = options.warn || baseWarn;
  var staticClass = getAndRemoveAttr(el, 'class');
  if (staticClass) {
    var res = parseText(staticClass, options.delimiters);
    if (res) {
      warn(
        "class=\"" + staticClass + "\": " +
        'Interpolation inside attributes has been removed. ' +
        'Use v-bind or the colon shorthand instead. For example, ' +
        'instead of <div class="{{ val }}">, use <div :class="val">.',
        el.rawAttrsMap['class']
      );
    }
  }
  if (staticClass) {
    el.staticClass = JSON.stringify(staticClass);
  }
  var classBinding = getBindingAttr(el, 'class', false /* getStatic */);
  if (classBinding) {
    el.classBinding = classBinding;
  }
}

function genData (el) {
  var data = '';
  if (el.staticClass) {
    data += "staticClass:" + (el.staticClass) + ",";
  }
  if (el.classBinding) {
    data += "class:" + (el.classBinding) + ",";
  }
  return data
}

var klass$1 = {
  staticKeys: ['staticClass'],
  transformNode: transformNode,
  genData: genData
};

/*  */

function transformNode$1 (el, options) {
  var warn = options.warn || baseWarn;
  var staticStyle = getAndRemoveAttr(el, 'style');
  if (staticStyle) {
    /* istanbul ignore if */
    {
      var res = parseText(staticStyle, options.delimiters);
      if (res) {
        warn(
          "style=\"" + staticStyle + "\": " +
          'Interpolation inside attributes has been removed. ' +
          'Use v-bind or the colon shorthand instead. For example, ' +
          'instead of <div style="{{ val }}">, use <div :style="val">.',
          el.rawAttrsMap['style']
        );
      }
    }
    el.staticStyle = JSON.stringify(parseStyleText(staticStyle));
  }

  var styleBinding = getBindingAttr(el, 'style', false /* getStatic */);
  if (styleBinding) {
    el.styleBinding = styleBinding;
  }
}

function genData$1 (el) {
  var data = '';
  if (el.staticStyle) {
    data += "staticStyle:" + (el.staticStyle) + ",";
  }
  if (el.styleBinding) {
    data += "style:(" + (el.styleBinding) + "),";
  }
  return data
}

var style$1 = {
  staticKeys: ['staticStyle'],
  transformNode: transformNode$1,
  genData: genData$1
};

/*  */

var decoder;

var he = {
  decode: function decode (html) {
    decoder = decoder || document.createElement('div');
    decoder.innerHTML = html;
    return decoder.textContent
  }
};

/*  */

var isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
  'link,meta,param,source,track,wbr'
);

// Elements that you can, intentionally, leave open
// (and which close themselves)
var canBeLeftOpenTag = makeMap(
  'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
);

// HTML5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
// Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
var isNonPhrasingTag = makeMap(
  'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
  'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
  'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
  'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
  'title,tr,track'
);

/**
 * Not type-checking this file because it's mostly vendor code.
 */

// Regular Expressions for parsing tags and attributes
var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
var dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
var ncname = "[a-zA-Z_][\\-\\.0-9_a-zA-Z" + (unicodeRegExp.source) + "]*";
var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
var startTagOpen = new RegExp(("^<" + qnameCapture));
var startTagClose = /^\s*(\/?)>/;
var endTag = new RegExp(("^<\\/" + qnameCapture + "[^>]*>"));
var doctype = /^<!DOCTYPE [^>]+>/i;
// #7298: escape - to avoid being passed as HTML comment when inlined in page
var comment = /^<!\--/;
var conditionalComment = /^<!\[/;

// Special Elements (can contain anything)
var isPlainTextElement = makeMap('script,style,textarea', true);
var reCache = {};

var decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'"
};
var encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
var encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;

// #5992
var isIgnoreNewlineTag = makeMap('pre,textarea', true);
var shouldIgnoreFirstNewline = function (tag, html) { return tag && isIgnoreNewlineTag(tag) && html[0] === '\n'; };

function decodeAttr (value, shouldDecodeNewlines) {
  var re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
  return value.replace(re, function (match) { return decodingMap[match]; })
}

function parseHTML (html, options) {
  var stack = [];
  var expectHTML = options.expectHTML;
  var isUnaryTag$$1 = options.isUnaryTag || no;
  var canBeLeftOpenTag$$1 = options.canBeLeftOpenTag || no;
  var index = 0;
  var last, lastTag;
  while (html) {
    last = html;
    // Make sure we're not in a plaintext content element like script/style
    if (!lastTag || !isPlainTextElement(lastTag)) {
      var textEnd = html.indexOf('<');
      if (textEnd === 0) {
        // Comment:
        if (comment.test(html)) {
          var commentEnd = html.indexOf('-->');

          if (commentEnd >= 0) {
            if (options.shouldKeepComment) {
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3);
            }
            advance(commentEnd + 3);
            continue
          }
        }

        // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
        if (conditionalComment.test(html)) {
          var conditionalEnd = html.indexOf(']>');

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2);
            continue
          }
        }

        // Doctype:
        var doctypeMatch = html.match(doctype);
        if (doctypeMatch) {
          advance(doctypeMatch[0].length);
          continue
        }

        // End tag:
        var endTagMatch = html.match(endTag);
        if (endTagMatch) {
          var curIndex = index;
          advance(endTagMatch[0].length);
          parseEndTag(endTagMatch[1], curIndex, index);
          continue
        }

        // Start tag:
        var startTagMatch = parseStartTag();
        if (startTagMatch) {
          handleStartTag(startTagMatch);
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1);
          }
          continue
        }
      }

      var text = (void 0), rest = (void 0), next = (void 0);
      if (textEnd >= 0) {
        rest = html.slice(textEnd);
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // < in plain text, be forgiving and treat it as text
          next = rest.indexOf('<', 1);
          if (next < 0) { break }
          textEnd += next;
          rest = html.slice(textEnd);
        }
        text = html.substring(0, textEnd);
      }

      if (textEnd < 0) {
        text = html;
      }

      if (text) {
        advance(text.length);
      }

      if (options.chars && text) {
        options.chars(text, index - text.length, index);
      }
    } else {
      var endTagLength = 0;
      var stackedTag = lastTag.toLowerCase();
      var reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'));
      var rest$1 = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length;
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1);
        }
        if (options.chars) {
          options.chars(text);
        }
        return ''
      });
      index += html.length - rest$1.length;
      html = rest$1;
      parseEndTag(stackedTag, index - endTagLength, index);
    }

    if (html === last) {
      options.chars && options.chars(html);
      if (!stack.length && options.warn) {
        options.warn(("Mal-formatted tag at end of template: \"" + html + "\""), { start: index + html.length });
      }
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag();

  function advance (n) {
    index += n;
    html = html.substring(n);
  }

  function parseStartTag () {
    var start = html.match(startTagOpen);
    if (start) {
      var match = {
        tagName: start[1],
        attrs: [],
        start: index
      };
      advance(start[0].length);
      var end, attr;
      while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
        attr.start = index;
        advance(attr[0].length);
        attr.end = index;
        match.attrs.push(attr);
      }
      if (end) {
        match.unarySlash = end[1];
        advance(end[0].length);
        match.end = index;
        return match
      }
    }
  }

  function handleStartTag (match) {
    var tagName = match.tagName;
    var unarySlash = match.unarySlash;

    if (expectHTML) {
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag);
      }
      if (canBeLeftOpenTag$$1(tagName) && lastTag === tagName) {
        parseEndTag(tagName);
      }
    }

    var unary = isUnaryTag$$1(tagName) || !!unarySlash;

    var l = match.attrs.length;
    var attrs = new Array(l);
    for (var i = 0; i < l; i++) {
      var args = match.attrs[i];
      var value = args[3] || args[4] || args[5] || '';
      var shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines;
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines)
      };
      if (options.outputSourceRange) {
        attrs[i].start = args.start + args[0].match(/^\s*/).length;
        attrs[i].end = args.end;
      }
    }

    if (!unary) {
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end });
      lastTag = tagName;
    }

    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end);
    }
  }

  function parseEndTag (tagName, start, end) {
    var pos, lowerCasedTagName;
    if (start == null) { start = index; }
    if (end == null) { end = index; }

    // Find the closest opened tag of the same type
    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase();
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0;
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (var i = stack.length - 1; i >= pos; i--) {
        if (i > pos || !tagName &&
          options.warn
        ) {
          options.warn(
            ("tag <" + (stack[i].tag) + "> has no matching end tag."),
            { start: stack[i].start, end: stack[i].end }
          );
        }
        if (options.end) {
          options.end(stack[i].tag, start, end);
        }
      }

      // Remove the open elements from the stack
      stack.length = pos;
      lastTag = pos && stack[pos - 1].tag;
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end);
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end);
      }
      if (options.end) {
        options.end(tagName, start, end);
      }
    }
  }
}

/*  */

var onRE = /^@|^v-on:/;
var dirRE = /^v-|^@|^:|^#/;
var forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
var forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
var stripParensRE = /^\(|\)$/g;
var dynamicArgRE = /^\[.*\]$/;

var argRE = /:(.*)$/;
var bindRE = /^:|^\.|^v-bind:/;
var modifierRE = /\.[^.\]]+(?=[^\]]*$)/g;

var slotRE = /^v-slot(:|$)|^#/;

var lineBreakRE = /[\r\n]/;
var whitespaceRE$1 = /\s+/g;

var invalidAttributeRE = /[\s"'<>\/=]/;

var decodeHTMLCached = cached(he.decode);

var emptySlotScopeToken = "_empty_";

// configurable state
var warn$2;
var delimiters;
var transforms;
var preTransforms;
var postTransforms;
var platformIsPreTag;
var platformMustUseProp;
var platformGetTagNamespace;
var maybeComponent;

function createASTElement (
  tag,
  attrs,
  parent
) {
  return {
    type: 1,
    tag: tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    rawAttrsMap: {},
    parent: parent,
    children: []
  }
}

/**
 * Convert HTML string to AST.
 */
function parse (
  template,
  options
) {
  warn$2 = options.warn || baseWarn;

  platformIsPreTag = options.isPreTag || no;
  platformMustUseProp = options.mustUseProp || no;
  platformGetTagNamespace = options.getTagNamespace || no;
  var isReservedTag = options.isReservedTag || no;
  maybeComponent = function (el) { return !!el.component || !isReservedTag(el.tag); };

  transforms = pluckModuleFunction(options.modules, 'transformNode');
  preTransforms = pluckModuleFunction(options.modules, 'preTransformNode');
  postTransforms = pluckModuleFunction(options.modules, 'postTransformNode');

  delimiters = options.delimiters;

  var stack = [];
  var preserveWhitespace = options.preserveWhitespace !== false;
  var whitespaceOption = options.whitespace;
  var root;
  var currentParent;
  var inVPre = false;
  var inPre = false;
  var warned = false;

  function warnOnce (msg, range) {
    if (!warned) {
      warned = true;
      warn$2(msg, range);
    }
  }

  function closeElement (element) {
    trimEndingWhitespace(element);
    if (!inVPre && !element.processed) {
      element = processElement(element, options);
    }
    // tree management
    if (!stack.length && element !== root) {
      // allow root elements with v-if, v-else-if and v-else
      if (root.if && (element.elseif || element.else)) {
        {
          checkRootConstraints(element);
        }
        addIfCondition(root, {
          exp: element.elseif,
          block: element
        });
      } else {
        warnOnce(
          "Component template should contain exactly one root element. " +
          "If you are using v-if on multiple elements, " +
          "use v-else-if to chain them instead.",
          { start: element.start }
        );
      }
    }
    if (currentParent && !element.forbidden) {
      if (element.elseif || element.else) {
        processIfConditions(element, currentParent);
      } else {
        if (element.slotScope) {
          // scoped slot
          // keep it in the children list so that v-else(-if) conditions can
          // find it as the prev node.
          var name = element.slotTarget || '"default"'
          ;(currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element;
        }
        currentParent.children.push(element);
        element.parent = currentParent;
      }
    }

    // final children cleanup
    // filter out scoped slots
    element.children = element.children.filter(function (c) { return !(c).slotScope; });
    // remove trailing whitespace node again
    trimEndingWhitespace(element);

    // check pre state
    if (element.pre) {
      inVPre = false;
    }
    if (platformIsPreTag(element.tag)) {
      inPre = false;
    }
    // apply post-transforms
    for (var i = 0; i < postTransforms.length; i++) {
      postTransforms[i](element, options);
    }
  }

  function trimEndingWhitespace (el) {
    // remove trailing whitespace node
    if (!inPre) {
      var lastNode;
      while (
        (lastNode = el.children[el.children.length - 1]) &&
        lastNode.type === 3 &&
        lastNode.text === ' '
      ) {
        el.children.pop();
      }
    }
  }

  function checkRootConstraints (el) {
    if (el.tag === 'slot' || el.tag === 'template') {
      warnOnce(
        "Cannot use <" + (el.tag) + "> as component root element because it may " +
        'contain multiple nodes.',
        { start: el.start }
      );
    }
    if (el.attrsMap.hasOwnProperty('v-for')) {
      warnOnce(
        'Cannot use v-for on stateful component root element because ' +
        'it renders multiple elements.',
        el.rawAttrsMap['v-for']
      );
    }
  }

  parseHTML(template, {
    warn: warn$2,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    outputSourceRange: options.outputSourceRange,
    start: function start (tag, attrs, unary, start$1, end) {
      // check namespace.
      // inherit parent ns if there is one
      var ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag);

      // handle IE svg bug
      /* istanbul ignore if */
      if (isIE && ns === 'svg') {
        attrs = guardIESVGBug(attrs);
      }

      var element = createASTElement(tag, attrs, currentParent);
      if (ns) {
        element.ns = ns;
      }

      {
        if (options.outputSourceRange) {
          element.start = start$1;
          element.end = end;
          element.rawAttrsMap = element.attrsList.reduce(function (cumulated, attr) {
            cumulated[attr.name] = attr;
            return cumulated
          }, {});
        }
        attrs.forEach(function (attr) {
          if (invalidAttributeRE.test(attr.name)) {
            warn$2(
              "Invalid dynamic argument expression: attribute names cannot contain " +
              "spaces, quotes, <, >, / or =.",
              {
                start: attr.start + attr.name.indexOf("["),
                end: attr.start + attr.name.length
              }
            );
          }
        });
      }

      if (isForbiddenTag(element) && !isServerRendering()) {
        element.forbidden = true;
        warn$2(
          'Templates should only be responsible for mapping the state to the ' +
          'UI. Avoid placing tags with side-effects in your templates, such as ' +
          "<" + tag + ">" + ', as they will not be parsed.',
          { start: element.start }
        );
      }

      // apply pre-transforms
      for (var i = 0; i < preTransforms.length; i++) {
        element = preTransforms[i](element, options) || element;
      }

      if (!inVPre) {
        processPre(element);
        if (element.pre) {
          inVPre = true;
        }
      }
      if (platformIsPreTag(element.tag)) {
        inPre = true;
      }
      if (inVPre) {
        processRawAttrs(element);
      } else if (!element.processed) {
        // structural directives
        processFor(element);
        processIf(element);
        processOnce(element);
      }

      if (!root) {
        root = element;
        {
          checkRootConstraints(root);
        }
      }

      if (!unary) {
        currentParent = element;
        stack.push(element);
      } else {
        closeElement(element);
      }
    },

    end: function end (tag, start, end$1) {
      var element = stack[stack.length - 1];
      // pop stack
      stack.length -= 1;
      currentParent = stack[stack.length - 1];
      if (options.outputSourceRange) {
        element.end = end$1;
      }
      closeElement(element);
    },

    chars: function chars (text, start, end) {
      if (!currentParent) {
        {
          if (text === template) {
            warnOnce(
              'Component template requires a root element, rather than just text.',
              { start: start }
            );
          } else if ((text = text.trim())) {
            warnOnce(
              ("text \"" + text + "\" outside root element will be ignored."),
              { start: start }
            );
          }
        }
        return
      }
      // IE textarea placeholder bug
      /* istanbul ignore if */
      if (isIE &&
        currentParent.tag === 'textarea' &&
        currentParent.attrsMap.placeholder === text
      ) {
        return
      }
      var children = currentParent.children;
      if (inPre || text.trim()) {
        text = isTextTag(currentParent) ? text : decodeHTMLCached(text);
      } else if (!children.length) {
        // remove the whitespace-only node right after an opening tag
        text = '';
      } else if (whitespaceOption) {
        if (whitespaceOption === 'condense') {
          // in condense mode, remove the whitespace node if it contains
          // line break, otherwise condense to a single space
          text = lineBreakRE.test(text) ? '' : ' ';
        } else {
          text = ' ';
        }
      } else {
        text = preserveWhitespace ? ' ' : '';
      }
      if (text) {
        if (!inPre && whitespaceOption === 'condense') {
          // condense consecutive whitespaces into single space
          text = text.replace(whitespaceRE$1, ' ');
        }
        var res;
        var child;
        if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
          child = {
            type: 2,
            expression: res.expression,
            tokens: res.tokens,
            text: text
          };
        } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
          child = {
            type: 3,
            text: text
          };
        }
        if (child) {
          if (options.outputSourceRange) {
            child.start = start;
            child.end = end;
          }
          children.push(child);
        }
      }
    },
    comment: function comment (text, start, end) {
      // adding anyting as a sibling to the root node is forbidden
      // comments should still be allowed, but ignored
      if (currentParent) {
        var child = {
          type: 3,
          text: text,
          isComment: true
        };
        if (options.outputSourceRange) {
          child.start = start;
          child.end = end;
        }
        currentParent.children.push(child);
      }
    }
  });
  return root
}

function processPre (el) {
  if (getAndRemoveAttr(el, 'v-pre') != null) {
    el.pre = true;
  }
}

function processRawAttrs (el) {
  var list = el.attrsList;
  var len = list.length;
  if (len) {
    var attrs = el.attrs = new Array(len);
    for (var i = 0; i < len; i++) {
      attrs[i] = {
        name: list[i].name,
        value: JSON.stringify(list[i].value)
      };
      if (list[i].start != null) {
        attrs[i].start = list[i].start;
        attrs[i].end = list[i].end;
      }
    }
  } else if (!el.pre) {
    // non root node in pre blocks with no attributes
    el.plain = true;
  }
}

function processElement (
  element,
  options
) {
  processKey(element);

  // determine whether this is a plain element after
  // removing structural attributes
  element.plain = (
    !element.key &&
    !element.scopedSlots &&
    !element.attrsList.length
  );

  processRef(element);
  processSlotContent(element);
  processSlotOutlet(element);
  processComponent(element);
  for (var i = 0; i < transforms.length; i++) {
    element = transforms[i](element, options) || element;
  }
  processAttrs(element);
  return element
}

function processKey (el) {
  var exp = getBindingAttr(el, 'key');
  if (exp) {
    {
      if (el.tag === 'template') {
        warn$2(
          "<template> cannot be keyed. Place the key on real elements instead.",
          getRawBindingAttr(el, 'key')
        );
      }
      if (el.for) {
        var iterator = el.iterator2 || el.iterator1;
        var parent = el.parent;
        if (iterator && iterator === exp && parent && parent.tag === 'transition-group') {
          warn$2(
            "Do not use v-for index as key on <transition-group> children, " +
            "this is the same as not using keys.",
            getRawBindingAttr(el, 'key'),
            true /* tip */
          );
        }
      }
    }
    el.key = exp;
  }
}

function processRef (el) {
  var ref = getBindingAttr(el, 'ref');
  if (ref) {
    el.ref = ref;
    el.refInFor = checkInFor(el);
  }
}

function processFor (el) {
  var exp;
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    var res = parseFor(exp);
    if (res) {
      extend(el, res);
    } else {
      warn$2(
        ("Invalid v-for expression: " + exp),
        el.rawAttrsMap['v-for']
      );
    }
  }
}



function parseFor (exp) {
  var inMatch = exp.match(forAliasRE);
  if (!inMatch) { return }
  var res = {};
  res.for = inMatch[2].trim();
  var alias = inMatch[1].trim().replace(stripParensRE, '');
  var iteratorMatch = alias.match(forIteratorRE);
  if (iteratorMatch) {
    res.alias = alias.replace(forIteratorRE, '').trim();
    res.iterator1 = iteratorMatch[1].trim();
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim();
    }
  } else {
    res.alias = alias;
  }
  return res
}

function processIf (el) {
  var exp = getAndRemoveAttr(el, 'v-if');
  if (exp) {
    el.if = exp;
    addIfCondition(el, {
      exp: exp,
      block: el
    });
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true;
    }
    var elseif = getAndRemoveAttr(el, 'v-else-if');
    if (elseif) {
      el.elseif = elseif;
    }
  }
}

function processIfConditions (el, parent) {
  var prev = findPrevElement(parent.children);
  if (prev && prev.if) {
    addIfCondition(prev, {
      exp: el.elseif,
      block: el
    });
  } else {
    warn$2(
      "v-" + (el.elseif ? ('else-if="' + el.elseif + '"') : 'else') + " " +
      "used on element <" + (el.tag) + "> without corresponding v-if.",
      el.rawAttrsMap[el.elseif ? 'v-else-if' : 'v-else']
    );
  }
}

function findPrevElement (children) {
  var i = children.length;
  while (i--) {
    if (children[i].type === 1) {
      return children[i]
    } else {
      if (children[i].text !== ' ') {
        warn$2(
          "text \"" + (children[i].text.trim()) + "\" between v-if and v-else(-if) " +
          "will be ignored.",
          children[i]
        );
      }
      children.pop();
    }
  }
}

function addIfCondition (el, condition) {
  if (!el.ifConditions) {
    el.ifConditions = [];
  }
  el.ifConditions.push(condition);
}

function processOnce (el) {
  var once$$1 = getAndRemoveAttr(el, 'v-once');
  if (once$$1 != null) {
    el.once = true;
  }
}

// handle content being passed to a component as slot,
// e.g. <template slot="xxx">, <div slot-scope="xxx">
function processSlotContent (el) {
  var slotScope;
  if (el.tag === 'template') {
    slotScope = getAndRemoveAttr(el, 'scope');
    /* istanbul ignore if */
    if (slotScope) {
      warn$2(
        "the \"scope\" attribute for scoped slots have been deprecated and " +
        "replaced by \"slot-scope\" since 2.5. The new \"slot-scope\" attribute " +
        "can also be used on plain elements in addition to <template> to " +
        "denote scoped slots.",
        el.rawAttrsMap['scope'],
        true
      );
    }
    el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope');
  } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {
    /* istanbul ignore if */
    if (el.attrsMap['v-for']) {
      warn$2(
        "Ambiguous combined usage of slot-scope and v-for on <" + (el.tag) + "> " +
        "(v-for takes higher priority). Use a wrapper <template> for the " +
        "scoped slot to make it clearer.",
        el.rawAttrsMap['slot-scope'],
        true
      );
    }
    el.slotScope = slotScope;
  }

  // slot="xxx"
  var slotTarget = getBindingAttr(el, 'slot');
  if (slotTarget) {
    el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget;
    el.slotTargetDynamic = !!(el.attrsMap[':slot'] || el.attrsMap['v-bind:slot']);
    // preserve slot as an attribute for native shadow DOM compat
    // only for non-scoped slots.
    if (el.tag !== 'template' && !el.slotScope) {
      addAttr(el, 'slot', slotTarget, getRawBindingAttr(el, 'slot'));
    }
  }

  // 2.6 v-slot syntax
  {
    if (el.tag === 'template') {
      // v-slot on <template>
      var slotBinding = getAndRemoveAttrByRegex(el, slotRE);
      if (slotBinding) {
        {
          if (el.slotTarget || el.slotScope) {
            warn$2(
              "Unexpected mixed usage of different slot syntaxes.",
              el
            );
          }
          if (el.parent && !maybeComponent(el.parent)) {
            warn$2(
              "<template v-slot> can only appear at the root level inside " +
              "the receiving component",
              el
            );
          }
        }
        var ref = getSlotName(slotBinding);
        var name = ref.name;
        var dynamic = ref.dynamic;
        el.slotTarget = name;
        el.slotTargetDynamic = dynamic;
        el.slotScope = slotBinding.value || emptySlotScopeToken; // force it into a scoped slot for perf
      }
    } else {
      // v-slot on component, denotes default slot
      var slotBinding$1 = getAndRemoveAttrByRegex(el, slotRE);
      if (slotBinding$1) {
        {
          if (!maybeComponent(el)) {
            warn$2(
              "v-slot can only be used on components or <template>.",
              slotBinding$1
            );
          }
          if (el.slotScope || el.slotTarget) {
            warn$2(
              "Unexpected mixed usage of different slot syntaxes.",
              el
            );
          }
          if (el.scopedSlots) {
            warn$2(
              "To avoid scope ambiguity, the default slot should also use " +
              "<template> syntax when there are other named slots.",
              slotBinding$1
            );
          }
        }
        // add the component's children to its default slot
        var slots = el.scopedSlots || (el.scopedSlots = {});
        var ref$1 = getSlotName(slotBinding$1);
        var name$1 = ref$1.name;
        var dynamic$1 = ref$1.dynamic;
        var slotContainer = slots[name$1] = createASTElement('template', [], el);
        slotContainer.slotTarget = name$1;
        slotContainer.slotTargetDynamic = dynamic$1;
        slotContainer.children = el.children.filter(function (c) {
          if (!c.slotScope) {
            c.parent = slotContainer;
            return true
          }
        });
        slotContainer.slotScope = slotBinding$1.value || emptySlotScopeToken;
        // remove children as they are returned from scopedSlots now
        el.children = [];
        // mark el non-plain so data gets generated
        el.plain = false;
      }
    }
  }
}

function getSlotName (binding) {
  var name = binding.name.replace(slotRE, '');
  if (!name) {
    if (binding.name[0] !== '#') {
      name = 'default';
    } else {
      warn$2(
        "v-slot shorthand syntax requires a slot name.",
        binding
      );
    }
  }
  return dynamicArgRE.test(name)
    // dynamic [name]
    ? { name: name.slice(1, -1), dynamic: true }
    // static name
    : { name: ("\"" + name + "\""), dynamic: false }
}

// handle <slot/> outlets
function processSlotOutlet (el) {
  if (el.tag === 'slot') {
    el.slotName = getBindingAttr(el, 'name');
    if (el.key) {
      warn$2(
        "`key` does not work on <slot> because slots are abstract outlets " +
        "and can possibly expand into multiple elements. " +
        "Use the key on a wrapping element instead.",
        getRawBindingAttr(el, 'key')
      );
    }
  }
}

function processComponent (el) {
  var binding;
  if ((binding = getBindingAttr(el, 'is'))) {
    el.component = binding;
  }
  if (getAndRemoveAttr(el, 'inline-template') != null) {
    el.inlineTemplate = true;
  }
}

function processAttrs (el) {
  var list = el.attrsList;
  var i, l, name, rawName, value, modifiers, syncGen, isDynamic;
  for (i = 0, l = list.length; i < l; i++) {
    name = rawName = list[i].name;
    value = list[i].value;
    if (dirRE.test(name)) {
      // mark element as dynamic
      el.hasBindings = true;
      // modifiers
      modifiers = parseModifiers(name.replace(dirRE, ''));
      // support .foo shorthand syntax for the .prop modifier
      if (modifiers) {
        name = name.replace(modifierRE, '');
      }
      if (bindRE.test(name)) { // v-bind
        name = name.replace(bindRE, '');
        value = parseFilters(value);
        isDynamic = dynamicArgRE.test(name);
        if (isDynamic) {
          name = name.slice(1, -1);
        }
        if (
          value.trim().length === 0
        ) {
          warn$2(
            ("The value for a v-bind expression cannot be empty. Found in \"v-bind:" + name + "\"")
          );
        }
        if (modifiers) {
          if (modifiers.prop && !isDynamic) {
            name = camelize(name);
            if (name === 'innerHtml') { name = 'innerHTML'; }
          }
          if (modifiers.camel && !isDynamic) {
            name = camelize(name);
          }
          if (modifiers.sync) {
            syncGen = genAssignmentCode(value, "$event");
            if (!isDynamic) {
              addHandler(
                el,
                ("update:" + (camelize(name))),
                syncGen,
                null,
                false,
                warn$2,
                list[i]
              );
              if (hyphenate(name) !== camelize(name)) {
                addHandler(
                  el,
                  ("update:" + (hyphenate(name))),
                  syncGen,
                  null,
                  false,
                  warn$2,
                  list[i]
                );
              }
            } else {
              // handler w/ dynamic event name
              addHandler(
                el,
                ("\"update:\"+(" + name + ")"),
                syncGen,
                null,
                false,
                warn$2,
                list[i],
                true // dynamic
              );
            }
          }
        }
        if ((modifiers && modifiers.prop) || (
          !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
        )) {
          addProp(el, name, value, list[i], isDynamic);
        } else {
          addAttr(el, name, value, list[i], isDynamic);
        }
      } else if (onRE.test(name)) { // v-on
        name = name.replace(onRE, '');
        isDynamic = dynamicArgRE.test(name);
        if (isDynamic) {
          name = name.slice(1, -1);
        }
        addHandler(el, name, value, modifiers, false, warn$2, list[i], isDynamic);
      } else { // normal directives
        name = name.replace(dirRE, '');
        // parse arg
        var argMatch = name.match(argRE);
        var arg = argMatch && argMatch[1];
        isDynamic = false;
        if (arg) {
          name = name.slice(0, -(arg.length + 1));
          if (dynamicArgRE.test(arg)) {
            arg = arg.slice(1, -1);
            isDynamic = true;
          }
        }
        addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i]);
        if (name === 'model') {
          checkForAliasModel(el, value);
        }
      }
    } else {
      // literal attribute
      {
        var res = parseText(value, delimiters);
        if (res) {
          warn$2(
            name + "=\"" + value + "\": " +
            'Interpolation inside attributes has been removed. ' +
            'Use v-bind or the colon shorthand instead. For example, ' +
            'instead of <div id="{{ val }}">, use <div :id="val">.',
            list[i]
          );
        }
      }
      addAttr(el, name, JSON.stringify(value), list[i]);
      // #6887 firefox doesn't update muted state if set via attribute
      // even immediately after element creation
      if (!el.component &&
          name === 'muted' &&
          platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true', list[i]);
      }
    }
  }
}

function checkInFor (el) {
  var parent = el;
  while (parent) {
    if (parent.for !== undefined) {
      return true
    }
    parent = parent.parent;
  }
  return false
}

function parseModifiers (name) {
  var match = name.match(modifierRE);
  if (match) {
    var ret = {};
    match.forEach(function (m) { ret[m.slice(1)] = true; });
    return ret
  }
}

function makeAttrsMap (attrs) {
  var map = {};
  for (var i = 0, l = attrs.length; i < l; i++) {
    if (
      map[attrs[i].name] && !isIE && !isEdge
    ) {
      warn$2('duplicate attribute: ' + attrs[i].name, attrs[i]);
    }
    map[attrs[i].name] = attrs[i].value;
  }
  return map
}

// for script (e.g. type="x/template") or style, do not decode content
function isTextTag (el) {
  return el.tag === 'script' || el.tag === 'style'
}

function isForbiddenTag (el) {
  return (
    el.tag === 'style' ||
    (el.tag === 'script' && (
      !el.attrsMap.type ||
      el.attrsMap.type === 'text/javascript'
    ))
  )
}

var ieNSBug = /^xmlns:NS\d+/;
var ieNSPrefix = /^NS\d+:/;

/* istanbul ignore next */
function guardIESVGBug (attrs) {
  var res = [];
  for (var i = 0; i < attrs.length; i++) {
    var attr = attrs[i];
    if (!ieNSBug.test(attr.name)) {
      attr.name = attr.name.replace(ieNSPrefix, '');
      res.push(attr);
    }
  }
  return res
}

function checkForAliasModel (el, value) {
  var _el = el;
  while (_el) {
    if (_el.for && _el.alias === value) {
      warn$2(
        "<" + (el.tag) + " v-model=\"" + value + "\">: " +
        "You are binding v-model directly to a v-for iteration alias. " +
        "This will not be able to modify the v-for source array because " +
        "writing to the alias is like modifying a function local variable. " +
        "Consider using an array of objects and use v-model on an object property instead.",
        el.rawAttrsMap['v-model']
      );
    }
    _el = _el.parent;
  }
}

/*  */

function preTransformNode (el, options) {
  if (el.tag === 'input') {
    var map = el.attrsMap;
    if (!map['v-model']) {
      return
    }

    var typeBinding;
    if (map[':type'] || map['v-bind:type']) {
      typeBinding = getBindingAttr(el, 'type');
    }
    if (!map.type && !typeBinding && map['v-bind']) {
      typeBinding = "(" + (map['v-bind']) + ").type";
    }

    if (typeBinding) {
      var ifCondition = getAndRemoveAttr(el, 'v-if', true);
      var ifConditionExtra = ifCondition ? ("&&(" + ifCondition + ")") : "";
      var hasElse = getAndRemoveAttr(el, 'v-else', true) != null;
      var elseIfCondition = getAndRemoveAttr(el, 'v-else-if', true);
      // 1. checkbox
      var branch0 = cloneASTElement(el);
      // process for on the main node
      processFor(branch0);
      addRawAttr(branch0, 'type', 'checkbox');
      processElement(branch0, options);
      branch0.processed = true; // prevent it from double-processed
      branch0.if = "(" + typeBinding + ")==='checkbox'" + ifConditionExtra;
      addIfCondition(branch0, {
        exp: branch0.if,
        block: branch0
      });
      // 2. add radio else-if condition
      var branch1 = cloneASTElement(el);
      getAndRemoveAttr(branch1, 'v-for', true);
      addRawAttr(branch1, 'type', 'radio');
      processElement(branch1, options);
      addIfCondition(branch0, {
        exp: "(" + typeBinding + ")==='radio'" + ifConditionExtra,
        block: branch1
      });
      // 3. other
      var branch2 = cloneASTElement(el);
      getAndRemoveAttr(branch2, 'v-for', true);
      addRawAttr(branch2, ':type', typeBinding);
      processElement(branch2, options);
      addIfCondition(branch0, {
        exp: ifCondition,
        block: branch2
      });

      if (hasElse) {
        branch0.else = true;
      } else if (elseIfCondition) {
        branch0.elseif = elseIfCondition;
      }

      return branch0
    }
  }
}

function cloneASTElement (el) {
  return createASTElement(el.tag, el.attrsList.slice(), el.parent)
}

var model$1 = {
  preTransformNode: preTransformNode
};

var modules$1 = [
  klass$1,
  style$1,
  model$1
];

/*  */

function text (el, dir) {
  if (dir.value) {
    addProp(el, 'textContent', ("_s(" + (dir.value) + ")"), dir);
  }
}

/*  */

function html (el, dir) {
  if (dir.value) {
    addProp(el, 'innerHTML', ("_s(" + (dir.value) + ")"), dir);
  }
}

var directives$1 = {
  model: model,
  text: text,
  html: html
};

/*  */

var baseOptions = {
  expectHTML: true,
  modules: modules$1,
  directives: directives$1,
  isPreTag: isPreTag,
  isUnaryTag: isUnaryTag,
  mustUseProp: mustUseProp,
  canBeLeftOpenTag: canBeLeftOpenTag,
  isReservedTag: isReservedTag,
  getTagNamespace: getTagNamespace,
  staticKeys: genStaticKeys(modules$1)
};

/*  */

var isStaticKey;
var isPlatformReservedTag;

var genStaticKeysCached = cached(genStaticKeys$1);

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 */
function optimize (root, options) {
  if (!root) { return }
  isStaticKey = genStaticKeysCached(options.staticKeys || '');
  isPlatformReservedTag = options.isReservedTag || no;
  // first pass: mark all non-static nodes.
  markStatic$1(root);
  // second pass: mark static roots.
  markStaticRoots(root, false);
}

function genStaticKeys$1 (keys) {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

function markStatic$1 (node) {
  node.static = isStatic(node);
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }
    for (var i = 0, l = node.children.length; i < l; i++) {
      var child = node.children[i];
      markStatic$1(child);
      if (!child.static) {
        node.static = false;
      }
    }
    if (node.ifConditions) {
      for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
        var block = node.ifConditions[i$1].block;
        markStatic$1(block);
        if (!block.static) {
          node.static = false;
        }
      }
    }
  }
}

function markStaticRoots (node, isInFor) {
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor;
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true;
      return
    } else {
      node.staticRoot = false;
    }
    if (node.children) {
      for (var i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for);
      }
    }
    if (node.ifConditions) {
      for (var i$1 = 1, l$1 = node.ifConditions.length; i$1 < l$1; i$1++) {
        markStaticRoots(node.ifConditions[i$1].block, isInFor);
      }
    }
  }
}

function isStatic (node) {
  if (node.type === 2) { // expression
    return false
  }
  if (node.type === 3) { // text
    return true
  }
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in
    isPlatformReservedTag(node.tag) && // not a component
    !isDirectChildOfTemplateFor(node) &&
    Object.keys(node).every(isStaticKey)
  ))
}

function isDirectChildOfTemplateFor (node) {
  while (node.parent) {
    node = node.parent;
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}

/*  */

var fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/;
var fnInvokeRE = /\([^)]*?\);*$/;
var simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;

// KeyboardEvent.keyCode aliases
var keyCodes = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  up: 38,
  left: 37,
  right: 39,
  down: 40,
  'delete': [8, 46]
};

// KeyboardEvent.key aliases
var keyNames = {
  // #7880: IE11 and Edge use `Esc` for Escape key name.
  esc: ['Esc', 'Escape'],
  tab: 'Tab',
  enter: 'Enter',
  // #9112: IE11 uses `Spacebar` for Space key name.
  space: [' ', 'Spacebar'],
  // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
  up: ['Up', 'ArrowUp'],
  left: ['Left', 'ArrowLeft'],
  right: ['Right', 'ArrowRight'],
  down: ['Down', 'ArrowDown'],
  // #9112: IE11 uses `Del` for Delete key name.
  'delete': ['Backspace', 'Delete', 'Del']
};

// #4868: modifiers that prevent the execution of the listener
// need to explicitly return null so that we can determine whether to remove
// the listener for .once
var genGuard = function (condition) { return ("if(" + condition + ")return null;"); };

var modifierCode = {
  stop: '$event.stopPropagation();',
  prevent: '$event.preventDefault();',
  self: genGuard("$event.target !== $event.currentTarget"),
  ctrl: genGuard("!$event.ctrlKey"),
  shift: genGuard("!$event.shiftKey"),
  alt: genGuard("!$event.altKey"),
  meta: genGuard("!$event.metaKey"),
  left: genGuard("'button' in $event && $event.button !== 0"),
  middle: genGuard("'button' in $event && $event.button !== 1"),
  right: genGuard("'button' in $event && $event.button !== 2")
};

function genHandlers (
  events,
  isNative
) {
  var prefix = isNative ? 'nativeOn:' : 'on:';
  var staticHandlers = "";
  var dynamicHandlers = "";
  for (var name in events) {
    var handlerCode = genHandler(events[name]);
    if (events[name] && events[name].dynamic) {
      dynamicHandlers += name + "," + handlerCode + ",";
    } else {
      staticHandlers += "\"" + name + "\":" + handlerCode + ",";
    }
  }
  staticHandlers = "{" + (staticHandlers.slice(0, -1)) + "}";
  if (dynamicHandlers) {
    return prefix + "_d(" + staticHandlers + ",[" + (dynamicHandlers.slice(0, -1)) + "])"
  } else {
    return prefix + staticHandlers
  }
}

function genHandler (handler) {
  if (!handler) {
    return 'function(){}'
  }

  if (Array.isArray(handler)) {
    return ("[" + (handler.map(function (handler) { return genHandler(handler); }).join(',')) + "]")
  }

  var isMethodPath = simplePathRE.test(handler.value);
  var isFunctionExpression = fnExpRE.test(handler.value);
  var isFunctionInvocation = simplePathRE.test(handler.value.replace(fnInvokeRE, ''));

  if (!handler.modifiers) {
    if (isMethodPath || isFunctionExpression) {
      return handler.value
    }
    return ("function($event){" + (isFunctionInvocation ? ("return " + (handler.value)) : handler.value) + "}") // inline statement
  } else {
    var code = '';
    var genModifierCode = '';
    var keys = [];
    for (var key in handler.modifiers) {
      if (modifierCode[key]) {
        genModifierCode += modifierCode[key];
        // left/right
        if (keyCodes[key]) {
          keys.push(key);
        }
      } else if (key === 'exact') {
        var modifiers = (handler.modifiers);
        genModifierCode += genGuard(
          ['ctrl', 'shift', 'alt', 'meta']
            .filter(function (keyModifier) { return !modifiers[keyModifier]; })
            .map(function (keyModifier) { return ("$event." + keyModifier + "Key"); })
            .join('||')
        );
      } else {
        keys.push(key);
      }
    }
    if (keys.length) {
      code += genKeyFilter(keys);
    }
    // Make sure modifiers like prevent and stop get executed after key filtering
    if (genModifierCode) {
      code += genModifierCode;
    }
    var handlerCode = isMethodPath
      ? ("return " + (handler.value) + "($event)")
      : isFunctionExpression
        ? ("return (" + (handler.value) + ")($event)")
        : isFunctionInvocation
          ? ("return " + (handler.value))
          : handler.value;
    return ("function($event){" + code + handlerCode + "}")
  }
}

function genKeyFilter (keys) {
  return (
    // make sure the key filters only apply to KeyboardEvents
    // #9441: can't use 'keyCode' in $event because Chrome autofill fires fake
    // key events that do not have keyCode property...
    "if(!$event.type.indexOf('key')&&" +
    (keys.map(genFilterCode).join('&&')) + ")return null;"
  )
}

function genFilterCode (key) {
  var keyVal = parseInt(key, 10);
  if (keyVal) {
    return ("$event.keyCode!==" + keyVal)
  }
  var keyCode = keyCodes[key];
  var keyName = keyNames[key];
  return (
    "_k($event.keyCode," +
    (JSON.stringify(key)) + "," +
    (JSON.stringify(keyCode)) + "," +
    "$event.key," +
    "" + (JSON.stringify(keyName)) +
    ")"
  )
}

/*  */

function on (el, dir) {
  if (dir.modifiers) {
    warn("v-on without argument does not support modifiers.");
  }
  el.wrapListeners = function (code) { return ("_g(" + code + "," + (dir.value) + ")"); };
}

/*  */

function bind$1 (el, dir) {
  el.wrapData = function (code) {
    return ("_b(" + code + ",'" + (el.tag) + "'," + (dir.value) + "," + (dir.modifiers && dir.modifiers.prop ? 'true' : 'false') + (dir.modifiers && dir.modifiers.sync ? ',true' : '') + ")")
  };
}

/*  */

var baseDirectives = {
  on: on,
  bind: bind$1,
  cloak: noop
};

/*  */





var CodegenState = function CodegenState (options) {
  this.options = options;
  this.warn = options.warn || baseWarn;
  this.transforms = pluckModuleFunction(options.modules, 'transformCode');
  this.dataGenFns = pluckModuleFunction(options.modules, 'genData');
  this.directives = extend(extend({}, baseDirectives), options.directives);
  var isReservedTag = options.isReservedTag || no;
  this.maybeComponent = function (el) { return !!el.component || !isReservedTag(el.tag); };
  this.onceId = 0;
  this.staticRenderFns = [];
  this.pre = false;
};



function generate (
  ast,
  options
) {
  var state = new CodegenState(options);
  var code = ast ? genElement(ast, state) : '_c("div")';
  return {
    render: ("with(this){return " + code + "}"),
    staticRenderFns: state.staticRenderFns
  }
}

function genElement (el, state) {
  if (el.parent) {
    el.pre = el.pre || el.parent.pre;
  }

  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state)
  } else if (el.once && !el.onceProcessed) {
    return genOnce(el, state)
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state)
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {
    return genChildren(el, state) || 'void 0'
  } else if (el.tag === 'slot') {
    return genSlot(el, state)
  } else {
    // component or element
    var code;
    if (el.component) {
      code = genComponent(el.component, el, state);
    } else {
      var data;
      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        data = genData$2(el, state);
      }

      var children = el.inlineTemplate ? null : genChildren(el, state, true);
      code = "_c('" + (el.tag) + "'" + (data ? ("," + data) : '') + (children ? ("," + children) : '') + ")";
    }
    // module transforms
    for (var i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code);
    }
    return code
  }
}

// hoist static sub-trees out
function genStatic (el, state) {
  el.staticProcessed = true;
  // Some elements (templates) need to behave differently inside of a v-pre
  // node.  All pre nodes are static roots, so we can use this as a location to
  // wrap a state change and reset it upon exiting the pre node.
  var originalPreState = state.pre;
  if (el.pre) {
    state.pre = el.pre;
  }
  state.staticRenderFns.push(("with(this){return " + (genElement(el, state)) + "}"));
  state.pre = originalPreState;
  return ("_m(" + (state.staticRenderFns.length - 1) + (el.staticInFor ? ',true' : '') + ")")
}

// v-once
function genOnce (el, state) {
  el.onceProcessed = true;
  if (el.if && !el.ifProcessed) {
    return genIf(el, state)
  } else if (el.staticInFor) {
    var key = '';
    var parent = el.parent;
    while (parent) {
      if (parent.for) {
        key = parent.key;
        break
      }
      parent = parent.parent;
    }
    if (!key) {
      state.warn(
        "v-once can only be used inside v-for that is keyed. ",
        el.rawAttrsMap['v-once']
      );
      return genElement(el, state)
    }
    return ("_o(" + (genElement(el, state)) + "," + (state.onceId++) + "," + key + ")")
  } else {
    return genStatic(el, state)
  }
}

function genIf (
  el,
  state,
  altGen,
  altEmpty
) {
  el.ifProcessed = true; // avoid recursion
  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
}

function genIfConditions (
  conditions,
  state,
  altGen,
  altEmpty
) {
  if (!conditions.length) {
    return altEmpty || '_e()'
  }

  var condition = conditions.shift();
  if (condition.exp) {
    return ("(" + (condition.exp) + ")?" + (genTernaryExp(condition.block)) + ":" + (genIfConditions(conditions, state, altGen, altEmpty)))
  } else {
    return ("" + (genTernaryExp(condition.block)))
  }

  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp (el) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state)
  }
}

function genFor (
  el,
  state,
  altGen,
  altHelper
) {
  var exp = el.for;
  var alias = el.alias;
  var iterator1 = el.iterator1 ? ("," + (el.iterator1)) : '';
  var iterator2 = el.iterator2 ? ("," + (el.iterator2)) : '';

  if (state.maybeComponent(el) &&
    el.tag !== 'slot' &&
    el.tag !== 'template' &&
    !el.key
  ) {
    state.warn(
      "<" + (el.tag) + " v-for=\"" + alias + " in " + exp + "\">: component lists rendered with " +
      "v-for should have explicit keys. " +
      "See https://vuejs.org/guide/list.html#key for more info.",
      el.rawAttrsMap['v-for'],
      true /* tip */
    );
  }

  el.forProcessed = true; // avoid recursion
  return (altHelper || '_l') + "((" + exp + ")," +
    "function(" + alias + iterator1 + iterator2 + "){" +
      "return " + ((altGen || genElement)(el, state)) +
    '})'
}

function genData$2 (el, state) {
  var data = '{';

  // directives first.
  // directives may mutate the el's other properties before they are generated.
  var dirs = genDirectives(el, state);
  if (dirs) { data += dirs + ','; }

  // key
  if (el.key) {
    data += "key:" + (el.key) + ",";
  }
  // ref
  if (el.ref) {
    data += "ref:" + (el.ref) + ",";
  }
  if (el.refInFor) {
    data += "refInFor:true,";
  }
  // pre
  if (el.pre) {
    data += "pre:true,";
  }
  // record original tag name for components using "is" attribute
  if (el.component) {
    data += "tag:\"" + (el.tag) + "\",";
  }
  // module data generation functions
  for (var i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el);
  }
  // attributes
  if (el.attrs) {
    data += "attrs:" + (genProps(el.attrs)) + ",";
  }
  // DOM props
  if (el.props) {
    data += "domProps:" + (genProps(el.props)) + ",";
  }
  // event handlers
  if (el.events) {
    data += (genHandlers(el.events, false)) + ",";
  }
  if (el.nativeEvents) {
    data += (genHandlers(el.nativeEvents, true)) + ",";
  }
  // slot target
  // only for non-scoped slots
  if (el.slotTarget && !el.slotScope) {
    data += "slot:" + (el.slotTarget) + ",";
  }
  // scoped slots
  if (el.scopedSlots) {
    data += (genScopedSlots(el, el.scopedSlots, state)) + ",";
  }
  // component v-model
  if (el.model) {
    data += "model:{value:" + (el.model.value) + ",callback:" + (el.model.callback) + ",expression:" + (el.model.expression) + "},";
  }
  // inline-template
  if (el.inlineTemplate) {
    var inlineTemplate = genInlineTemplate(el, state);
    if (inlineTemplate) {
      data += inlineTemplate + ",";
    }
  }
  data = data.replace(/,$/, '') + '}';
  // v-bind dynamic argument wrap
  // v-bind with dynamic arguments must be applied using the same v-bind object
  // merge helper so that class/style/mustUseProp attrs are handled correctly.
  if (el.dynamicAttrs) {
    data = "_b(" + data + ",\"" + (el.tag) + "\"," + (genProps(el.dynamicAttrs)) + ")";
  }
  // v-bind data wrap
  if (el.wrapData) {
    data = el.wrapData(data);
  }
  // v-on data wrap
  if (el.wrapListeners) {
    data = el.wrapListeners(data);
  }
  return data
}

function genDirectives (el, state) {
  var dirs = el.directives;
  if (!dirs) { return }
  var res = 'directives:[';
  var hasRuntime = false;
  var i, l, dir, needRuntime;
  for (i = 0, l = dirs.length; i < l; i++) {
    dir = dirs[i];
    needRuntime = true;
    var gen = state.directives[dir.name];
    if (gen) {
      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      needRuntime = !!gen(el, dir, state.warn);
    }
    if (needRuntime) {
      hasRuntime = true;
      res += "{name:\"" + (dir.name) + "\",rawName:\"" + (dir.rawName) + "\"" + (dir.value ? (",value:(" + (dir.value) + "),expression:" + (JSON.stringify(dir.value))) : '') + (dir.arg ? (",arg:" + (dir.isDynamicArg ? dir.arg : ("\"" + (dir.arg) + "\""))) : '') + (dir.modifiers ? (",modifiers:" + (JSON.stringify(dir.modifiers))) : '') + "},";
    }
  }
  if (hasRuntime) {
    return res.slice(0, -1) + ']'
  }
}

function genInlineTemplate (el, state) {
  var ast = el.children[0];
  if (el.children.length !== 1 || ast.type !== 1) {
    state.warn(
      'Inline-template components must have exactly one child element.',
      { start: el.start }
    );
  }
  if (ast && ast.type === 1) {
    var inlineRenderFns = generate(ast, state.options);
    return ("inlineTemplate:{render:function(){" + (inlineRenderFns.render) + "},staticRenderFns:[" + (inlineRenderFns.staticRenderFns.map(function (code) { return ("function(){" + code + "}"); }).join(',')) + "]}")
  }
}

function genScopedSlots (
  el,
  slots,
  state
) {
  // by default scoped slots are considered "stable", this allows child
  // components with only scoped slots to skip forced updates from parent.
  // but in some cases we have to bail-out of this optimization
  // for example if the slot contains dynamic names, has v-if or v-for on them...
  var needsForceUpdate = el.for || Object.keys(slots).some(function (key) {
    var slot = slots[key];
    return (
      slot.slotTargetDynamic ||
      slot.if ||
      slot.for ||
      containsSlotChild(slot) // is passing down slot from parent which may be dynamic
    )
  });

  // #9534: if a component with scoped slots is inside a conditional branch,
  // it's possible for the same component to be reused but with different
  // compiled slot content. To avoid that, we generate a unique key based on
  // the generated code of all the slot contents.
  var needsKey = !!el.if;

  // OR when it is inside another scoped slot or v-for (the reactivity may be
  // disconnected due to the intermediate scope variable)
  // #9438, #9506
  // TODO: this can be further optimized by properly analyzing in-scope bindings
  // and skip force updating ones that do not actually use scope variables.
  if (!needsForceUpdate) {
    var parent = el.parent;
    while (parent) {
      if (
        (parent.slotScope && parent.slotScope !== emptySlotScopeToken) ||
        parent.for
      ) {
        needsForceUpdate = true;
        break
      }
      if (parent.if) {
        needsKey = true;
      }
      parent = parent.parent;
    }
  }

  var generatedSlots = Object.keys(slots)
    .map(function (key) { return genScopedSlot(slots[key], state); })
    .join(',');

  return ("scopedSlots:_u([" + generatedSlots + "]" + (needsForceUpdate ? ",null,true" : "") + (!needsForceUpdate && needsKey ? (",null,false," + (hash(generatedSlots))) : "") + ")")
}

function hash(str) {
  var hash = 5381;
  var i = str.length;
  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }
  return hash >>> 0
}

function containsSlotChild (el) {
  if (el.type === 1) {
    if (el.tag === 'slot') {
      return true
    }
    return el.children.some(containsSlotChild)
  }
  return false
}

function genScopedSlot (
  el,
  state
) {
  var isLegacySyntax = el.attrsMap['slot-scope'];
  if (el.if && !el.ifProcessed && !isLegacySyntax) {
    return genIf(el, state, genScopedSlot, "null")
  }
  if (el.for && !el.forProcessed) {
    return genFor(el, state, genScopedSlot)
  }
  var slotScope = el.slotScope === emptySlotScopeToken
    ? ""
    : String(el.slotScope);
  var fn = "function(" + slotScope + "){" +
    "return " + (el.tag === 'template'
      ? el.if && isLegacySyntax
        ? ("(" + (el.if) + ")?" + (genChildren(el, state) || 'undefined') + ":undefined")
        : genChildren(el, state) || 'undefined'
      : genElement(el, state)) + "}";
  // reverse proxy v-slot without scope on this.$slots
  var reverseProxy = slotScope ? "" : ",proxy:true";
  return ("{key:" + (el.slotTarget || "\"default\"") + ",fn:" + fn + reverseProxy + "}")
}

function genChildren (
  el,
  state,
  checkSkip,
  altGenElement,
  altGenNode
) {
  var children = el.children;
  if (children.length) {
    var el$1 = children[0];
    // optimize single v-for
    if (children.length === 1 &&
      el$1.for &&
      el$1.tag !== 'template' &&
      el$1.tag !== 'slot'
    ) {
      var normalizationType = checkSkip
        ? state.maybeComponent(el$1) ? ",1" : ",0"
        : "";
      return ("" + ((altGenElement || genElement)(el$1, state)) + normalizationType)
    }
    var normalizationType$1 = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0;
    var gen = altGenNode || genNode;
    return ("[" + (children.map(function (c) { return gen(c, state); }).join(',')) + "]" + (normalizationType$1 ? ("," + normalizationType$1) : ''))
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
function getNormalizationType (
  children,
  maybeComponent
) {
  var res = 0;
  for (var i = 0; i < children.length; i++) {
    var el = children[i];
    if (el.type !== 1) {
      continue
    }
    if (needsNormalization(el) ||
        (el.ifConditions && el.ifConditions.some(function (c) { return needsNormalization(c.block); }))) {
      res = 2;
      break
    }
    if (maybeComponent(el) ||
        (el.ifConditions && el.ifConditions.some(function (c) { return maybeComponent(c.block); }))) {
      res = 1;
    }
  }
  return res
}

function needsNormalization (el) {
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
}

function genNode (node, state) {
  if (node.type === 1) {
    return genElement(node, state)
  } else if (node.type === 3 && node.isComment) {
    return genComment(node)
  } else {
    return genText(node)
  }
}

function genText (text) {
  return ("_v(" + (text.type === 2
    ? text.expression // no need for () because already wrapped in _s()
    : transformSpecialNewlines(JSON.stringify(text.text))) + ")")
}

function genComment (comment) {
  return ("_e(" + (JSON.stringify(comment.text)) + ")")
}

function genSlot (el, state) {
  var slotName = el.slotName || '"default"';
  var children = genChildren(el, state);
  var res = "_t(" + slotName + (children ? ("," + children) : '');
  var attrs = el.attrs || el.dynamicAttrs
    ? genProps((el.attrs || []).concat(el.dynamicAttrs || []).map(function (attr) { return ({
        // slot props are camelized
        name: camelize(attr.name),
        value: attr.value,
        dynamic: attr.dynamic
      }); }))
    : null;
  var bind$$1 = el.attrsMap['v-bind'];
  if ((attrs || bind$$1) && !children) {
    res += ",null";
  }
  if (attrs) {
    res += "," + attrs;
  }
  if (bind$$1) {
    res += (attrs ? '' : ',null') + "," + bind$$1;
  }
  return res + ')'
}

// componentName is el.component, take it as argument to shun flow's pessimistic refinement
function genComponent (
  componentName,
  el,
  state
) {
  var children = el.inlineTemplate ? null : genChildren(el, state, true);
  return ("_c(" + componentName + "," + (genData$2(el, state)) + (children ? ("," + children) : '') + ")")
}

function genProps (props) {
  var staticProps = "";
  var dynamicProps = "";
  for (var i = 0; i < props.length; i++) {
    var prop = props[i];
    var value = transformSpecialNewlines(prop.value);
    if (prop.dynamic) {
      dynamicProps += (prop.name) + "," + value + ",";
    } else {
      staticProps += "\"" + (prop.name) + "\":" + value + ",";
    }
  }
  staticProps = "{" + (staticProps.slice(0, -1)) + "}";
  if (dynamicProps) {
    return ("_d(" + staticProps + ",[" + (dynamicProps.slice(0, -1)) + "])")
  } else {
    return staticProps
  }
}

// #3895, #4268
function transformSpecialNewlines (text) {
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/*  */



// these keywords should not appear inside expressions, but operators like
// typeof, instanceof and in are allowed
var prohibitedKeywordRE = new RegExp('\\b' + (
  'do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,' +
  'super,throw,while,yield,delete,export,import,return,switch,default,' +
  'extends,finally,continue,debugger,function,arguments'
).split(',').join('\\b|\\b') + '\\b');

// these unary operators should not be used as property/method names
var unaryOperatorsRE = new RegExp('\\b' + (
  'delete,typeof,void'
).split(',').join('\\s*\\([^\\)]*\\)|\\b') + '\\s*\\([^\\)]*\\)');

// strip strings in expressions
var stripStringRE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`/g;

// detect problematic expressions in a template
function detectErrors (ast, warn) {
  if (ast) {
    checkNode(ast, warn);
  }
}

function checkNode (node, warn) {
  if (node.type === 1) {
    for (var name in node.attrsMap) {
      if (dirRE.test(name)) {
        var value = node.attrsMap[name];
        if (value) {
          var range = node.rawAttrsMap[name];
          if (name === 'v-for') {
            checkFor(node, ("v-for=\"" + value + "\""), warn, range);
          } else if (name === 'v-slot' || name[0] === '#') {
            checkFunctionParameterExpression(value, (name + "=\"" + value + "\""), warn, range);
          } else if (onRE.test(name)) {
            checkEvent(value, (name + "=\"" + value + "\""), warn, range);
          } else {
            checkExpression(value, (name + "=\"" + value + "\""), warn, range);
          }
        }
      }
    }
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        checkNode(node.children[i], warn);
      }
    }
  } else if (node.type === 2) {
    checkExpression(node.expression, node.text, warn, node);
  }
}

function checkEvent (exp, text, warn, range) {
  var stripped = exp.replace(stripStringRE, '');
  var keywordMatch = stripped.match(unaryOperatorsRE);
  if (keywordMatch && stripped.charAt(keywordMatch.index - 1) !== '$') {
    warn(
      "avoid using JavaScript unary operator as property name: " +
      "\"" + (keywordMatch[0]) + "\" in expression " + (text.trim()),
      range
    );
  }
  checkExpression(exp, text, warn, range);
}

function checkFor (node, text, warn, range) {
  checkExpression(node.for || '', text, warn, range);
  checkIdentifier(node.alias, 'v-for alias', text, warn, range);
  checkIdentifier(node.iterator1, 'v-for iterator', text, warn, range);
  checkIdentifier(node.iterator2, 'v-for iterator', text, warn, range);
}

function checkIdentifier (
  ident,
  type,
  text,
  warn,
  range
) {
  if (typeof ident === 'string') {
    try {
      new Function(("var " + ident + "=_"));
    } catch (e) {
      warn(("invalid " + type + " \"" + ident + "\" in expression: " + (text.trim())), range);
    }
  }
}

function checkExpression (exp, text, warn, range) {
  try {
    new Function(("return " + exp));
  } catch (e) {
    var keywordMatch = exp.replace(stripStringRE, '').match(prohibitedKeywordRE);
    if (keywordMatch) {
      warn(
        "avoid using JavaScript keyword as property name: " +
        "\"" + (keywordMatch[0]) + "\"\n  Raw expression: " + (text.trim()),
        range
      );
    } else {
      warn(
        "invalid expression: " + (e.message) + " in\n\n" +
        "    " + exp + "\n\n" +
        "  Raw expression: " + (text.trim()) + "\n",
        range
      );
    }
  }
}

function checkFunctionParameterExpression (exp, text, warn, range) {
  try {
    new Function(exp, '');
  } catch (e) {
    warn(
      "invalid function parameter expression: " + (e.message) + " in\n\n" +
      "    " + exp + "\n\n" +
      "  Raw expression: " + (text.trim()) + "\n",
      range
    );
  }
}

/*  */

var range = 2;

function generateCodeFrame (
  source,
  start,
  end
) {
  if ( start === void 0 ) start = 0;
  if ( end === void 0 ) end = source.length;

  var lines = source.split(/\r?\n/);
  var count = 0;
  var res = [];
  for (var i = 0; i < lines.length; i++) {
    count += lines[i].length + 1;
    if (count >= start) {
      for (var j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) { continue }
        res.push(("" + (j + 1) + (repeat$1(" ", 3 - String(j + 1).length)) + "|  " + (lines[j])));
        var lineLength = lines[j].length;
        if (j === i) {
          // push underline
          var pad = start - (count - lineLength) + 1;
          var length = end > count ? lineLength - pad : end - start;
          res.push("   |  " + repeat$1(" ", pad) + repeat$1("^", length));
        } else if (j > i) {
          if (end > count) {
            var length$1 = Math.min(end - count, lineLength);
            res.push("   |  " + repeat$1("^", length$1));
          }
          count += lineLength + 1;
        }
      }
      break
    }
  }
  return res.join('\n')
}

function repeat$1 (str, n) {
  var result = '';
  if (n > 0) {
    while (true) { // eslint-disable-line
      if (n & 1) { result += str; }
      n >>>= 1;
      if (n <= 0) { break }
      str += str;
    }
  }
  return result
}

/*  */



function createFunction (code, errors) {
  try {
    return new Function(code)
  } catch (err) {
    errors.push({ err: err, code: code });
    return noop
  }
}

function createCompileToFunctionFn (compile) {
  var cache = Object.create(null);

  return function compileToFunctions (
    template,
    options,
    vm
  ) {
    options = extend({}, options);
    var warn$$1 = options.warn || warn;
    delete options.warn;

    /* istanbul ignore if */
    {
      // detect possible CSP restriction
      try {
        new Function('return 1');
      } catch (e) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn$$1(
            'It seems you are using the standalone build of Vue.js in an ' +
            'environment with Content Security Policy that prohibits unsafe-eval. ' +
            'The template compiler cannot work in this environment. Consider ' +
            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
            'templates into render functions.'
          );
        }
      }
    }

    // check cache
    var key = options.delimiters
      ? String(options.delimiters) + template
      : template;
    if (cache[key]) {
      return cache[key]
    }

    // compile
    var compiled = compile(template, options);

    // check compilation errors/tips
    {
      if (compiled.errors && compiled.errors.length) {
        if (options.outputSourceRange) {
          compiled.errors.forEach(function (e) {
            warn$$1(
              "Error compiling template:\n\n" + (e.msg) + "\n\n" +
              generateCodeFrame(template, e.start, e.end),
              vm
            );
          });
        } else {
          warn$$1(
            "Error compiling template:\n\n" + template + "\n\n" +
            compiled.errors.map(function (e) { return ("- " + e); }).join('\n') + '\n',
            vm
          );
        }
      }
      if (compiled.tips && compiled.tips.length) {
        if (options.outputSourceRange) {
          compiled.tips.forEach(function (e) { return tip(e.msg, vm); });
        } else {
          compiled.tips.forEach(function (msg) { return tip(msg, vm); });
        }
      }
    }

    // turn code into functions
    var res = {};
    var fnGenErrors = [];
    res.render = createFunction(compiled.render, fnGenErrors);
    res.staticRenderFns = compiled.staticRenderFns.map(function (code) {
      return createFunction(code, fnGenErrors)
    });

    // check function generation errors.
    // this should only happen if there is a bug in the compiler itself.
    // mostly for codegen development use
    /* istanbul ignore if */
    {
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn$$1(
          "Failed to generate render function:\n\n" +
          fnGenErrors.map(function (ref) {
            var err = ref.err;
            var code = ref.code;

            return ((err.toString()) + " in\n\n" + code + "\n");
        }).join('\n'),
          vm
        );
      }
    }

    return (cache[key] = res)
  }
}

/*  */

function createCompilerCreator (baseCompile) {
  return function createCompiler (baseOptions) {
    function compile (
      template,
      options
    ) {
      var finalOptions = Object.create(baseOptions);
      var errors = [];
      var tips = [];

      var warn = function (msg, range, tip) {
        (tip ? tips : errors).push(msg);
      };

      if (options) {
        if (options.outputSourceRange) {
          // $flow-disable-line
          var leadingSpaceLength = template.match(/^\s*/)[0].length;

          warn = function (msg, range, tip) {
            var data = { msg: msg };
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength;
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength;
              }
            }
            (tip ? tips : errors).push(data);
          };
        }
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules);
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          );
        }
        // copy other options
        for (var key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key];
          }
        }
      }

      finalOptions.warn = warn;

      var compiled = baseCompile(template.trim(), finalOptions);
      {
        detectErrors(compiled.ast, warn);
      }
      compiled.errors = errors;
      compiled.tips = tips;
      return compiled
    }

    return {
      compile: compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}

/*  */

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
var createCompiler = createCompilerCreator(function baseCompile (
  template,
  options
) {
  var ast = parse(template.trim(), options);
  if (options.optimize !== false) {
    optimize(ast, options);
  }
  var code = generate(ast, options);
  return {
    ast: ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
});

/*  */

var ref$1 = createCompiler(baseOptions);
var compile = ref$1.compile;
var compileToFunctions = ref$1.compileToFunctions;

/*  */

// check whether current browser encodes a char inside attribute values
var div;
function getShouldDecode (href) {
  div = div || document.createElement('div');
  div.innerHTML = href ? "<a href=\"\n\"/>" : "<div a=\"\n\"/>";
  return div.innerHTML.indexOf('&#10;') > 0
}

// #3663: IE encodes newlines inside attribute values while other browsers don't
var shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false;
// #6828: chrome encodes content in a[href]
var shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false;

/*  */

var idToTemplate = cached(function (id) {
  var el = query(id);
  return el && el.innerHTML
});

var mount = Vue.prototype.$mount;
Vue.prototype.$mount = function (
  el,
  hydrating
) {
  el = el && query(el);

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    warn(
      "Do not mount Vue to <html> or <body> - mount to normal elements instead."
    );
    return this
  }

  var options = this.$options;
  // resolve template/el and convert to render function
  if (!options.render) {
    var template = options.template;
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template);
          /* istanbul ignore if */
          if (!template) {
            warn(
              ("Template element not found or is empty: " + (options.template)),
              this
            );
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML;
      } else {
        {
          warn('invalid template option:' + template, this);
        }
        return this
      }
    } else if (el) {
      template = getOuterHTML(el);
    }
    if (template) {
      /* istanbul ignore if */
      if (config.performance && mark) {
        mark('compile');
      }

      var ref = compileToFunctions(template, {
        outputSourceRange: "development" !== 'production',
        shouldDecodeNewlines: shouldDecodeNewlines,
        shouldDecodeNewlinesForHref: shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this);
      var render = ref.render;
      var staticRenderFns = ref.staticRenderFns;
      options.render = render;
      options.staticRenderFns = staticRenderFns;

      /* istanbul ignore if */
      if (config.performance && mark) {
        mark('compile end');
        measure(("vue " + (this._name) + " compile"), 'compile', 'compile end');
      }
    }
  }
  return mount.call(this, el, hydrating)
};

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el) {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    var container = document.createElement('div');
    container.appendChild(el.cloneNode(true));
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions;

module.exports = Vue;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"timers":8}],16:[function(require,module,exports){
(function (process){
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./vue.common.prod.js')
} else {
  module.exports = require('./vue.common.dev.js')
}

}).call(this,require('_process'))
},{"./vue.common.dev.js":15,"./vue.common.prod.js":17,"_process":6}],17:[function(require,module,exports){
(function (global,setImmediate){
/*!
 * Vue.js v2.6.11
 * (c) 2014-2019 Evan You
 * Released under the MIT License.
 */
"use strict";var e=Object.freeze({});function t(e){return null==e}function n(e){return null!=e}function r(e){return!0===e}function i(e){return"string"==typeof e||"number"==typeof e||"symbol"==typeof e||"boolean"==typeof e}function o(e){return null!==e&&"object"==typeof e}var a=Object.prototype.toString;function s(e){return"[object Object]"===a.call(e)}function c(e){var t=parseFloat(String(e));return t>=0&&Math.floor(t)===t&&isFinite(e)}function u(e){return n(e)&&"function"==typeof e.then&&"function"==typeof e.catch}function l(e){return null==e?"":Array.isArray(e)||s(e)&&e.toString===a?JSON.stringify(e,null,2):String(e)}function f(e){var t=parseFloat(e);return isNaN(t)?e:t}function p(e,t){for(var n=Object.create(null),r=e.split(","),i=0;i<r.length;i++)n[r[i]]=!0;return t?function(e){return n[e.toLowerCase()]}:function(e){return n[e]}}var d=p("slot,component",!0),v=p("key,ref,slot,slot-scope,is");function h(e,t){if(e.length){var n=e.indexOf(t);if(n>-1)return e.splice(n,1)}}var m=Object.prototype.hasOwnProperty;function y(e,t){return m.call(e,t)}function g(e){var t=Object.create(null);return function(n){return t[n]||(t[n]=e(n))}}var _=/-(\w)/g,b=g(function(e){return e.replace(_,function(e,t){return t?t.toUpperCase():""})}),$=g(function(e){return e.charAt(0).toUpperCase()+e.slice(1)}),w=/\B([A-Z])/g,C=g(function(e){return e.replace(w,"-$1").toLowerCase()});var x=Function.prototype.bind?function(e,t){return e.bind(t)}:function(e,t){function n(n){var r=arguments.length;return r?r>1?e.apply(t,arguments):e.call(t,n):e.call(t)}return n._length=e.length,n};function k(e,t){t=t||0;for(var n=e.length-t,r=new Array(n);n--;)r[n]=e[n+t];return r}function A(e,t){for(var n in t)e[n]=t[n];return e}function O(e){for(var t={},n=0;n<e.length;n++)e[n]&&A(t,e[n]);return t}function S(e,t,n){}var T=function(e,t,n){return!1},E=function(e){return e};function N(e,t){if(e===t)return!0;var n=o(e),r=o(t);if(!n||!r)return!n&&!r&&String(e)===String(t);try{var i=Array.isArray(e),a=Array.isArray(t);if(i&&a)return e.length===t.length&&e.every(function(e,n){return N(e,t[n])});if(e instanceof Date&&t instanceof Date)return e.getTime()===t.getTime();if(i||a)return!1;var s=Object.keys(e),c=Object.keys(t);return s.length===c.length&&s.every(function(n){return N(e[n],t[n])})}catch(e){return!1}}function j(e,t){for(var n=0;n<e.length;n++)if(N(e[n],t))return n;return-1}function D(e){var t=!1;return function(){t||(t=!0,e.apply(this,arguments))}}var L="data-server-rendered",M=["component","directive","filter"],I=["beforeCreate","created","beforeMount","mounted","beforeUpdate","updated","beforeDestroy","destroyed","activated","deactivated","errorCaptured","serverPrefetch"],F={optionMergeStrategies:Object.create(null),silent:!1,productionTip:!1,devtools:!1,performance:!1,errorHandler:null,warnHandler:null,ignoredElements:[],keyCodes:Object.create(null),isReservedTag:T,isReservedAttr:T,isUnknownElement:T,getTagNamespace:S,parsePlatformTagName:E,mustUseProp:T,async:!0,_lifecycleHooks:I},P=/a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;function R(e,t,n,r){Object.defineProperty(e,t,{value:n,enumerable:!!r,writable:!0,configurable:!0})}var H=new RegExp("[^"+P.source+".$_\\d]");var B,U="__proto__"in{},z="undefined"!=typeof window,V="undefined"!=typeof WXEnvironment&&!!WXEnvironment.platform,K=V&&WXEnvironment.platform.toLowerCase(),J=z&&window.navigator.userAgent.toLowerCase(),q=J&&/msie|trident/.test(J),W=J&&J.indexOf("msie 9.0")>0,Z=J&&J.indexOf("edge/")>0,G=(J&&J.indexOf("android"),J&&/iphone|ipad|ipod|ios/.test(J)||"ios"===K),X=(J&&/chrome\/\d+/.test(J),J&&/phantomjs/.test(J),J&&J.match(/firefox\/(\d+)/)),Y={}.watch,Q=!1;if(z)try{var ee={};Object.defineProperty(ee,"passive",{get:function(){Q=!0}}),window.addEventListener("test-passive",null,ee)}catch(e){}var te=function(){return void 0===B&&(B=!z&&!V&&"undefined"!=typeof global&&(global.process&&"server"===global.process.env.VUE_ENV)),B},ne=z&&window.__VUE_DEVTOOLS_GLOBAL_HOOK__;function re(e){return"function"==typeof e&&/native code/.test(e.toString())}var ie,oe="undefined"!=typeof Symbol&&re(Symbol)&&"undefined"!=typeof Reflect&&re(Reflect.ownKeys);ie="undefined"!=typeof Set&&re(Set)?Set:function(){function e(){this.set=Object.create(null)}return e.prototype.has=function(e){return!0===this.set[e]},e.prototype.add=function(e){this.set[e]=!0},e.prototype.clear=function(){this.set=Object.create(null)},e}();var ae=S,se=0,ce=function(){this.id=se++,this.subs=[]};ce.prototype.addSub=function(e){this.subs.push(e)},ce.prototype.removeSub=function(e){h(this.subs,e)},ce.prototype.depend=function(){ce.target&&ce.target.addDep(this)},ce.prototype.notify=function(){for(var e=this.subs.slice(),t=0,n=e.length;t<n;t++)e[t].update()},ce.target=null;var ue=[];function le(e){ue.push(e),ce.target=e}function fe(){ue.pop(),ce.target=ue[ue.length-1]}var pe=function(e,t,n,r,i,o,a,s){this.tag=e,this.data=t,this.children=n,this.text=r,this.elm=i,this.ns=void 0,this.context=o,this.fnContext=void 0,this.fnOptions=void 0,this.fnScopeId=void 0,this.key=t&&t.key,this.componentOptions=a,this.componentInstance=void 0,this.parent=void 0,this.raw=!1,this.isStatic=!1,this.isRootInsert=!0,this.isComment=!1,this.isCloned=!1,this.isOnce=!1,this.asyncFactory=s,this.asyncMeta=void 0,this.isAsyncPlaceholder=!1},de={child:{configurable:!0}};de.child.get=function(){return this.componentInstance},Object.defineProperties(pe.prototype,de);var ve=function(e){void 0===e&&(e="");var t=new pe;return t.text=e,t.isComment=!0,t};function he(e){return new pe(void 0,void 0,void 0,String(e))}function me(e){var t=new pe(e.tag,e.data,e.children&&e.children.slice(),e.text,e.elm,e.context,e.componentOptions,e.asyncFactory);return t.ns=e.ns,t.isStatic=e.isStatic,t.key=e.key,t.isComment=e.isComment,t.fnContext=e.fnContext,t.fnOptions=e.fnOptions,t.fnScopeId=e.fnScopeId,t.asyncMeta=e.asyncMeta,t.isCloned=!0,t}var ye=Array.prototype,ge=Object.create(ye);["push","pop","shift","unshift","splice","sort","reverse"].forEach(function(e){var t=ye[e];R(ge,e,function(){for(var n=[],r=arguments.length;r--;)n[r]=arguments[r];var i,o=t.apply(this,n),a=this.__ob__;switch(e){case"push":case"unshift":i=n;break;case"splice":i=n.slice(2)}return i&&a.observeArray(i),a.dep.notify(),o})});var _e=Object.getOwnPropertyNames(ge),be=!0;function $e(e){be=e}var we=function(e){var t;this.value=e,this.dep=new ce,this.vmCount=0,R(e,"__ob__",this),Array.isArray(e)?(U?(t=ge,e.__proto__=t):function(e,t,n){for(var r=0,i=n.length;r<i;r++){var o=n[r];R(e,o,t[o])}}(e,ge,_e),this.observeArray(e)):this.walk(e)};function Ce(e,t){var n;if(o(e)&&!(e instanceof pe))return y(e,"__ob__")&&e.__ob__ instanceof we?n=e.__ob__:be&&!te()&&(Array.isArray(e)||s(e))&&Object.isExtensible(e)&&!e._isVue&&(n=new we(e)),t&&n&&n.vmCount++,n}function xe(e,t,n,r,i){var o=new ce,a=Object.getOwnPropertyDescriptor(e,t);if(!a||!1!==a.configurable){var s=a&&a.get,c=a&&a.set;s&&!c||2!==arguments.length||(n=e[t]);var u=!i&&Ce(n);Object.defineProperty(e,t,{enumerable:!0,configurable:!0,get:function(){var t=s?s.call(e):n;return ce.target&&(o.depend(),u&&(u.dep.depend(),Array.isArray(t)&&function e(t){for(var n=void 0,r=0,i=t.length;r<i;r++)(n=t[r])&&n.__ob__&&n.__ob__.dep.depend(),Array.isArray(n)&&e(n)}(t))),t},set:function(t){var r=s?s.call(e):n;t===r||t!=t&&r!=r||s&&!c||(c?c.call(e,t):n=t,u=!i&&Ce(t),o.notify())}})}}function ke(e,t,n){if(Array.isArray(e)&&c(t))return e.length=Math.max(e.length,t),e.splice(t,1,n),n;if(t in e&&!(t in Object.prototype))return e[t]=n,n;var r=e.__ob__;return e._isVue||r&&r.vmCount?n:r?(xe(r.value,t,n),r.dep.notify(),n):(e[t]=n,n)}function Ae(e,t){if(Array.isArray(e)&&c(t))e.splice(t,1);else{var n=e.__ob__;e._isVue||n&&n.vmCount||y(e,t)&&(delete e[t],n&&n.dep.notify())}}we.prototype.walk=function(e){for(var t=Object.keys(e),n=0;n<t.length;n++)xe(e,t[n])},we.prototype.observeArray=function(e){for(var t=0,n=e.length;t<n;t++)Ce(e[t])};var Oe=F.optionMergeStrategies;function Se(e,t){if(!t)return e;for(var n,r,i,o=oe?Reflect.ownKeys(t):Object.keys(t),a=0;a<o.length;a++)"__ob__"!==(n=o[a])&&(r=e[n],i=t[n],y(e,n)?r!==i&&s(r)&&s(i)&&Se(r,i):ke(e,n,i));return e}function Te(e,t,n){return n?function(){var r="function"==typeof t?t.call(n,n):t,i="function"==typeof e?e.call(n,n):e;return r?Se(r,i):i}:t?e?function(){return Se("function"==typeof t?t.call(this,this):t,"function"==typeof e?e.call(this,this):e)}:t:e}function Ee(e,t){var n=t?e?e.concat(t):Array.isArray(t)?t:[t]:e;return n?function(e){for(var t=[],n=0;n<e.length;n++)-1===t.indexOf(e[n])&&t.push(e[n]);return t}(n):n}function Ne(e,t,n,r){var i=Object.create(e||null);return t?A(i,t):i}Oe.data=function(e,t,n){return n?Te(e,t,n):t&&"function"!=typeof t?e:Te(e,t)},I.forEach(function(e){Oe[e]=Ee}),M.forEach(function(e){Oe[e+"s"]=Ne}),Oe.watch=function(e,t,n,r){if(e===Y&&(e=void 0),t===Y&&(t=void 0),!t)return Object.create(e||null);if(!e)return t;var i={};for(var o in A(i,e),t){var a=i[o],s=t[o];a&&!Array.isArray(a)&&(a=[a]),i[o]=a?a.concat(s):Array.isArray(s)?s:[s]}return i},Oe.props=Oe.methods=Oe.inject=Oe.computed=function(e,t,n,r){if(!e)return t;var i=Object.create(null);return A(i,e),t&&A(i,t),i},Oe.provide=Te;var je=function(e,t){return void 0===t?e:t};function De(e,t,n){if("function"==typeof t&&(t=t.options),function(e,t){var n=e.props;if(n){var r,i,o={};if(Array.isArray(n))for(r=n.length;r--;)"string"==typeof(i=n[r])&&(o[b(i)]={type:null});else if(s(n))for(var a in n)i=n[a],o[b(a)]=s(i)?i:{type:i};e.props=o}}(t),function(e,t){var n=e.inject;if(n){var r=e.inject={};if(Array.isArray(n))for(var i=0;i<n.length;i++)r[n[i]]={from:n[i]};else if(s(n))for(var o in n){var a=n[o];r[o]=s(a)?A({from:o},a):{from:a}}}}(t),function(e){var t=e.directives;if(t)for(var n in t){var r=t[n];"function"==typeof r&&(t[n]={bind:r,update:r})}}(t),!t._base&&(t.extends&&(e=De(e,t.extends,n)),t.mixins))for(var r=0,i=t.mixins.length;r<i;r++)e=De(e,t.mixins[r],n);var o,a={};for(o in e)c(o);for(o in t)y(e,o)||c(o);function c(r){var i=Oe[r]||je;a[r]=i(e[r],t[r],n,r)}return a}function Le(e,t,n,r){if("string"==typeof n){var i=e[t];if(y(i,n))return i[n];var o=b(n);if(y(i,o))return i[o];var a=$(o);return y(i,a)?i[a]:i[n]||i[o]||i[a]}}function Me(e,t,n,r){var i=t[e],o=!y(n,e),a=n[e],s=Pe(Boolean,i.type);if(s>-1)if(o&&!y(i,"default"))a=!1;else if(""===a||a===C(e)){var c=Pe(String,i.type);(c<0||s<c)&&(a=!0)}if(void 0===a){a=function(e,t,n){if(!y(t,"default"))return;var r=t.default;if(e&&e.$options.propsData&&void 0===e.$options.propsData[n]&&void 0!==e._props[n])return e._props[n];return"function"==typeof r&&"Function"!==Ie(t.type)?r.call(e):r}(r,i,e);var u=be;$e(!0),Ce(a),$e(u)}return a}function Ie(e){var t=e&&e.toString().match(/^\s*function (\w+)/);return t?t[1]:""}function Fe(e,t){return Ie(e)===Ie(t)}function Pe(e,t){if(!Array.isArray(t))return Fe(t,e)?0:-1;for(var n=0,r=t.length;n<r;n++)if(Fe(t[n],e))return n;return-1}function Re(e,t,n){le();try{if(t)for(var r=t;r=r.$parent;){var i=r.$options.errorCaptured;if(i)for(var o=0;o<i.length;o++)try{if(!1===i[o].call(r,e,t,n))return}catch(e){Be(e,r,"errorCaptured hook")}}Be(e,t,n)}finally{fe()}}function He(e,t,n,r,i){var o;try{(o=n?e.apply(t,n):e.call(t))&&!o._isVue&&u(o)&&!o._handled&&(o.catch(function(e){return Re(e,r,i+" (Promise/async)")}),o._handled=!0)}catch(e){Re(e,r,i)}return o}function Be(e,t,n){if(F.errorHandler)try{return F.errorHandler.call(null,e,t,n)}catch(t){t!==e&&Ue(t,null,"config.errorHandler")}Ue(e,t,n)}function Ue(e,t,n){if(!z&&!V||"undefined"==typeof console)throw e;console.error(e)}var ze,Ve=!1,Ke=[],Je=!1;function qe(){Je=!1;var e=Ke.slice(0);Ke.length=0;for(var t=0;t<e.length;t++)e[t]()}if("undefined"!=typeof Promise&&re(Promise)){var We=Promise.resolve();ze=function(){We.then(qe),G&&setTimeout(S)},Ve=!0}else if(q||"undefined"==typeof MutationObserver||!re(MutationObserver)&&"[object MutationObserverConstructor]"!==MutationObserver.toString())ze="undefined"!=typeof setImmediate&&re(setImmediate)?function(){setImmediate(qe)}:function(){setTimeout(qe,0)};else{var Ze=1,Ge=new MutationObserver(qe),Xe=document.createTextNode(String(Ze));Ge.observe(Xe,{characterData:!0}),ze=function(){Ze=(Ze+1)%2,Xe.data=String(Ze)},Ve=!0}function Ye(e,t){var n;if(Ke.push(function(){if(e)try{e.call(t)}catch(e){Re(e,t,"nextTick")}else n&&n(t)}),Je||(Je=!0,ze()),!e&&"undefined"!=typeof Promise)return new Promise(function(e){n=e})}var Qe=new ie;function et(e){!function e(t,n){var r,i;var a=Array.isArray(t);if(!a&&!o(t)||Object.isFrozen(t)||t instanceof pe)return;if(t.__ob__){var s=t.__ob__.dep.id;if(n.has(s))return;n.add(s)}if(a)for(r=t.length;r--;)e(t[r],n);else for(i=Object.keys(t),r=i.length;r--;)e(t[i[r]],n)}(e,Qe),Qe.clear()}var tt=g(function(e){var t="&"===e.charAt(0),n="~"===(e=t?e.slice(1):e).charAt(0),r="!"===(e=n?e.slice(1):e).charAt(0);return{name:e=r?e.slice(1):e,once:n,capture:r,passive:t}});function nt(e,t){function n(){var e=arguments,r=n.fns;if(!Array.isArray(r))return He(r,null,arguments,t,"v-on handler");for(var i=r.slice(),o=0;o<i.length;o++)He(i[o],null,e,t,"v-on handler")}return n.fns=e,n}function rt(e,n,i,o,a,s){var c,u,l,f;for(c in e)u=e[c],l=n[c],f=tt(c),t(u)||(t(l)?(t(u.fns)&&(u=e[c]=nt(u,s)),r(f.once)&&(u=e[c]=a(f.name,u,f.capture)),i(f.name,u,f.capture,f.passive,f.params)):u!==l&&(l.fns=u,e[c]=l));for(c in n)t(e[c])&&o((f=tt(c)).name,n[c],f.capture)}function it(e,i,o){var a;e instanceof pe&&(e=e.data.hook||(e.data.hook={}));var s=e[i];function c(){o.apply(this,arguments),h(a.fns,c)}t(s)?a=nt([c]):n(s.fns)&&r(s.merged)?(a=s).fns.push(c):a=nt([s,c]),a.merged=!0,e[i]=a}function ot(e,t,r,i,o){if(n(t)){if(y(t,r))return e[r]=t[r],o||delete t[r],!0;if(y(t,i))return e[r]=t[i],o||delete t[i],!0}return!1}function at(e){return i(e)?[he(e)]:Array.isArray(e)?function e(o,a){var s=[];var c,u,l,f;for(c=0;c<o.length;c++)t(u=o[c])||"boolean"==typeof u||(l=s.length-1,f=s[l],Array.isArray(u)?u.length>0&&(st((u=e(u,(a||"")+"_"+c))[0])&&st(f)&&(s[l]=he(f.text+u[0].text),u.shift()),s.push.apply(s,u)):i(u)?st(f)?s[l]=he(f.text+u):""!==u&&s.push(he(u)):st(u)&&st(f)?s[l]=he(f.text+u.text):(r(o._isVList)&&n(u.tag)&&t(u.key)&&n(a)&&(u.key="__vlist"+a+"_"+c+"__"),s.push(u)));return s}(e):void 0}function st(e){return n(e)&&n(e.text)&&!1===e.isComment}function ct(e,t){if(e){for(var n=Object.create(null),r=oe?Reflect.ownKeys(e):Object.keys(e),i=0;i<r.length;i++){var o=r[i];if("__ob__"!==o){for(var a=e[o].from,s=t;s;){if(s._provided&&y(s._provided,a)){n[o]=s._provided[a];break}s=s.$parent}if(!s&&"default"in e[o]){var c=e[o].default;n[o]="function"==typeof c?c.call(t):c}}}return n}}function ut(e,t){if(!e||!e.length)return{};for(var n={},r=0,i=e.length;r<i;r++){var o=e[r],a=o.data;if(a&&a.attrs&&a.attrs.slot&&delete a.attrs.slot,o.context!==t&&o.fnContext!==t||!a||null==a.slot)(n.default||(n.default=[])).push(o);else{var s=a.slot,c=n[s]||(n[s]=[]);"template"===o.tag?c.push.apply(c,o.children||[]):c.push(o)}}for(var u in n)n[u].every(lt)&&delete n[u];return n}function lt(e){return e.isComment&&!e.asyncFactory||" "===e.text}function ft(t,n,r){var i,o=Object.keys(n).length>0,a=t?!!t.$stable:!o,s=t&&t.$key;if(t){if(t._normalized)return t._normalized;if(a&&r&&r!==e&&s===r.$key&&!o&&!r.$hasNormal)return r;for(var c in i={},t)t[c]&&"$"!==c[0]&&(i[c]=pt(n,c,t[c]))}else i={};for(var u in n)u in i||(i[u]=dt(n,u));return t&&Object.isExtensible(t)&&(t._normalized=i),R(i,"$stable",a),R(i,"$key",s),R(i,"$hasNormal",o),i}function pt(e,t,n){var r=function(){var e=arguments.length?n.apply(null,arguments):n({});return(e=e&&"object"==typeof e&&!Array.isArray(e)?[e]:at(e))&&(0===e.length||1===e.length&&e[0].isComment)?void 0:e};return n.proxy&&Object.defineProperty(e,t,{get:r,enumerable:!0,configurable:!0}),r}function dt(e,t){return function(){return e[t]}}function vt(e,t){var r,i,a,s,c;if(Array.isArray(e)||"string"==typeof e)for(r=new Array(e.length),i=0,a=e.length;i<a;i++)r[i]=t(e[i],i);else if("number"==typeof e)for(r=new Array(e),i=0;i<e;i++)r[i]=t(i+1,i);else if(o(e))if(oe&&e[Symbol.iterator]){r=[];for(var u=e[Symbol.iterator](),l=u.next();!l.done;)r.push(t(l.value,r.length)),l=u.next()}else for(s=Object.keys(e),r=new Array(s.length),i=0,a=s.length;i<a;i++)c=s[i],r[i]=t(e[c],c,i);return n(r)||(r=[]),r._isVList=!0,r}function ht(e,t,n,r){var i,o=this.$scopedSlots[e];o?(n=n||{},r&&(n=A(A({},r),n)),i=o(n)||t):i=this.$slots[e]||t;var a=n&&n.slot;return a?this.$createElement("template",{slot:a},i):i}function mt(e){return Le(this.$options,"filters",e)||E}function yt(e,t){return Array.isArray(e)?-1===e.indexOf(t):e!==t}function gt(e,t,n,r,i){var o=F.keyCodes[t]||n;return i&&r&&!F.keyCodes[t]?yt(i,r):o?yt(o,e):r?C(r)!==t:void 0}function _t(e,t,n,r,i){if(n)if(o(n)){var a;Array.isArray(n)&&(n=O(n));var s=function(o){if("class"===o||"style"===o||v(o))a=e;else{var s=e.attrs&&e.attrs.type;a=r||F.mustUseProp(t,s,o)?e.domProps||(e.domProps={}):e.attrs||(e.attrs={})}var c=b(o),u=C(o);c in a||u in a||(a[o]=n[o],i&&((e.on||(e.on={}))["update:"+o]=function(e){n[o]=e}))};for(var c in n)s(c)}else;return e}function bt(e,t){var n=this._staticTrees||(this._staticTrees=[]),r=n[e];return r&&!t?r:(wt(r=n[e]=this.$options.staticRenderFns[e].call(this._renderProxy,null,this),"__static__"+e,!1),r)}function $t(e,t,n){return wt(e,"__once__"+t+(n?"_"+n:""),!0),e}function wt(e,t,n){if(Array.isArray(e))for(var r=0;r<e.length;r++)e[r]&&"string"!=typeof e[r]&&Ct(e[r],t+"_"+r,n);else Ct(e,t,n)}function Ct(e,t,n){e.isStatic=!0,e.key=t,e.isOnce=n}function xt(e,t){if(t)if(s(t)){var n=e.on=e.on?A({},e.on):{};for(var r in t){var i=n[r],o=t[r];n[r]=i?[].concat(i,o):o}}else;return e}function kt(e,t,n,r){t=t||{$stable:!n};for(var i=0;i<e.length;i++){var o=e[i];Array.isArray(o)?kt(o,t,n):o&&(o.proxy&&(o.fn.proxy=!0),t[o.key]=o.fn)}return r&&(t.$key=r),t}function At(e,t){for(var n=0;n<t.length;n+=2){var r=t[n];"string"==typeof r&&r&&(e[t[n]]=t[n+1])}return e}function Ot(e,t){return"string"==typeof e?t+e:e}function St(e){e._o=$t,e._n=f,e._s=l,e._l=vt,e._t=ht,e._q=N,e._i=j,e._m=bt,e._f=mt,e._k=gt,e._b=_t,e._v=he,e._e=ve,e._u=kt,e._g=xt,e._d=At,e._p=Ot}function Tt(t,n,i,o,a){var s,c=this,u=a.options;y(o,"_uid")?(s=Object.create(o))._original=o:(s=o,o=o._original);var l=r(u._compiled),f=!l;this.data=t,this.props=n,this.children=i,this.parent=o,this.listeners=t.on||e,this.injections=ct(u.inject,o),this.slots=function(){return c.$slots||ft(t.scopedSlots,c.$slots=ut(i,o)),c.$slots},Object.defineProperty(this,"scopedSlots",{enumerable:!0,get:function(){return ft(t.scopedSlots,this.slots())}}),l&&(this.$options=u,this.$slots=this.slots(),this.$scopedSlots=ft(t.scopedSlots,this.$slots)),u._scopeId?this._c=function(e,t,n,r){var i=Pt(s,e,t,n,r,f);return i&&!Array.isArray(i)&&(i.fnScopeId=u._scopeId,i.fnContext=o),i}:this._c=function(e,t,n,r){return Pt(s,e,t,n,r,f)}}function Et(e,t,n,r,i){var o=me(e);return o.fnContext=n,o.fnOptions=r,t.slot&&((o.data||(o.data={})).slot=t.slot),o}function Nt(e,t){for(var n in t)e[b(n)]=t[n]}St(Tt.prototype);var jt={init:function(e,t){if(e.componentInstance&&!e.componentInstance._isDestroyed&&e.data.keepAlive){var r=e;jt.prepatch(r,r)}else{(e.componentInstance=function(e,t){var r={_isComponent:!0,_parentVnode:e,parent:t},i=e.data.inlineTemplate;n(i)&&(r.render=i.render,r.staticRenderFns=i.staticRenderFns);return new e.componentOptions.Ctor(r)}(e,Wt)).$mount(t?e.elm:void 0,t)}},prepatch:function(t,n){var r=n.componentOptions;!function(t,n,r,i,o){var a=i.data.scopedSlots,s=t.$scopedSlots,c=!!(a&&!a.$stable||s!==e&&!s.$stable||a&&t.$scopedSlots.$key!==a.$key),u=!!(o||t.$options._renderChildren||c);t.$options._parentVnode=i,t.$vnode=i,t._vnode&&(t._vnode.parent=i);if(t.$options._renderChildren=o,t.$attrs=i.data.attrs||e,t.$listeners=r||e,n&&t.$options.props){$e(!1);for(var l=t._props,f=t.$options._propKeys||[],p=0;p<f.length;p++){var d=f[p],v=t.$options.props;l[d]=Me(d,v,n,t)}$e(!0),t.$options.propsData=n}r=r||e;var h=t.$options._parentListeners;t.$options._parentListeners=r,qt(t,r,h),u&&(t.$slots=ut(o,i.context),t.$forceUpdate())}(n.componentInstance=t.componentInstance,r.propsData,r.listeners,n,r.children)},insert:function(e){var t,n=e.context,r=e.componentInstance;r._isMounted||(r._isMounted=!0,Yt(r,"mounted")),e.data.keepAlive&&(n._isMounted?((t=r)._inactive=!1,en.push(t)):Xt(r,!0))},destroy:function(e){var t=e.componentInstance;t._isDestroyed||(e.data.keepAlive?function e(t,n){if(n&&(t._directInactive=!0,Gt(t)))return;if(!t._inactive){t._inactive=!0;for(var r=0;r<t.$children.length;r++)e(t.$children[r]);Yt(t,"deactivated")}}(t,!0):t.$destroy())}},Dt=Object.keys(jt);function Lt(i,a,s,c,l){if(!t(i)){var f=s.$options._base;if(o(i)&&(i=f.extend(i)),"function"==typeof i){var p;if(t(i.cid)&&void 0===(i=function(e,i){if(r(e.error)&&n(e.errorComp))return e.errorComp;if(n(e.resolved))return e.resolved;var a=Ht;a&&n(e.owners)&&-1===e.owners.indexOf(a)&&e.owners.push(a);if(r(e.loading)&&n(e.loadingComp))return e.loadingComp;if(a&&!n(e.owners)){var s=e.owners=[a],c=!0,l=null,f=null;a.$on("hook:destroyed",function(){return h(s,a)});var p=function(e){for(var t=0,n=s.length;t<n;t++)s[t].$forceUpdate();e&&(s.length=0,null!==l&&(clearTimeout(l),l=null),null!==f&&(clearTimeout(f),f=null))},d=D(function(t){e.resolved=Bt(t,i),c?s.length=0:p(!0)}),v=D(function(t){n(e.errorComp)&&(e.error=!0,p(!0))}),m=e(d,v);return o(m)&&(u(m)?t(e.resolved)&&m.then(d,v):u(m.component)&&(m.component.then(d,v),n(m.error)&&(e.errorComp=Bt(m.error,i)),n(m.loading)&&(e.loadingComp=Bt(m.loading,i),0===m.delay?e.loading=!0:l=setTimeout(function(){l=null,t(e.resolved)&&t(e.error)&&(e.loading=!0,p(!1))},m.delay||200)),n(m.timeout)&&(f=setTimeout(function(){f=null,t(e.resolved)&&v(null)},m.timeout)))),c=!1,e.loading?e.loadingComp:e.resolved}}(p=i,f)))return function(e,t,n,r,i){var o=ve();return o.asyncFactory=e,o.asyncMeta={data:t,context:n,children:r,tag:i},o}(p,a,s,c,l);a=a||{},$n(i),n(a.model)&&function(e,t){var r=e.model&&e.model.prop||"value",i=e.model&&e.model.event||"input";(t.attrs||(t.attrs={}))[r]=t.model.value;var o=t.on||(t.on={}),a=o[i],s=t.model.callback;n(a)?(Array.isArray(a)?-1===a.indexOf(s):a!==s)&&(o[i]=[s].concat(a)):o[i]=s}(i.options,a);var d=function(e,r,i){var o=r.options.props;if(!t(o)){var a={},s=e.attrs,c=e.props;if(n(s)||n(c))for(var u in o){var l=C(u);ot(a,c,u,l,!0)||ot(a,s,u,l,!1)}return a}}(a,i);if(r(i.options.functional))return function(t,r,i,o,a){var s=t.options,c={},u=s.props;if(n(u))for(var l in u)c[l]=Me(l,u,r||e);else n(i.attrs)&&Nt(c,i.attrs),n(i.props)&&Nt(c,i.props);var f=new Tt(i,c,a,o,t),p=s.render.call(null,f._c,f);if(p instanceof pe)return Et(p,i,f.parent,s);if(Array.isArray(p)){for(var d=at(p)||[],v=new Array(d.length),h=0;h<d.length;h++)v[h]=Et(d[h],i,f.parent,s);return v}}(i,d,a,s,c);var v=a.on;if(a.on=a.nativeOn,r(i.options.abstract)){var m=a.slot;a={},m&&(a.slot=m)}!function(e){for(var t=e.hook||(e.hook={}),n=0;n<Dt.length;n++){var r=Dt[n],i=t[r],o=jt[r];i===o||i&&i._merged||(t[r]=i?Mt(o,i):o)}}(a);var y=i.options.name||l;return new pe("vue-component-"+i.cid+(y?"-"+y:""),a,void 0,void 0,void 0,s,{Ctor:i,propsData:d,listeners:v,tag:l,children:c},p)}}}function Mt(e,t){var n=function(n,r){e(n,r),t(n,r)};return n._merged=!0,n}var It=1,Ft=2;function Pt(e,a,s,c,u,l){return(Array.isArray(s)||i(s))&&(u=c,c=s,s=void 0),r(l)&&(u=Ft),function(e,i,a,s,c){if(n(a)&&n(a.__ob__))return ve();n(a)&&n(a.is)&&(i=a.is);if(!i)return ve();Array.isArray(s)&&"function"==typeof s[0]&&((a=a||{}).scopedSlots={default:s[0]},s.length=0);c===Ft?s=at(s):c===It&&(s=function(e){for(var t=0;t<e.length;t++)if(Array.isArray(e[t]))return Array.prototype.concat.apply([],e);return e}(s));var u,l;if("string"==typeof i){var f;l=e.$vnode&&e.$vnode.ns||F.getTagNamespace(i),u=F.isReservedTag(i)?new pe(F.parsePlatformTagName(i),a,s,void 0,void 0,e):a&&a.pre||!n(f=Le(e.$options,"components",i))?new pe(i,a,s,void 0,void 0,e):Lt(f,a,e,s,i)}else u=Lt(i,a,e,s);return Array.isArray(u)?u:n(u)?(n(l)&&function e(i,o,a){i.ns=o;"foreignObject"===i.tag&&(o=void 0,a=!0);if(n(i.children))for(var s=0,c=i.children.length;s<c;s++){var u=i.children[s];n(u.tag)&&(t(u.ns)||r(a)&&"svg"!==u.tag)&&e(u,o,a)}}(u,l),n(a)&&function(e){o(e.style)&&et(e.style);o(e.class)&&et(e.class)}(a),u):ve()}(e,a,s,c,u)}var Rt,Ht=null;function Bt(e,t){return(e.__esModule||oe&&"Module"===e[Symbol.toStringTag])&&(e=e.default),o(e)?t.extend(e):e}function Ut(e){return e.isComment&&e.asyncFactory}function zt(e){if(Array.isArray(e))for(var t=0;t<e.length;t++){var r=e[t];if(n(r)&&(n(r.componentOptions)||Ut(r)))return r}}function Vt(e,t){Rt.$on(e,t)}function Kt(e,t){Rt.$off(e,t)}function Jt(e,t){var n=Rt;return function r(){null!==t.apply(null,arguments)&&n.$off(e,r)}}function qt(e,t,n){Rt=e,rt(t,n||{},Vt,Kt,Jt,e),Rt=void 0}var Wt=null;function Zt(e){var t=Wt;return Wt=e,function(){Wt=t}}function Gt(e){for(;e&&(e=e.$parent);)if(e._inactive)return!0;return!1}function Xt(e,t){if(t){if(e._directInactive=!1,Gt(e))return}else if(e._directInactive)return;if(e._inactive||null===e._inactive){e._inactive=!1;for(var n=0;n<e.$children.length;n++)Xt(e.$children[n]);Yt(e,"activated")}}function Yt(e,t){le();var n=e.$options[t],r=t+" hook";if(n)for(var i=0,o=n.length;i<o;i++)He(n[i],e,null,e,r);e._hasHookEvent&&e.$emit("hook:"+t),fe()}var Qt=[],en=[],tn={},nn=!1,rn=!1,on=0;var an=0,sn=Date.now;if(z&&!q){var cn=window.performance;cn&&"function"==typeof cn.now&&sn()>document.createEvent("Event").timeStamp&&(sn=function(){return cn.now()})}function un(){var e,t;for(an=sn(),rn=!0,Qt.sort(function(e,t){return e.id-t.id}),on=0;on<Qt.length;on++)(e=Qt[on]).before&&e.before(),t=e.id,tn[t]=null,e.run();var n=en.slice(),r=Qt.slice();on=Qt.length=en.length=0,tn={},nn=rn=!1,function(e){for(var t=0;t<e.length;t++)e[t]._inactive=!0,Xt(e[t],!0)}(n),function(e){var t=e.length;for(;t--;){var n=e[t],r=n.vm;r._watcher===n&&r._isMounted&&!r._isDestroyed&&Yt(r,"updated")}}(r),ne&&F.devtools&&ne.emit("flush")}var ln=0,fn=function(e,t,n,r,i){this.vm=e,i&&(e._watcher=this),e._watchers.push(this),r?(this.deep=!!r.deep,this.user=!!r.user,this.lazy=!!r.lazy,this.sync=!!r.sync,this.before=r.before):this.deep=this.user=this.lazy=this.sync=!1,this.cb=n,this.id=++ln,this.active=!0,this.dirty=this.lazy,this.deps=[],this.newDeps=[],this.depIds=new ie,this.newDepIds=new ie,this.expression="","function"==typeof t?this.getter=t:(this.getter=function(e){if(!H.test(e)){var t=e.split(".");return function(e){for(var n=0;n<t.length;n++){if(!e)return;e=e[t[n]]}return e}}}(t),this.getter||(this.getter=S)),this.value=this.lazy?void 0:this.get()};fn.prototype.get=function(){var e;le(this);var t=this.vm;try{e=this.getter.call(t,t)}catch(e){if(!this.user)throw e;Re(e,t,'getter for watcher "'+this.expression+'"')}finally{this.deep&&et(e),fe(),this.cleanupDeps()}return e},fn.prototype.addDep=function(e){var t=e.id;this.newDepIds.has(t)||(this.newDepIds.add(t),this.newDeps.push(e),this.depIds.has(t)||e.addSub(this))},fn.prototype.cleanupDeps=function(){for(var e=this.deps.length;e--;){var t=this.deps[e];this.newDepIds.has(t.id)||t.removeSub(this)}var n=this.depIds;this.depIds=this.newDepIds,this.newDepIds=n,this.newDepIds.clear(),n=this.deps,this.deps=this.newDeps,this.newDeps=n,this.newDeps.length=0},fn.prototype.update=function(){this.lazy?this.dirty=!0:this.sync?this.run():function(e){var t=e.id;if(null==tn[t]){if(tn[t]=!0,rn){for(var n=Qt.length-1;n>on&&Qt[n].id>e.id;)n--;Qt.splice(n+1,0,e)}else Qt.push(e);nn||(nn=!0,Ye(un))}}(this)},fn.prototype.run=function(){if(this.active){var e=this.get();if(e!==this.value||o(e)||this.deep){var t=this.value;if(this.value=e,this.user)try{this.cb.call(this.vm,e,t)}catch(e){Re(e,this.vm,'callback for watcher "'+this.expression+'"')}else this.cb.call(this.vm,e,t)}}},fn.prototype.evaluate=function(){this.value=this.get(),this.dirty=!1},fn.prototype.depend=function(){for(var e=this.deps.length;e--;)this.deps[e].depend()},fn.prototype.teardown=function(){if(this.active){this.vm._isBeingDestroyed||h(this.vm._watchers,this);for(var e=this.deps.length;e--;)this.deps[e].removeSub(this);this.active=!1}};var pn={enumerable:!0,configurable:!0,get:S,set:S};function dn(e,t,n){pn.get=function(){return this[t][n]},pn.set=function(e){this[t][n]=e},Object.defineProperty(e,n,pn)}function vn(e){e._watchers=[];var t=e.$options;t.props&&function(e,t){var n=e.$options.propsData||{},r=e._props={},i=e.$options._propKeys=[];e.$parent&&$e(!1);var o=function(o){i.push(o);var a=Me(o,t,n,e);xe(r,o,a),o in e||dn(e,"_props",o)};for(var a in t)o(a);$e(!0)}(e,t.props),t.methods&&function(e,t){e.$options.props;for(var n in t)e[n]="function"!=typeof t[n]?S:x(t[n],e)}(e,t.methods),t.data?function(e){var t=e.$options.data;s(t=e._data="function"==typeof t?function(e,t){le();try{return e.call(t,t)}catch(e){return Re(e,t,"data()"),{}}finally{fe()}}(t,e):t||{})||(t={});var n=Object.keys(t),r=e.$options.props,i=(e.$options.methods,n.length);for(;i--;){var o=n[i];r&&y(r,o)||(a=void 0,36!==(a=(o+"").charCodeAt(0))&&95!==a&&dn(e,"_data",o))}var a;Ce(t,!0)}(e):Ce(e._data={},!0),t.computed&&function(e,t){var n=e._computedWatchers=Object.create(null),r=te();for(var i in t){var o=t[i],a="function"==typeof o?o:o.get;r||(n[i]=new fn(e,a||S,S,hn)),i in e||mn(e,i,o)}}(e,t.computed),t.watch&&t.watch!==Y&&function(e,t){for(var n in t){var r=t[n];if(Array.isArray(r))for(var i=0;i<r.length;i++)_n(e,n,r[i]);else _n(e,n,r)}}(e,t.watch)}var hn={lazy:!0};function mn(e,t,n){var r=!te();"function"==typeof n?(pn.get=r?yn(t):gn(n),pn.set=S):(pn.get=n.get?r&&!1!==n.cache?yn(t):gn(n.get):S,pn.set=n.set||S),Object.defineProperty(e,t,pn)}function yn(e){return function(){var t=this._computedWatchers&&this._computedWatchers[e];if(t)return t.dirty&&t.evaluate(),ce.target&&t.depend(),t.value}}function gn(e){return function(){return e.call(this,this)}}function _n(e,t,n,r){return s(n)&&(r=n,n=n.handler),"string"==typeof n&&(n=e[n]),e.$watch(t,n,r)}var bn=0;function $n(e){var t=e.options;if(e.super){var n=$n(e.super);if(n!==e.superOptions){e.superOptions=n;var r=function(e){var t,n=e.options,r=e.sealedOptions;for(var i in n)n[i]!==r[i]&&(t||(t={}),t[i]=n[i]);return t}(e);r&&A(e.extendOptions,r),(t=e.options=De(n,e.extendOptions)).name&&(t.components[t.name]=e)}}return t}function wn(e){this._init(e)}function Cn(e){e.cid=0;var t=1;e.extend=function(e){e=e||{};var n=this,r=n.cid,i=e._Ctor||(e._Ctor={});if(i[r])return i[r];var o=e.name||n.options.name,a=function(e){this._init(e)};return(a.prototype=Object.create(n.prototype)).constructor=a,a.cid=t++,a.options=De(n.options,e),a.super=n,a.options.props&&function(e){var t=e.options.props;for(var n in t)dn(e.prototype,"_props",n)}(a),a.options.computed&&function(e){var t=e.options.computed;for(var n in t)mn(e.prototype,n,t[n])}(a),a.extend=n.extend,a.mixin=n.mixin,a.use=n.use,M.forEach(function(e){a[e]=n[e]}),o&&(a.options.components[o]=a),a.superOptions=n.options,a.extendOptions=e,a.sealedOptions=A({},a.options),i[r]=a,a}}function xn(e){return e&&(e.Ctor.options.name||e.tag)}function kn(e,t){return Array.isArray(e)?e.indexOf(t)>-1:"string"==typeof e?e.split(",").indexOf(t)>-1:(n=e,"[object RegExp]"===a.call(n)&&e.test(t));var n}function An(e,t){var n=e.cache,r=e.keys,i=e._vnode;for(var o in n){var a=n[o];if(a){var s=xn(a.componentOptions);s&&!t(s)&&On(n,o,r,i)}}}function On(e,t,n,r){var i=e[t];!i||r&&i.tag===r.tag||i.componentInstance.$destroy(),e[t]=null,h(n,t)}!function(t){t.prototype._init=function(t){var n=this;n._uid=bn++,n._isVue=!0,t&&t._isComponent?function(e,t){var n=e.$options=Object.create(e.constructor.options),r=t._parentVnode;n.parent=t.parent,n._parentVnode=r;var i=r.componentOptions;n.propsData=i.propsData,n._parentListeners=i.listeners,n._renderChildren=i.children,n._componentTag=i.tag,t.render&&(n.render=t.render,n.staticRenderFns=t.staticRenderFns)}(n,t):n.$options=De($n(n.constructor),t||{},n),n._renderProxy=n,n._self=n,function(e){var t=e.$options,n=t.parent;if(n&&!t.abstract){for(;n.$options.abstract&&n.$parent;)n=n.$parent;n.$children.push(e)}e.$parent=n,e.$root=n?n.$root:e,e.$children=[],e.$refs={},e._watcher=null,e._inactive=null,e._directInactive=!1,e._isMounted=!1,e._isDestroyed=!1,e._isBeingDestroyed=!1}(n),function(e){e._events=Object.create(null),e._hasHookEvent=!1;var t=e.$options._parentListeners;t&&qt(e,t)}(n),function(t){t._vnode=null,t._staticTrees=null;var n=t.$options,r=t.$vnode=n._parentVnode,i=r&&r.context;t.$slots=ut(n._renderChildren,i),t.$scopedSlots=e,t._c=function(e,n,r,i){return Pt(t,e,n,r,i,!1)},t.$createElement=function(e,n,r,i){return Pt(t,e,n,r,i,!0)};var o=r&&r.data;xe(t,"$attrs",o&&o.attrs||e,null,!0),xe(t,"$listeners",n._parentListeners||e,null,!0)}(n),Yt(n,"beforeCreate"),function(e){var t=ct(e.$options.inject,e);t&&($e(!1),Object.keys(t).forEach(function(n){xe(e,n,t[n])}),$e(!0))}(n),vn(n),function(e){var t=e.$options.provide;t&&(e._provided="function"==typeof t?t.call(e):t)}(n),Yt(n,"created"),n.$options.el&&n.$mount(n.$options.el)}}(wn),function(e){var t={get:function(){return this._data}},n={get:function(){return this._props}};Object.defineProperty(e.prototype,"$data",t),Object.defineProperty(e.prototype,"$props",n),e.prototype.$set=ke,e.prototype.$delete=Ae,e.prototype.$watch=function(e,t,n){if(s(t))return _n(this,e,t,n);(n=n||{}).user=!0;var r=new fn(this,e,t,n);if(n.immediate)try{t.call(this,r.value)}catch(e){Re(e,this,'callback for immediate watcher "'+r.expression+'"')}return function(){r.teardown()}}}(wn),function(e){var t=/^hook:/;e.prototype.$on=function(e,n){var r=this;if(Array.isArray(e))for(var i=0,o=e.length;i<o;i++)r.$on(e[i],n);else(r._events[e]||(r._events[e]=[])).push(n),t.test(e)&&(r._hasHookEvent=!0);return r},e.prototype.$once=function(e,t){var n=this;function r(){n.$off(e,r),t.apply(n,arguments)}return r.fn=t,n.$on(e,r),n},e.prototype.$off=function(e,t){var n=this;if(!arguments.length)return n._events=Object.create(null),n;if(Array.isArray(e)){for(var r=0,i=e.length;r<i;r++)n.$off(e[r],t);return n}var o,a=n._events[e];if(!a)return n;if(!t)return n._events[e]=null,n;for(var s=a.length;s--;)if((o=a[s])===t||o.fn===t){a.splice(s,1);break}return n},e.prototype.$emit=function(e){var t=this._events[e];if(t){t=t.length>1?k(t):t;for(var n=k(arguments,1),r='event handler for "'+e+'"',i=0,o=t.length;i<o;i++)He(t[i],this,n,this,r)}return this}}(wn),function(e){e.prototype._update=function(e,t){var n=this,r=n.$el,i=n._vnode,o=Zt(n);n._vnode=e,n.$el=i?n.__patch__(i,e):n.__patch__(n.$el,e,t,!1),o(),r&&(r.__vue__=null),n.$el&&(n.$el.__vue__=n),n.$vnode&&n.$parent&&n.$vnode===n.$parent._vnode&&(n.$parent.$el=n.$el)},e.prototype.$forceUpdate=function(){this._watcher&&this._watcher.update()},e.prototype.$destroy=function(){var e=this;if(!e._isBeingDestroyed){Yt(e,"beforeDestroy"),e._isBeingDestroyed=!0;var t=e.$parent;!t||t._isBeingDestroyed||e.$options.abstract||h(t.$children,e),e._watcher&&e._watcher.teardown();for(var n=e._watchers.length;n--;)e._watchers[n].teardown();e._data.__ob__&&e._data.__ob__.vmCount--,e._isDestroyed=!0,e.__patch__(e._vnode,null),Yt(e,"destroyed"),e.$off(),e.$el&&(e.$el.__vue__=null),e.$vnode&&(e.$vnode.parent=null)}}}(wn),function(e){St(e.prototype),e.prototype.$nextTick=function(e){return Ye(e,this)},e.prototype._render=function(){var e,t=this,n=t.$options,r=n.render,i=n._parentVnode;i&&(t.$scopedSlots=ft(i.data.scopedSlots,t.$slots,t.$scopedSlots)),t.$vnode=i;try{Ht=t,e=r.call(t._renderProxy,t.$createElement)}catch(n){Re(n,t,"render"),e=t._vnode}finally{Ht=null}return Array.isArray(e)&&1===e.length&&(e=e[0]),e instanceof pe||(e=ve()),e.parent=i,e}}(wn);var Sn=[String,RegExp,Array],Tn={KeepAlive:{name:"keep-alive",abstract:!0,props:{include:Sn,exclude:Sn,max:[String,Number]},created:function(){this.cache=Object.create(null),this.keys=[]},destroyed:function(){for(var e in this.cache)On(this.cache,e,this.keys)},mounted:function(){var e=this;this.$watch("include",function(t){An(e,function(e){return kn(t,e)})}),this.$watch("exclude",function(t){An(e,function(e){return!kn(t,e)})})},render:function(){var e=this.$slots.default,t=zt(e),n=t&&t.componentOptions;if(n){var r=xn(n),i=this.include,o=this.exclude;if(i&&(!r||!kn(i,r))||o&&r&&kn(o,r))return t;var a=this.cache,s=this.keys,c=null==t.key?n.Ctor.cid+(n.tag?"::"+n.tag:""):t.key;a[c]?(t.componentInstance=a[c].componentInstance,h(s,c),s.push(c)):(a[c]=t,s.push(c),this.max&&s.length>parseInt(this.max)&&On(a,s[0],s,this._vnode)),t.data.keepAlive=!0}return t||e&&e[0]}}};!function(e){var t={get:function(){return F}};Object.defineProperty(e,"config",t),e.util={warn:ae,extend:A,mergeOptions:De,defineReactive:xe},e.set=ke,e.delete=Ae,e.nextTick=Ye,e.observable=function(e){return Ce(e),e},e.options=Object.create(null),M.forEach(function(t){e.options[t+"s"]=Object.create(null)}),e.options._base=e,A(e.options.components,Tn),function(e){e.use=function(e){var t=this._installedPlugins||(this._installedPlugins=[]);if(t.indexOf(e)>-1)return this;var n=k(arguments,1);return n.unshift(this),"function"==typeof e.install?e.install.apply(e,n):"function"==typeof e&&e.apply(null,n),t.push(e),this}}(e),function(e){e.mixin=function(e){return this.options=De(this.options,e),this}}(e),Cn(e),function(e){M.forEach(function(t){e[t]=function(e,n){return n?("component"===t&&s(n)&&(n.name=n.name||e,n=this.options._base.extend(n)),"directive"===t&&"function"==typeof n&&(n={bind:n,update:n}),this.options[t+"s"][e]=n,n):this.options[t+"s"][e]}})}(e)}(wn),Object.defineProperty(wn.prototype,"$isServer",{get:te}),Object.defineProperty(wn.prototype,"$ssrContext",{get:function(){return this.$vnode&&this.$vnode.ssrContext}}),Object.defineProperty(wn,"FunctionalRenderContext",{value:Tt}),wn.version="2.6.11";var En=p("style,class"),Nn=p("input,textarea,option,select,progress"),jn=function(e,t,n){return"value"===n&&Nn(e)&&"button"!==t||"selected"===n&&"option"===e||"checked"===n&&"input"===e||"muted"===n&&"video"===e},Dn=p("contenteditable,draggable,spellcheck"),Ln=p("events,caret,typing,plaintext-only"),Mn=function(e,t){return Hn(t)||"false"===t?"false":"contenteditable"===e&&Ln(t)?t:"true"},In=p("allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,defaultchecked,defaultmuted,defaultselected,defer,disabled,enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,translate,truespeed,typemustmatch,visible"),Fn="http://www.w3.org/1999/xlink",Pn=function(e){return":"===e.charAt(5)&&"xlink"===e.slice(0,5)},Rn=function(e){return Pn(e)?e.slice(6,e.length):""},Hn=function(e){return null==e||!1===e};function Bn(e){for(var t=e.data,r=e,i=e;n(i.componentInstance);)(i=i.componentInstance._vnode)&&i.data&&(t=Un(i.data,t));for(;n(r=r.parent);)r&&r.data&&(t=Un(t,r.data));return function(e,t){if(n(e)||n(t))return zn(e,Vn(t));return""}(t.staticClass,t.class)}function Un(e,t){return{staticClass:zn(e.staticClass,t.staticClass),class:n(e.class)?[e.class,t.class]:t.class}}function zn(e,t){return e?t?e+" "+t:e:t||""}function Vn(e){return Array.isArray(e)?function(e){for(var t,r="",i=0,o=e.length;i<o;i++)n(t=Vn(e[i]))&&""!==t&&(r&&(r+=" "),r+=t);return r}(e):o(e)?function(e){var t="";for(var n in e)e[n]&&(t&&(t+=" "),t+=n);return t}(e):"string"==typeof e?e:""}var Kn={svg:"http://www.w3.org/2000/svg",math:"http://www.w3.org/1998/Math/MathML"},Jn=p("html,body,base,head,link,meta,style,title,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,menuitem,summary,content,element,shadow,template,blockquote,iframe,tfoot"),qn=p("svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view",!0),Wn=function(e){return Jn(e)||qn(e)};function Zn(e){return qn(e)?"svg":"math"===e?"math":void 0}var Gn=Object.create(null);var Xn=p("text,number,password,search,email,tel,url");function Yn(e){if("string"==typeof e){var t=document.querySelector(e);return t||document.createElement("div")}return e}var Qn=Object.freeze({createElement:function(e,t){var n=document.createElement(e);return"select"!==e?n:(t.data&&t.data.attrs&&void 0!==t.data.attrs.multiple&&n.setAttribute("multiple","multiple"),n)},createElementNS:function(e,t){return document.createElementNS(Kn[e],t)},createTextNode:function(e){return document.createTextNode(e)},createComment:function(e){return document.createComment(e)},insertBefore:function(e,t,n){e.insertBefore(t,n)},removeChild:function(e,t){e.removeChild(t)},appendChild:function(e,t){e.appendChild(t)},parentNode:function(e){return e.parentNode},nextSibling:function(e){return e.nextSibling},tagName:function(e){return e.tagName},setTextContent:function(e,t){e.textContent=t},setStyleScope:function(e,t){e.setAttribute(t,"")}}),er={create:function(e,t){tr(t)},update:function(e,t){e.data.ref!==t.data.ref&&(tr(e,!0),tr(t))},destroy:function(e){tr(e,!0)}};function tr(e,t){var r=e.data.ref;if(n(r)){var i=e.context,o=e.componentInstance||e.elm,a=i.$refs;t?Array.isArray(a[r])?h(a[r],o):a[r]===o&&(a[r]=void 0):e.data.refInFor?Array.isArray(a[r])?a[r].indexOf(o)<0&&a[r].push(o):a[r]=[o]:a[r]=o}}var nr=new pe("",{},[]),rr=["create","activate","update","remove","destroy"];function ir(e,i){return e.key===i.key&&(e.tag===i.tag&&e.isComment===i.isComment&&n(e.data)===n(i.data)&&function(e,t){if("input"!==e.tag)return!0;var r,i=n(r=e.data)&&n(r=r.attrs)&&r.type,o=n(r=t.data)&&n(r=r.attrs)&&r.type;return i===o||Xn(i)&&Xn(o)}(e,i)||r(e.isAsyncPlaceholder)&&e.asyncFactory===i.asyncFactory&&t(i.asyncFactory.error))}function or(e,t,r){var i,o,a={};for(i=t;i<=r;++i)n(o=e[i].key)&&(a[o]=i);return a}var ar={create:sr,update:sr,destroy:function(e){sr(e,nr)}};function sr(e,t){(e.data.directives||t.data.directives)&&function(e,t){var n,r,i,o=e===nr,a=t===nr,s=ur(e.data.directives,e.context),c=ur(t.data.directives,t.context),u=[],l=[];for(n in c)r=s[n],i=c[n],r?(i.oldValue=r.value,i.oldArg=r.arg,fr(i,"update",t,e),i.def&&i.def.componentUpdated&&l.push(i)):(fr(i,"bind",t,e),i.def&&i.def.inserted&&u.push(i));if(u.length){var f=function(){for(var n=0;n<u.length;n++)fr(u[n],"inserted",t,e)};o?it(t,"insert",f):f()}l.length&&it(t,"postpatch",function(){for(var n=0;n<l.length;n++)fr(l[n],"componentUpdated",t,e)});if(!o)for(n in s)c[n]||fr(s[n],"unbind",e,e,a)}(e,t)}var cr=Object.create(null);function ur(e,t){var n,r,i=Object.create(null);if(!e)return i;for(n=0;n<e.length;n++)(r=e[n]).modifiers||(r.modifiers=cr),i[lr(r)]=r,r.def=Le(t.$options,"directives",r.name);return i}function lr(e){return e.rawName||e.name+"."+Object.keys(e.modifiers||{}).join(".")}function fr(e,t,n,r,i){var o=e.def&&e.def[t];if(o)try{o(n.elm,e,n,r,i)}catch(r){Re(r,n.context,"directive "+e.name+" "+t+" hook")}}var pr=[er,ar];function dr(e,r){var i=r.componentOptions;if(!(n(i)&&!1===i.Ctor.options.inheritAttrs||t(e.data.attrs)&&t(r.data.attrs))){var o,a,s=r.elm,c=e.data.attrs||{},u=r.data.attrs||{};for(o in n(u.__ob__)&&(u=r.data.attrs=A({},u)),u)a=u[o],c[o]!==a&&vr(s,o,a);for(o in(q||Z)&&u.value!==c.value&&vr(s,"value",u.value),c)t(u[o])&&(Pn(o)?s.removeAttributeNS(Fn,Rn(o)):Dn(o)||s.removeAttribute(o))}}function vr(e,t,n){e.tagName.indexOf("-")>-1?hr(e,t,n):In(t)?Hn(n)?e.removeAttribute(t):(n="allowfullscreen"===t&&"EMBED"===e.tagName?"true":t,e.setAttribute(t,n)):Dn(t)?e.setAttribute(t,Mn(t,n)):Pn(t)?Hn(n)?e.removeAttributeNS(Fn,Rn(t)):e.setAttributeNS(Fn,t,n):hr(e,t,n)}function hr(e,t,n){if(Hn(n))e.removeAttribute(t);else{if(q&&!W&&"TEXTAREA"===e.tagName&&"placeholder"===t&&""!==n&&!e.__ieph){var r=function(t){t.stopImmediatePropagation(),e.removeEventListener("input",r)};e.addEventListener("input",r),e.__ieph=!0}e.setAttribute(t,n)}}var mr={create:dr,update:dr};function yr(e,r){var i=r.elm,o=r.data,a=e.data;if(!(t(o.staticClass)&&t(o.class)&&(t(a)||t(a.staticClass)&&t(a.class)))){var s=Bn(r),c=i._transitionClasses;n(c)&&(s=zn(s,Vn(c))),s!==i._prevClass&&(i.setAttribute("class",s),i._prevClass=s)}}var gr,_r,br,$r,wr,Cr,xr={create:yr,update:yr},kr=/[\w).+\-_$\]]/;function Ar(e){var t,n,r,i,o,a=!1,s=!1,c=!1,u=!1,l=0,f=0,p=0,d=0;for(r=0;r<e.length;r++)if(n=t,t=e.charCodeAt(r),a)39===t&&92!==n&&(a=!1);else if(s)34===t&&92!==n&&(s=!1);else if(c)96===t&&92!==n&&(c=!1);else if(u)47===t&&92!==n&&(u=!1);else if(124!==t||124===e.charCodeAt(r+1)||124===e.charCodeAt(r-1)||l||f||p){switch(t){case 34:s=!0;break;case 39:a=!0;break;case 96:c=!0;break;case 40:p++;break;case 41:p--;break;case 91:f++;break;case 93:f--;break;case 123:l++;break;case 125:l--}if(47===t){for(var v=r-1,h=void 0;v>=0&&" "===(h=e.charAt(v));v--);h&&kr.test(h)||(u=!0)}}else void 0===i?(d=r+1,i=e.slice(0,r).trim()):m();function m(){(o||(o=[])).push(e.slice(d,r).trim()),d=r+1}if(void 0===i?i=e.slice(0,r).trim():0!==d&&m(),o)for(r=0;r<o.length;r++)i=Or(i,o[r]);return i}function Or(e,t){var n=t.indexOf("(");if(n<0)return'_f("'+t+'")('+e+")";var r=t.slice(0,n),i=t.slice(n+1);return'_f("'+r+'")('+e+(")"!==i?","+i:i)}function Sr(e,t){console.error("[Vue compiler]: "+e)}function Tr(e,t){return e?e.map(function(e){return e[t]}).filter(function(e){return e}):[]}function Er(e,t,n,r,i){(e.props||(e.props=[])).push(Rr({name:t,value:n,dynamic:i},r)),e.plain=!1}function Nr(e,t,n,r,i){(i?e.dynamicAttrs||(e.dynamicAttrs=[]):e.attrs||(e.attrs=[])).push(Rr({name:t,value:n,dynamic:i},r)),e.plain=!1}function jr(e,t,n,r){e.attrsMap[t]=n,e.attrsList.push(Rr({name:t,value:n},r))}function Dr(e,t,n,r,i,o,a,s){(e.directives||(e.directives=[])).push(Rr({name:t,rawName:n,value:r,arg:i,isDynamicArg:o,modifiers:a},s)),e.plain=!1}function Lr(e,t,n){return n?"_p("+t+',"'+e+'")':e+t}function Mr(t,n,r,i,o,a,s,c){var u;(i=i||e).right?c?n="("+n+")==='click'?'contextmenu':("+n+")":"click"===n&&(n="contextmenu",delete i.right):i.middle&&(c?n="("+n+")==='click'?'mouseup':("+n+")":"click"===n&&(n="mouseup")),i.capture&&(delete i.capture,n=Lr("!",n,c)),i.once&&(delete i.once,n=Lr("~",n,c)),i.passive&&(delete i.passive,n=Lr("&",n,c)),i.native?(delete i.native,u=t.nativeEvents||(t.nativeEvents={})):u=t.events||(t.events={});var l=Rr({value:r.trim(),dynamic:c},s);i!==e&&(l.modifiers=i);var f=u[n];Array.isArray(f)?o?f.unshift(l):f.push(l):u[n]=f?o?[l,f]:[f,l]:l,t.plain=!1}function Ir(e,t,n){var r=Fr(e,":"+t)||Fr(e,"v-bind:"+t);if(null!=r)return Ar(r);if(!1!==n){var i=Fr(e,t);if(null!=i)return JSON.stringify(i)}}function Fr(e,t,n){var r;if(null!=(r=e.attrsMap[t]))for(var i=e.attrsList,o=0,a=i.length;o<a;o++)if(i[o].name===t){i.splice(o,1);break}return n&&delete e.attrsMap[t],r}function Pr(e,t){for(var n=e.attrsList,r=0,i=n.length;r<i;r++){var o=n[r];if(t.test(o.name))return n.splice(r,1),o}}function Rr(e,t){return t&&(null!=t.start&&(e.start=t.start),null!=t.end&&(e.end=t.end)),e}function Hr(e,t,n){var r=n||{},i=r.number,o="$$v";r.trim&&(o="(typeof $$v === 'string'? $$v.trim(): $$v)"),i&&(o="_n("+o+")");var a=Br(t,o);e.model={value:"("+t+")",expression:JSON.stringify(t),callback:"function ($$v) {"+a+"}"}}function Br(e,t){var n=function(e){if(e=e.trim(),gr=e.length,e.indexOf("[")<0||e.lastIndexOf("]")<gr-1)return($r=e.lastIndexOf("."))>-1?{exp:e.slice(0,$r),key:'"'+e.slice($r+1)+'"'}:{exp:e,key:null};_r=e,$r=wr=Cr=0;for(;!zr();)Vr(br=Ur())?Jr(br):91===br&&Kr(br);return{exp:e.slice(0,wr),key:e.slice(wr+1,Cr)}}(e);return null===n.key?e+"="+t:"$set("+n.exp+", "+n.key+", "+t+")"}function Ur(){return _r.charCodeAt(++$r)}function zr(){return $r>=gr}function Vr(e){return 34===e||39===e}function Kr(e){var t=1;for(wr=$r;!zr();)if(Vr(e=Ur()))Jr(e);else if(91===e&&t++,93===e&&t--,0===t){Cr=$r;break}}function Jr(e){for(var t=e;!zr()&&(e=Ur())!==t;);}var qr,Wr="__r",Zr="__c";function Gr(e,t,n){var r=qr;return function i(){null!==t.apply(null,arguments)&&Qr(e,i,n,r)}}var Xr=Ve&&!(X&&Number(X[1])<=53);function Yr(e,t,n,r){if(Xr){var i=an,o=t;t=o._wrapper=function(e){if(e.target===e.currentTarget||e.timeStamp>=i||e.timeStamp<=0||e.target.ownerDocument!==document)return o.apply(this,arguments)}}qr.addEventListener(e,t,Q?{capture:n,passive:r}:n)}function Qr(e,t,n,r){(r||qr).removeEventListener(e,t._wrapper||t,n)}function ei(e,r){if(!t(e.data.on)||!t(r.data.on)){var i=r.data.on||{},o=e.data.on||{};qr=r.elm,function(e){if(n(e[Wr])){var t=q?"change":"input";e[t]=[].concat(e[Wr],e[t]||[]),delete e[Wr]}n(e[Zr])&&(e.change=[].concat(e[Zr],e.change||[]),delete e[Zr])}(i),rt(i,o,Yr,Qr,Gr,r.context),qr=void 0}}var ti,ni={create:ei,update:ei};function ri(e,r){if(!t(e.data.domProps)||!t(r.data.domProps)){var i,o,a=r.elm,s=e.data.domProps||{},c=r.data.domProps||{};for(i in n(c.__ob__)&&(c=r.data.domProps=A({},c)),s)i in c||(a[i]="");for(i in c){if(o=c[i],"textContent"===i||"innerHTML"===i){if(r.children&&(r.children.length=0),o===s[i])continue;1===a.childNodes.length&&a.removeChild(a.childNodes[0])}if("value"===i&&"PROGRESS"!==a.tagName){a._value=o;var u=t(o)?"":String(o);ii(a,u)&&(a.value=u)}else if("innerHTML"===i&&qn(a.tagName)&&t(a.innerHTML)){(ti=ti||document.createElement("div")).innerHTML="<svg>"+o+"</svg>";for(var l=ti.firstChild;a.firstChild;)a.removeChild(a.firstChild);for(;l.firstChild;)a.appendChild(l.firstChild)}else if(o!==s[i])try{a[i]=o}catch(e){}}}}function ii(e,t){return!e.composing&&("OPTION"===e.tagName||function(e,t){var n=!0;try{n=document.activeElement!==e}catch(e){}return n&&e.value!==t}(e,t)||function(e,t){var r=e.value,i=e._vModifiers;if(n(i)){if(i.number)return f(r)!==f(t);if(i.trim)return r.trim()!==t.trim()}return r!==t}(e,t))}var oi={create:ri,update:ri},ai=g(function(e){var t={},n=/:(.+)/;return e.split(/;(?![^(]*\))/g).forEach(function(e){if(e){var r=e.split(n);r.length>1&&(t[r[0].trim()]=r[1].trim())}}),t});function si(e){var t=ci(e.style);return e.staticStyle?A(e.staticStyle,t):t}function ci(e){return Array.isArray(e)?O(e):"string"==typeof e?ai(e):e}var ui,li=/^--/,fi=/\s*!important$/,pi=function(e,t,n){if(li.test(t))e.style.setProperty(t,n);else if(fi.test(n))e.style.setProperty(C(t),n.replace(fi,""),"important");else{var r=vi(t);if(Array.isArray(n))for(var i=0,o=n.length;i<o;i++)e.style[r]=n[i];else e.style[r]=n}},di=["Webkit","Moz","ms"],vi=g(function(e){if(ui=ui||document.createElement("div").style,"filter"!==(e=b(e))&&e in ui)return e;for(var t=e.charAt(0).toUpperCase()+e.slice(1),n=0;n<di.length;n++){var r=di[n]+t;if(r in ui)return r}});function hi(e,r){var i=r.data,o=e.data;if(!(t(i.staticStyle)&&t(i.style)&&t(o.staticStyle)&&t(o.style))){var a,s,c=r.elm,u=o.staticStyle,l=o.normalizedStyle||o.style||{},f=u||l,p=ci(r.data.style)||{};r.data.normalizedStyle=n(p.__ob__)?A({},p):p;var d=function(e,t){var n,r={};if(t)for(var i=e;i.componentInstance;)(i=i.componentInstance._vnode)&&i.data&&(n=si(i.data))&&A(r,n);(n=si(e.data))&&A(r,n);for(var o=e;o=o.parent;)o.data&&(n=si(o.data))&&A(r,n);return r}(r,!0);for(s in f)t(d[s])&&pi(c,s,"");for(s in d)(a=d[s])!==f[s]&&pi(c,s,null==a?"":a)}}var mi={create:hi,update:hi},yi=/\s+/;function gi(e,t){if(t&&(t=t.trim()))if(e.classList)t.indexOf(" ")>-1?t.split(yi).forEach(function(t){return e.classList.add(t)}):e.classList.add(t);else{var n=" "+(e.getAttribute("class")||"")+" ";n.indexOf(" "+t+" ")<0&&e.setAttribute("class",(n+t).trim())}}function _i(e,t){if(t&&(t=t.trim()))if(e.classList)t.indexOf(" ")>-1?t.split(yi).forEach(function(t){return e.classList.remove(t)}):e.classList.remove(t),e.classList.length||e.removeAttribute("class");else{for(var n=" "+(e.getAttribute("class")||"")+" ",r=" "+t+" ";n.indexOf(r)>=0;)n=n.replace(r," ");(n=n.trim())?e.setAttribute("class",n):e.removeAttribute("class")}}function bi(e){if(e){if("object"==typeof e){var t={};return!1!==e.css&&A(t,$i(e.name||"v")),A(t,e),t}return"string"==typeof e?$i(e):void 0}}var $i=g(function(e){return{enterClass:e+"-enter",enterToClass:e+"-enter-to",enterActiveClass:e+"-enter-active",leaveClass:e+"-leave",leaveToClass:e+"-leave-to",leaveActiveClass:e+"-leave-active"}}),wi=z&&!W,Ci="transition",xi="animation",ki="transition",Ai="transitionend",Oi="animation",Si="animationend";wi&&(void 0===window.ontransitionend&&void 0!==window.onwebkittransitionend&&(ki="WebkitTransition",Ai="webkitTransitionEnd"),void 0===window.onanimationend&&void 0!==window.onwebkitanimationend&&(Oi="WebkitAnimation",Si="webkitAnimationEnd"));var Ti=z?window.requestAnimationFrame?window.requestAnimationFrame.bind(window):setTimeout:function(e){return e()};function Ei(e){Ti(function(){Ti(e)})}function Ni(e,t){var n=e._transitionClasses||(e._transitionClasses=[]);n.indexOf(t)<0&&(n.push(t),gi(e,t))}function ji(e,t){e._transitionClasses&&h(e._transitionClasses,t),_i(e,t)}function Di(e,t,n){var r=Mi(e,t),i=r.type,o=r.timeout,a=r.propCount;if(!i)return n();var s=i===Ci?Ai:Si,c=0,u=function(){e.removeEventListener(s,l),n()},l=function(t){t.target===e&&++c>=a&&u()};setTimeout(function(){c<a&&u()},o+1),e.addEventListener(s,l)}var Li=/\b(transform|all)(,|$)/;function Mi(e,t){var n,r=window.getComputedStyle(e),i=(r[ki+"Delay"]||"").split(", "),o=(r[ki+"Duration"]||"").split(", "),a=Ii(i,o),s=(r[Oi+"Delay"]||"").split(", "),c=(r[Oi+"Duration"]||"").split(", "),u=Ii(s,c),l=0,f=0;return t===Ci?a>0&&(n=Ci,l=a,f=o.length):t===xi?u>0&&(n=xi,l=u,f=c.length):f=(n=(l=Math.max(a,u))>0?a>u?Ci:xi:null)?n===Ci?o.length:c.length:0,{type:n,timeout:l,propCount:f,hasTransform:n===Ci&&Li.test(r[ki+"Property"])}}function Ii(e,t){for(;e.length<t.length;)e=e.concat(e);return Math.max.apply(null,t.map(function(t,n){return Fi(t)+Fi(e[n])}))}function Fi(e){return 1e3*Number(e.slice(0,-1).replace(",","."))}function Pi(e,r){var i=e.elm;n(i._leaveCb)&&(i._leaveCb.cancelled=!0,i._leaveCb());var a=bi(e.data.transition);if(!t(a)&&!n(i._enterCb)&&1===i.nodeType){for(var s=a.css,c=a.type,u=a.enterClass,l=a.enterToClass,p=a.enterActiveClass,d=a.appearClass,v=a.appearToClass,h=a.appearActiveClass,m=a.beforeEnter,y=a.enter,g=a.afterEnter,_=a.enterCancelled,b=a.beforeAppear,$=a.appear,w=a.afterAppear,C=a.appearCancelled,x=a.duration,k=Wt,A=Wt.$vnode;A&&A.parent;)k=A.context,A=A.parent;var O=!k._isMounted||!e.isRootInsert;if(!O||$||""===$){var S=O&&d?d:u,T=O&&h?h:p,E=O&&v?v:l,N=O&&b||m,j=O&&"function"==typeof $?$:y,L=O&&w||g,M=O&&C||_,I=f(o(x)?x.enter:x),F=!1!==s&&!W,P=Bi(j),R=i._enterCb=D(function(){F&&(ji(i,E),ji(i,T)),R.cancelled?(F&&ji(i,S),M&&M(i)):L&&L(i),i._enterCb=null});e.data.show||it(e,"insert",function(){var t=i.parentNode,n=t&&t._pending&&t._pending[e.key];n&&n.tag===e.tag&&n.elm._leaveCb&&n.elm._leaveCb(),j&&j(i,R)}),N&&N(i),F&&(Ni(i,S),Ni(i,T),Ei(function(){ji(i,S),R.cancelled||(Ni(i,E),P||(Hi(I)?setTimeout(R,I):Di(i,c,R)))})),e.data.show&&(r&&r(),j&&j(i,R)),F||P||R()}}}function Ri(e,r){var i=e.elm;n(i._enterCb)&&(i._enterCb.cancelled=!0,i._enterCb());var a=bi(e.data.transition);if(t(a)||1!==i.nodeType)return r();if(!n(i._leaveCb)){var s=a.css,c=a.type,u=a.leaveClass,l=a.leaveToClass,p=a.leaveActiveClass,d=a.beforeLeave,v=a.leave,h=a.afterLeave,m=a.leaveCancelled,y=a.delayLeave,g=a.duration,_=!1!==s&&!W,b=Bi(v),$=f(o(g)?g.leave:g),w=i._leaveCb=D(function(){i.parentNode&&i.parentNode._pending&&(i.parentNode._pending[e.key]=null),_&&(ji(i,l),ji(i,p)),w.cancelled?(_&&ji(i,u),m&&m(i)):(r(),h&&h(i)),i._leaveCb=null});y?y(C):C()}function C(){w.cancelled||(!e.data.show&&i.parentNode&&((i.parentNode._pending||(i.parentNode._pending={}))[e.key]=e),d&&d(i),_&&(Ni(i,u),Ni(i,p),Ei(function(){ji(i,u),w.cancelled||(Ni(i,l),b||(Hi($)?setTimeout(w,$):Di(i,c,w)))})),v&&v(i,w),_||b||w())}}function Hi(e){return"number"==typeof e&&!isNaN(e)}function Bi(e){if(t(e))return!1;var r=e.fns;return n(r)?Bi(Array.isArray(r)?r[0]:r):(e._length||e.length)>1}function Ui(e,t){!0!==t.data.show&&Pi(t)}var zi=function(e){var o,a,s={},c=e.modules,u=e.nodeOps;for(o=0;o<rr.length;++o)for(s[rr[o]]=[],a=0;a<c.length;++a)n(c[a][rr[o]])&&s[rr[o]].push(c[a][rr[o]]);function l(e){var t=u.parentNode(e);n(t)&&u.removeChild(t,e)}function f(e,t,i,o,a,c,l){if(n(e.elm)&&n(c)&&(e=c[l]=me(e)),e.isRootInsert=!a,!function(e,t,i,o){var a=e.data;if(n(a)){var c=n(e.componentInstance)&&a.keepAlive;if(n(a=a.hook)&&n(a=a.init)&&a(e,!1),n(e.componentInstance))return d(e,t),v(i,e.elm,o),r(c)&&function(e,t,r,i){for(var o,a=e;a.componentInstance;)if(a=a.componentInstance._vnode,n(o=a.data)&&n(o=o.transition)){for(o=0;o<s.activate.length;++o)s.activate[o](nr,a);t.push(a);break}v(r,e.elm,i)}(e,t,i,o),!0}}(e,t,i,o)){var f=e.data,p=e.children,m=e.tag;n(m)?(e.elm=e.ns?u.createElementNS(e.ns,m):u.createElement(m,e),g(e),h(e,p,t),n(f)&&y(e,t),v(i,e.elm,o)):r(e.isComment)?(e.elm=u.createComment(e.text),v(i,e.elm,o)):(e.elm=u.createTextNode(e.text),v(i,e.elm,o))}}function d(e,t){n(e.data.pendingInsert)&&(t.push.apply(t,e.data.pendingInsert),e.data.pendingInsert=null),e.elm=e.componentInstance.$el,m(e)?(y(e,t),g(e)):(tr(e),t.push(e))}function v(e,t,r){n(e)&&(n(r)?u.parentNode(r)===e&&u.insertBefore(e,t,r):u.appendChild(e,t))}function h(e,t,n){if(Array.isArray(t))for(var r=0;r<t.length;++r)f(t[r],n,e.elm,null,!0,t,r);else i(e.text)&&u.appendChild(e.elm,u.createTextNode(String(e.text)))}function m(e){for(;e.componentInstance;)e=e.componentInstance._vnode;return n(e.tag)}function y(e,t){for(var r=0;r<s.create.length;++r)s.create[r](nr,e);n(o=e.data.hook)&&(n(o.create)&&o.create(nr,e),n(o.insert)&&t.push(e))}function g(e){var t;if(n(t=e.fnScopeId))u.setStyleScope(e.elm,t);else for(var r=e;r;)n(t=r.context)&&n(t=t.$options._scopeId)&&u.setStyleScope(e.elm,t),r=r.parent;n(t=Wt)&&t!==e.context&&t!==e.fnContext&&n(t=t.$options._scopeId)&&u.setStyleScope(e.elm,t)}function _(e,t,n,r,i,o){for(;r<=i;++r)f(n[r],o,e,t,!1,n,r)}function b(e){var t,r,i=e.data;if(n(i))for(n(t=i.hook)&&n(t=t.destroy)&&t(e),t=0;t<s.destroy.length;++t)s.destroy[t](e);if(n(t=e.children))for(r=0;r<e.children.length;++r)b(e.children[r])}function $(e,t,r){for(;t<=r;++t){var i=e[t];n(i)&&(n(i.tag)?(w(i),b(i)):l(i.elm))}}function w(e,t){if(n(t)||n(e.data)){var r,i=s.remove.length+1;for(n(t)?t.listeners+=i:t=function(e,t){function n(){0==--n.listeners&&l(e)}return n.listeners=t,n}(e.elm,i),n(r=e.componentInstance)&&n(r=r._vnode)&&n(r.data)&&w(r,t),r=0;r<s.remove.length;++r)s.remove[r](e,t);n(r=e.data.hook)&&n(r=r.remove)?r(e,t):t()}else l(e.elm)}function C(e,t,r,i){for(var o=r;o<i;o++){var a=t[o];if(n(a)&&ir(e,a))return o}}function x(e,i,o,a,c,l){if(e!==i){n(i.elm)&&n(a)&&(i=a[c]=me(i));var p=i.elm=e.elm;if(r(e.isAsyncPlaceholder))n(i.asyncFactory.resolved)?O(e.elm,i,o):i.isAsyncPlaceholder=!0;else if(r(i.isStatic)&&r(e.isStatic)&&i.key===e.key&&(r(i.isCloned)||r(i.isOnce)))i.componentInstance=e.componentInstance;else{var d,v=i.data;n(v)&&n(d=v.hook)&&n(d=d.prepatch)&&d(e,i);var h=e.children,y=i.children;if(n(v)&&m(i)){for(d=0;d<s.update.length;++d)s.update[d](e,i);n(d=v.hook)&&n(d=d.update)&&d(e,i)}t(i.text)?n(h)&&n(y)?h!==y&&function(e,r,i,o,a){for(var s,c,l,p=0,d=0,v=r.length-1,h=r[0],m=r[v],y=i.length-1,g=i[0],b=i[y],w=!a;p<=v&&d<=y;)t(h)?h=r[++p]:t(m)?m=r[--v]:ir(h,g)?(x(h,g,o,i,d),h=r[++p],g=i[++d]):ir(m,b)?(x(m,b,o,i,y),m=r[--v],b=i[--y]):ir(h,b)?(x(h,b,o,i,y),w&&u.insertBefore(e,h.elm,u.nextSibling(m.elm)),h=r[++p],b=i[--y]):ir(m,g)?(x(m,g,o,i,d),w&&u.insertBefore(e,m.elm,h.elm),m=r[--v],g=i[++d]):(t(s)&&(s=or(r,p,v)),t(c=n(g.key)?s[g.key]:C(g,r,p,v))?f(g,o,e,h.elm,!1,i,d):ir(l=r[c],g)?(x(l,g,o,i,d),r[c]=void 0,w&&u.insertBefore(e,l.elm,h.elm)):f(g,o,e,h.elm,!1,i,d),g=i[++d]);p>v?_(e,t(i[y+1])?null:i[y+1].elm,i,d,y,o):d>y&&$(r,p,v)}(p,h,y,o,l):n(y)?(n(e.text)&&u.setTextContent(p,""),_(p,null,y,0,y.length-1,o)):n(h)?$(h,0,h.length-1):n(e.text)&&u.setTextContent(p,""):e.text!==i.text&&u.setTextContent(p,i.text),n(v)&&n(d=v.hook)&&n(d=d.postpatch)&&d(e,i)}}}function k(e,t,i){if(r(i)&&n(e.parent))e.parent.data.pendingInsert=t;else for(var o=0;o<t.length;++o)t[o].data.hook.insert(t[o])}var A=p("attrs,class,staticClass,staticStyle,key");function O(e,t,i,o){var a,s=t.tag,c=t.data,u=t.children;if(o=o||c&&c.pre,t.elm=e,r(t.isComment)&&n(t.asyncFactory))return t.isAsyncPlaceholder=!0,!0;if(n(c)&&(n(a=c.hook)&&n(a=a.init)&&a(t,!0),n(a=t.componentInstance)))return d(t,i),!0;if(n(s)){if(n(u))if(e.hasChildNodes())if(n(a=c)&&n(a=a.domProps)&&n(a=a.innerHTML)){if(a!==e.innerHTML)return!1}else{for(var l=!0,f=e.firstChild,p=0;p<u.length;p++){if(!f||!O(f,u[p],i,o)){l=!1;break}f=f.nextSibling}if(!l||f)return!1}else h(t,u,i);if(n(c)){var v=!1;for(var m in c)if(!A(m)){v=!0,y(t,i);break}!v&&c.class&&et(c.class)}}else e.data!==t.text&&(e.data=t.text);return!0}return function(e,i,o,a){if(!t(i)){var c,l=!1,p=[];if(t(e))l=!0,f(i,p);else{var d=n(e.nodeType);if(!d&&ir(e,i))x(e,i,p,null,null,a);else{if(d){if(1===e.nodeType&&e.hasAttribute(L)&&(e.removeAttribute(L),o=!0),r(o)&&O(e,i,p))return k(i,p,!0),e;c=e,e=new pe(u.tagName(c).toLowerCase(),{},[],void 0,c)}var v=e.elm,h=u.parentNode(v);if(f(i,p,v._leaveCb?null:h,u.nextSibling(v)),n(i.parent))for(var y=i.parent,g=m(i);y;){for(var _=0;_<s.destroy.length;++_)s.destroy[_](y);if(y.elm=i.elm,g){for(var w=0;w<s.create.length;++w)s.create[w](nr,y);var C=y.data.hook.insert;if(C.merged)for(var A=1;A<C.fns.length;A++)C.fns[A]()}else tr(y);y=y.parent}n(h)?$([e],0,0):n(e.tag)&&b(e)}}return k(i,p,l),i.elm}n(e)&&b(e)}}({nodeOps:Qn,modules:[mr,xr,ni,oi,mi,z?{create:Ui,activate:Ui,remove:function(e,t){!0!==e.data.show?Ri(e,t):t()}}:{}].concat(pr)});W&&document.addEventListener("selectionchange",function(){var e=document.activeElement;e&&e.vmodel&&Xi(e,"input")});var Vi={inserted:function(e,t,n,r){"select"===n.tag?(r.elm&&!r.elm._vOptions?it(n,"postpatch",function(){Vi.componentUpdated(e,t,n)}):Ki(e,t,n.context),e._vOptions=[].map.call(e.options,Wi)):("textarea"===n.tag||Xn(e.type))&&(e._vModifiers=t.modifiers,t.modifiers.lazy||(e.addEventListener("compositionstart",Zi),e.addEventListener("compositionend",Gi),e.addEventListener("change",Gi),W&&(e.vmodel=!0)))},componentUpdated:function(e,t,n){if("select"===n.tag){Ki(e,t,n.context);var r=e._vOptions,i=e._vOptions=[].map.call(e.options,Wi);if(i.some(function(e,t){return!N(e,r[t])}))(e.multiple?t.value.some(function(e){return qi(e,i)}):t.value!==t.oldValue&&qi(t.value,i))&&Xi(e,"change")}}};function Ki(e,t,n){Ji(e,t,n),(q||Z)&&setTimeout(function(){Ji(e,t,n)},0)}function Ji(e,t,n){var r=t.value,i=e.multiple;if(!i||Array.isArray(r)){for(var o,a,s=0,c=e.options.length;s<c;s++)if(a=e.options[s],i)o=j(r,Wi(a))>-1,a.selected!==o&&(a.selected=o);else if(N(Wi(a),r))return void(e.selectedIndex!==s&&(e.selectedIndex=s));i||(e.selectedIndex=-1)}}function qi(e,t){return t.every(function(t){return!N(t,e)})}function Wi(e){return"_value"in e?e._value:e.value}function Zi(e){e.target.composing=!0}function Gi(e){e.target.composing&&(e.target.composing=!1,Xi(e.target,"input"))}function Xi(e,t){var n=document.createEvent("HTMLEvents");n.initEvent(t,!0,!0),e.dispatchEvent(n)}function Yi(e){return!e.componentInstance||e.data&&e.data.transition?e:Yi(e.componentInstance._vnode)}var Qi={model:Vi,show:{bind:function(e,t,n){var r=t.value,i=(n=Yi(n)).data&&n.data.transition,o=e.__vOriginalDisplay="none"===e.style.display?"":e.style.display;r&&i?(n.data.show=!0,Pi(n,function(){e.style.display=o})):e.style.display=r?o:"none"},update:function(e,t,n){var r=t.value;!r!=!t.oldValue&&((n=Yi(n)).data&&n.data.transition?(n.data.show=!0,r?Pi(n,function(){e.style.display=e.__vOriginalDisplay}):Ri(n,function(){e.style.display="none"})):e.style.display=r?e.__vOriginalDisplay:"none")},unbind:function(e,t,n,r,i){i||(e.style.display=e.__vOriginalDisplay)}}},eo={name:String,appear:Boolean,css:Boolean,mode:String,type:String,enterClass:String,leaveClass:String,enterToClass:String,leaveToClass:String,enterActiveClass:String,leaveActiveClass:String,appearClass:String,appearActiveClass:String,appearToClass:String,duration:[Number,String,Object]};function to(e){var t=e&&e.componentOptions;return t&&t.Ctor.options.abstract?to(zt(t.children)):e}function no(e){var t={},n=e.$options;for(var r in n.propsData)t[r]=e[r];var i=n._parentListeners;for(var o in i)t[b(o)]=i[o];return t}function ro(e,t){if(/\d-keep-alive$/.test(t.tag))return e("keep-alive",{props:t.componentOptions.propsData})}var io=function(e){return e.tag||Ut(e)},oo=function(e){return"show"===e.name},ao={name:"transition",props:eo,abstract:!0,render:function(e){var t=this,n=this.$slots.default;if(n&&(n=n.filter(io)).length){var r=this.mode,o=n[0];if(function(e){for(;e=e.parent;)if(e.data.transition)return!0}(this.$vnode))return o;var a=to(o);if(!a)return o;if(this._leaving)return ro(e,o);var s="__transition-"+this._uid+"-";a.key=null==a.key?a.isComment?s+"comment":s+a.tag:i(a.key)?0===String(a.key).indexOf(s)?a.key:s+a.key:a.key;var c=(a.data||(a.data={})).transition=no(this),u=this._vnode,l=to(u);if(a.data.directives&&a.data.directives.some(oo)&&(a.data.show=!0),l&&l.data&&!function(e,t){return t.key===e.key&&t.tag===e.tag}(a,l)&&!Ut(l)&&(!l.componentInstance||!l.componentInstance._vnode.isComment)){var f=l.data.transition=A({},c);if("out-in"===r)return this._leaving=!0,it(f,"afterLeave",function(){t._leaving=!1,t.$forceUpdate()}),ro(e,o);if("in-out"===r){if(Ut(a))return u;var p,d=function(){p()};it(c,"afterEnter",d),it(c,"enterCancelled",d),it(f,"delayLeave",function(e){p=e})}}return o}}},so=A({tag:String,moveClass:String},eo);function co(e){e.elm._moveCb&&e.elm._moveCb(),e.elm._enterCb&&e.elm._enterCb()}function uo(e){e.data.newPos=e.elm.getBoundingClientRect()}function lo(e){var t=e.data.pos,n=e.data.newPos,r=t.left-n.left,i=t.top-n.top;if(r||i){e.data.moved=!0;var o=e.elm.style;o.transform=o.WebkitTransform="translate("+r+"px,"+i+"px)",o.transitionDuration="0s"}}delete so.mode;var fo={Transition:ao,TransitionGroup:{props:so,beforeMount:function(){var e=this,t=this._update;this._update=function(n,r){var i=Zt(e);e.__patch__(e._vnode,e.kept,!1,!0),e._vnode=e.kept,i(),t.call(e,n,r)}},render:function(e){for(var t=this.tag||this.$vnode.data.tag||"span",n=Object.create(null),r=this.prevChildren=this.children,i=this.$slots.default||[],o=this.children=[],a=no(this),s=0;s<i.length;s++){var c=i[s];c.tag&&null!=c.key&&0!==String(c.key).indexOf("__vlist")&&(o.push(c),n[c.key]=c,(c.data||(c.data={})).transition=a)}if(r){for(var u=[],l=[],f=0;f<r.length;f++){var p=r[f];p.data.transition=a,p.data.pos=p.elm.getBoundingClientRect(),n[p.key]?u.push(p):l.push(p)}this.kept=e(t,null,u),this.removed=l}return e(t,null,o)},updated:function(){var e=this.prevChildren,t=this.moveClass||(this.name||"v")+"-move";e.length&&this.hasMove(e[0].elm,t)&&(e.forEach(co),e.forEach(uo),e.forEach(lo),this._reflow=document.body.offsetHeight,e.forEach(function(e){if(e.data.moved){var n=e.elm,r=n.style;Ni(n,t),r.transform=r.WebkitTransform=r.transitionDuration="",n.addEventListener(Ai,n._moveCb=function e(r){r&&r.target!==n||r&&!/transform$/.test(r.propertyName)||(n.removeEventListener(Ai,e),n._moveCb=null,ji(n,t))})}}))},methods:{hasMove:function(e,t){if(!wi)return!1;if(this._hasMove)return this._hasMove;var n=e.cloneNode();e._transitionClasses&&e._transitionClasses.forEach(function(e){_i(n,e)}),gi(n,t),n.style.display="none",this.$el.appendChild(n);var r=Mi(n);return this.$el.removeChild(n),this._hasMove=r.hasTransform}}}};wn.config.mustUseProp=jn,wn.config.isReservedTag=Wn,wn.config.isReservedAttr=En,wn.config.getTagNamespace=Zn,wn.config.isUnknownElement=function(e){if(!z)return!0;if(Wn(e))return!1;if(e=e.toLowerCase(),null!=Gn[e])return Gn[e];var t=document.createElement(e);return e.indexOf("-")>-1?Gn[e]=t.constructor===window.HTMLUnknownElement||t.constructor===window.HTMLElement:Gn[e]=/HTMLUnknownElement/.test(t.toString())},A(wn.options.directives,Qi),A(wn.options.components,fo),wn.prototype.__patch__=z?zi:S,wn.prototype.$mount=function(e,t){return function(e,t,n){var r;return e.$el=t,e.$options.render||(e.$options.render=ve),Yt(e,"beforeMount"),r=function(){e._update(e._render(),n)},new fn(e,r,S,{before:function(){e._isMounted&&!e._isDestroyed&&Yt(e,"beforeUpdate")}},!0),n=!1,null==e.$vnode&&(e._isMounted=!0,Yt(e,"mounted")),e}(this,e=e&&z?Yn(e):void 0,t)},z&&setTimeout(function(){F.devtools&&ne&&ne.emit("init",wn)},0);var po=/\{\{((?:.|\r?\n)+?)\}\}/g,vo=/[-.*+?^${}()|[\]\/\\]/g,ho=g(function(e){var t=e[0].replace(vo,"\\$&"),n=e[1].replace(vo,"\\$&");return new RegExp(t+"((?:.|\\n)+?)"+n,"g")});var mo={staticKeys:["staticClass"],transformNode:function(e,t){t.warn;var n=Fr(e,"class");n&&(e.staticClass=JSON.stringify(n));var r=Ir(e,"class",!1);r&&(e.classBinding=r)},genData:function(e){var t="";return e.staticClass&&(t+="staticClass:"+e.staticClass+","),e.classBinding&&(t+="class:"+e.classBinding+","),t}};var yo,go={staticKeys:["staticStyle"],transformNode:function(e,t){t.warn;var n=Fr(e,"style");n&&(e.staticStyle=JSON.stringify(ai(n)));var r=Ir(e,"style",!1);r&&(e.styleBinding=r)},genData:function(e){var t="";return e.staticStyle&&(t+="staticStyle:"+e.staticStyle+","),e.styleBinding&&(t+="style:("+e.styleBinding+"),"),t}},_o=function(e){return(yo=yo||document.createElement("div")).innerHTML=e,yo.textContent},bo=p("area,base,br,col,embed,frame,hr,img,input,isindex,keygen,link,meta,param,source,track,wbr"),$o=p("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source"),wo=p("address,article,aside,base,blockquote,body,caption,col,colgroup,dd,details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,title,tr,track"),Co=/^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/,xo=/^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/,ko="[a-zA-Z_][\\-\\.0-9_a-zA-Z"+P.source+"]*",Ao="((?:"+ko+"\\:)?"+ko+")",Oo=new RegExp("^<"+Ao),So=/^\s*(\/?)>/,To=new RegExp("^<\\/"+Ao+"[^>]*>"),Eo=/^<!DOCTYPE [^>]+>/i,No=/^<!\--/,jo=/^<!\[/,Do=p("script,style,textarea",!0),Lo={},Mo={"&lt;":"<","&gt;":">","&quot;":'"',"&amp;":"&","&#10;":"\n","&#9;":"\t","&#39;":"'"},Io=/&(?:lt|gt|quot|amp|#39);/g,Fo=/&(?:lt|gt|quot|amp|#39|#10|#9);/g,Po=p("pre,textarea",!0),Ro=function(e,t){return e&&Po(e)&&"\n"===t[0]};function Ho(e,t){var n=t?Fo:Io;return e.replace(n,function(e){return Mo[e]})}var Bo,Uo,zo,Vo,Ko,Jo,qo,Wo,Zo=/^@|^v-on:/,Go=/^v-|^@|^:|^#/,Xo=/([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/,Yo=/,([^,\}\]]*)(?:,([^,\}\]]*))?$/,Qo=/^\(|\)$/g,ea=/^\[.*\]$/,ta=/:(.*)$/,na=/^:|^\.|^v-bind:/,ra=/\.[^.\]]+(?=[^\]]*$)/g,ia=/^v-slot(:|$)|^#/,oa=/[\r\n]/,aa=/\s+/g,sa=g(_o),ca="_empty_";function ua(e,t,n){return{type:1,tag:e,attrsList:t,attrsMap:ma(t),rawAttrsMap:{},parent:n,children:[]}}function la(e,t){Bo=t.warn||Sr,Jo=t.isPreTag||T,qo=t.mustUseProp||T,Wo=t.getTagNamespace||T;t.isReservedTag;zo=Tr(t.modules,"transformNode"),Vo=Tr(t.modules,"preTransformNode"),Ko=Tr(t.modules,"postTransformNode"),Uo=t.delimiters;var n,r,i=[],o=!1!==t.preserveWhitespace,a=t.whitespace,s=!1,c=!1;function u(e){if(l(e),s||e.processed||(e=fa(e,t)),i.length||e===n||n.if&&(e.elseif||e.else)&&da(n,{exp:e.elseif,block:e}),r&&!e.forbidden)if(e.elseif||e.else)a=e,(u=function(e){var t=e.length;for(;t--;){if(1===e[t].type)return e[t];e.pop()}}(r.children))&&u.if&&da(u,{exp:a.elseif,block:a});else{if(e.slotScope){var o=e.slotTarget||'"default"';(r.scopedSlots||(r.scopedSlots={}))[o]=e}r.children.push(e),e.parent=r}var a,u;e.children=e.children.filter(function(e){return!e.slotScope}),l(e),e.pre&&(s=!1),Jo(e.tag)&&(c=!1);for(var f=0;f<Ko.length;f++)Ko[f](e,t)}function l(e){if(!c)for(var t;(t=e.children[e.children.length-1])&&3===t.type&&" "===t.text;)e.children.pop()}return function(e,t){for(var n,r,i=[],o=t.expectHTML,a=t.isUnaryTag||T,s=t.canBeLeftOpenTag||T,c=0;e;){if(n=e,r&&Do(r)){var u=0,l=r.toLowerCase(),f=Lo[l]||(Lo[l]=new RegExp("([\\s\\S]*?)(</"+l+"[^>]*>)","i")),p=e.replace(f,function(e,n,r){return u=r.length,Do(l)||"noscript"===l||(n=n.replace(/<!\--([\s\S]*?)-->/g,"$1").replace(/<!\[CDATA\[([\s\S]*?)]]>/g,"$1")),Ro(l,n)&&(n=n.slice(1)),t.chars&&t.chars(n),""});c+=e.length-p.length,e=p,A(l,c-u,c)}else{var d=e.indexOf("<");if(0===d){if(No.test(e)){var v=e.indexOf("--\x3e");if(v>=0){t.shouldKeepComment&&t.comment(e.substring(4,v),c,c+v+3),C(v+3);continue}}if(jo.test(e)){var h=e.indexOf("]>");if(h>=0){C(h+2);continue}}var m=e.match(Eo);if(m){C(m[0].length);continue}var y=e.match(To);if(y){var g=c;C(y[0].length),A(y[1],g,c);continue}var _=x();if(_){k(_),Ro(_.tagName,e)&&C(1);continue}}var b=void 0,$=void 0,w=void 0;if(d>=0){for($=e.slice(d);!(To.test($)||Oo.test($)||No.test($)||jo.test($)||(w=$.indexOf("<",1))<0);)d+=w,$=e.slice(d);b=e.substring(0,d)}d<0&&(b=e),b&&C(b.length),t.chars&&b&&t.chars(b,c-b.length,c)}if(e===n){t.chars&&t.chars(e);break}}function C(t){c+=t,e=e.substring(t)}function x(){var t=e.match(Oo);if(t){var n,r,i={tagName:t[1],attrs:[],start:c};for(C(t[0].length);!(n=e.match(So))&&(r=e.match(xo)||e.match(Co));)r.start=c,C(r[0].length),r.end=c,i.attrs.push(r);if(n)return i.unarySlash=n[1],C(n[0].length),i.end=c,i}}function k(e){var n=e.tagName,c=e.unarySlash;o&&("p"===r&&wo(n)&&A(r),s(n)&&r===n&&A(n));for(var u=a(n)||!!c,l=e.attrs.length,f=new Array(l),p=0;p<l;p++){var d=e.attrs[p],v=d[3]||d[4]||d[5]||"",h="a"===n&&"href"===d[1]?t.shouldDecodeNewlinesForHref:t.shouldDecodeNewlines;f[p]={name:d[1],value:Ho(v,h)}}u||(i.push({tag:n,lowerCasedTag:n.toLowerCase(),attrs:f,start:e.start,end:e.end}),r=n),t.start&&t.start(n,f,u,e.start,e.end)}function A(e,n,o){var a,s;if(null==n&&(n=c),null==o&&(o=c),e)for(s=e.toLowerCase(),a=i.length-1;a>=0&&i[a].lowerCasedTag!==s;a--);else a=0;if(a>=0){for(var u=i.length-1;u>=a;u--)t.end&&t.end(i[u].tag,n,o);i.length=a,r=a&&i[a-1].tag}else"br"===s?t.start&&t.start(e,[],!0,n,o):"p"===s&&(t.start&&t.start(e,[],!1,n,o),t.end&&t.end(e,n,o))}A()}(e,{warn:Bo,expectHTML:t.expectHTML,isUnaryTag:t.isUnaryTag,canBeLeftOpenTag:t.canBeLeftOpenTag,shouldDecodeNewlines:t.shouldDecodeNewlines,shouldDecodeNewlinesForHref:t.shouldDecodeNewlinesForHref,shouldKeepComment:t.comments,outputSourceRange:t.outputSourceRange,start:function(e,o,a,l,f){var p=r&&r.ns||Wo(e);q&&"svg"===p&&(o=function(e){for(var t=[],n=0;n<e.length;n++){var r=e[n];ya.test(r.name)||(r.name=r.name.replace(ga,""),t.push(r))}return t}(o));var d,v=ua(e,o,r);p&&(v.ns=p),"style"!==(d=v).tag&&("script"!==d.tag||d.attrsMap.type&&"text/javascript"!==d.attrsMap.type)||te()||(v.forbidden=!0);for(var h=0;h<Vo.length;h++)v=Vo[h](v,t)||v;s||(!function(e){null!=Fr(e,"v-pre")&&(e.pre=!0)}(v),v.pre&&(s=!0)),Jo(v.tag)&&(c=!0),s?function(e){var t=e.attrsList,n=t.length;if(n)for(var r=e.attrs=new Array(n),i=0;i<n;i++)r[i]={name:t[i].name,value:JSON.stringify(t[i].value)},null!=t[i].start&&(r[i].start=t[i].start,r[i].end=t[i].end);else e.pre||(e.plain=!0)}(v):v.processed||(pa(v),function(e){var t=Fr(e,"v-if");if(t)e.if=t,da(e,{exp:t,block:e});else{null!=Fr(e,"v-else")&&(e.else=!0);var n=Fr(e,"v-else-if");n&&(e.elseif=n)}}(v),function(e){null!=Fr(e,"v-once")&&(e.once=!0)}(v)),n||(n=v),a?u(v):(r=v,i.push(v))},end:function(e,t,n){var o=i[i.length-1];i.length-=1,r=i[i.length-1],u(o)},chars:function(e,t,n){if(r&&(!q||"textarea"!==r.tag||r.attrsMap.placeholder!==e)){var i,u,l,f=r.children;if(e=c||e.trim()?"script"===(i=r).tag||"style"===i.tag?e:sa(e):f.length?a?"condense"===a&&oa.test(e)?"":" ":o?" ":"":"")c||"condense"!==a||(e=e.replace(aa," ")),!s&&" "!==e&&(u=function(e,t){var n=t?ho(t):po;if(n.test(e)){for(var r,i,o,a=[],s=[],c=n.lastIndex=0;r=n.exec(e);){(i=r.index)>c&&(s.push(o=e.slice(c,i)),a.push(JSON.stringify(o)));var u=Ar(r[1].trim());a.push("_s("+u+")"),s.push({"@binding":u}),c=i+r[0].length}return c<e.length&&(s.push(o=e.slice(c)),a.push(JSON.stringify(o))),{expression:a.join("+"),tokens:s}}}(e,Uo))?l={type:2,expression:u.expression,tokens:u.tokens,text:e}:" "===e&&f.length&&" "===f[f.length-1].text||(l={type:3,text:e}),l&&f.push(l)}},comment:function(e,t,n){if(r){var i={type:3,text:e,isComment:!0};r.children.push(i)}}}),n}function fa(e,t){var n,r;(r=Ir(n=e,"key"))&&(n.key=r),e.plain=!e.key&&!e.scopedSlots&&!e.attrsList.length,function(e){var t=Ir(e,"ref");t&&(e.ref=t,e.refInFor=function(e){var t=e;for(;t;){if(void 0!==t.for)return!0;t=t.parent}return!1}(e))}(e),function(e){var t;"template"===e.tag?(t=Fr(e,"scope"),e.slotScope=t||Fr(e,"slot-scope")):(t=Fr(e,"slot-scope"))&&(e.slotScope=t);var n=Ir(e,"slot");n&&(e.slotTarget='""'===n?'"default"':n,e.slotTargetDynamic=!(!e.attrsMap[":slot"]&&!e.attrsMap["v-bind:slot"]),"template"===e.tag||e.slotScope||Nr(e,"slot",n,function(e,t){return e.rawAttrsMap[":"+t]||e.rawAttrsMap["v-bind:"+t]||e.rawAttrsMap[t]}(e,"slot")));if("template"===e.tag){var r=Pr(e,ia);if(r){var i=va(r),o=i.name,a=i.dynamic;e.slotTarget=o,e.slotTargetDynamic=a,e.slotScope=r.value||ca}}else{var s=Pr(e,ia);if(s){var c=e.scopedSlots||(e.scopedSlots={}),u=va(s),l=u.name,f=u.dynamic,p=c[l]=ua("template",[],e);p.slotTarget=l,p.slotTargetDynamic=f,p.children=e.children.filter(function(e){if(!e.slotScope)return e.parent=p,!0}),p.slotScope=s.value||ca,e.children=[],e.plain=!1}}}(e),function(e){"slot"===e.tag&&(e.slotName=Ir(e,"name"))}(e),function(e){var t;(t=Ir(e,"is"))&&(e.component=t);null!=Fr(e,"inline-template")&&(e.inlineTemplate=!0)}(e);for(var i=0;i<zo.length;i++)e=zo[i](e,t)||e;return function(e){var t,n,r,i,o,a,s,c,u=e.attrsList;for(t=0,n=u.length;t<n;t++)if(r=i=u[t].name,o=u[t].value,Go.test(r))if(e.hasBindings=!0,(a=ha(r.replace(Go,"")))&&(r=r.replace(ra,"")),na.test(r))r=r.replace(na,""),o=Ar(o),(c=ea.test(r))&&(r=r.slice(1,-1)),a&&(a.prop&&!c&&"innerHtml"===(r=b(r))&&(r="innerHTML"),a.camel&&!c&&(r=b(r)),a.sync&&(s=Br(o,"$event"),c?Mr(e,'"update:"+('+r+")",s,null,!1,0,u[t],!0):(Mr(e,"update:"+b(r),s,null,!1,0,u[t]),C(r)!==b(r)&&Mr(e,"update:"+C(r),s,null,!1,0,u[t])))),a&&a.prop||!e.component&&qo(e.tag,e.attrsMap.type,r)?Er(e,r,o,u[t],c):Nr(e,r,o,u[t],c);else if(Zo.test(r))r=r.replace(Zo,""),(c=ea.test(r))&&(r=r.slice(1,-1)),Mr(e,r,o,a,!1,0,u[t],c);else{var l=(r=r.replace(Go,"")).match(ta),f=l&&l[1];c=!1,f&&(r=r.slice(0,-(f.length+1)),ea.test(f)&&(f=f.slice(1,-1),c=!0)),Dr(e,r,i,o,f,c,a,u[t])}else Nr(e,r,JSON.stringify(o),u[t]),!e.component&&"muted"===r&&qo(e.tag,e.attrsMap.type,r)&&Er(e,r,"true",u[t])}(e),e}function pa(e){var t;if(t=Fr(e,"v-for")){var n=function(e){var t=e.match(Xo);if(!t)return;var n={};n.for=t[2].trim();var r=t[1].trim().replace(Qo,""),i=r.match(Yo);i?(n.alias=r.replace(Yo,"").trim(),n.iterator1=i[1].trim(),i[2]&&(n.iterator2=i[2].trim())):n.alias=r;return n}(t);n&&A(e,n)}}function da(e,t){e.ifConditions||(e.ifConditions=[]),e.ifConditions.push(t)}function va(e){var t=e.name.replace(ia,"");return t||"#"!==e.name[0]&&(t="default"),ea.test(t)?{name:t.slice(1,-1),dynamic:!0}:{name:'"'+t+'"',dynamic:!1}}function ha(e){var t=e.match(ra);if(t){var n={};return t.forEach(function(e){n[e.slice(1)]=!0}),n}}function ma(e){for(var t={},n=0,r=e.length;n<r;n++)t[e[n].name]=e[n].value;return t}var ya=/^xmlns:NS\d+/,ga=/^NS\d+:/;function _a(e){return ua(e.tag,e.attrsList.slice(),e.parent)}var ba=[mo,go,{preTransformNode:function(e,t){if("input"===e.tag){var n,r=e.attrsMap;if(!r["v-model"])return;if((r[":type"]||r["v-bind:type"])&&(n=Ir(e,"type")),r.type||n||!r["v-bind"]||(n="("+r["v-bind"]+").type"),n){var i=Fr(e,"v-if",!0),o=i?"&&("+i+")":"",a=null!=Fr(e,"v-else",!0),s=Fr(e,"v-else-if",!0),c=_a(e);pa(c),jr(c,"type","checkbox"),fa(c,t),c.processed=!0,c.if="("+n+")==='checkbox'"+o,da(c,{exp:c.if,block:c});var u=_a(e);Fr(u,"v-for",!0),jr(u,"type","radio"),fa(u,t),da(c,{exp:"("+n+")==='radio'"+o,block:u});var l=_a(e);return Fr(l,"v-for",!0),jr(l,":type",n),fa(l,t),da(c,{exp:i,block:l}),a?c.else=!0:s&&(c.elseif=s),c}}}}];var $a,wa,Ca={expectHTML:!0,modules:ba,directives:{model:function(e,t,n){var r=t.value,i=t.modifiers,o=e.tag,a=e.attrsMap.type;if(e.component)return Hr(e,r,i),!1;if("select"===o)!function(e,t,n){var r='var $$selectedVal = Array.prototype.filter.call($event.target.options,function(o){return o.selected}).map(function(o){var val = "_value" in o ? o._value : o.value;return '+(n&&n.number?"_n(val)":"val")+"});";r=r+" "+Br(t,"$event.target.multiple ? $$selectedVal : $$selectedVal[0]"),Mr(e,"change",r,null,!0)}(e,r,i);else if("input"===o&&"checkbox"===a)!function(e,t,n){var r=n&&n.number,i=Ir(e,"value")||"null",o=Ir(e,"true-value")||"true",a=Ir(e,"false-value")||"false";Er(e,"checked","Array.isArray("+t+")?_i("+t+","+i+")>-1"+("true"===o?":("+t+")":":_q("+t+","+o+")")),Mr(e,"change","var $$a="+t+",$$el=$event.target,$$c=$$el.checked?("+o+"):("+a+");if(Array.isArray($$a)){var $$v="+(r?"_n("+i+")":i)+",$$i=_i($$a,$$v);if($$el.checked){$$i<0&&("+Br(t,"$$a.concat([$$v])")+")}else{$$i>-1&&("+Br(t,"$$a.slice(0,$$i).concat($$a.slice($$i+1))")+")}}else{"+Br(t,"$$c")+"}",null,!0)}(e,r,i);else if("input"===o&&"radio"===a)!function(e,t,n){var r=n&&n.number,i=Ir(e,"value")||"null";Er(e,"checked","_q("+t+","+(i=r?"_n("+i+")":i)+")"),Mr(e,"change",Br(t,i),null,!0)}(e,r,i);else if("input"===o||"textarea"===o)!function(e,t,n){var r=e.attrsMap.type,i=n||{},o=i.lazy,a=i.number,s=i.trim,c=!o&&"range"!==r,u=o?"change":"range"===r?Wr:"input",l="$event.target.value";s&&(l="$event.target.value.trim()"),a&&(l="_n("+l+")");var f=Br(t,l);c&&(f="if($event.target.composing)return;"+f),Er(e,"value","("+t+")"),Mr(e,u,f,null,!0),(s||a)&&Mr(e,"blur","$forceUpdate()")}(e,r,i);else if(!F.isReservedTag(o))return Hr(e,r,i),!1;return!0},text:function(e,t){t.value&&Er(e,"textContent","_s("+t.value+")",t)},html:function(e,t){t.value&&Er(e,"innerHTML","_s("+t.value+")",t)}},isPreTag:function(e){return"pre"===e},isUnaryTag:bo,mustUseProp:jn,canBeLeftOpenTag:$o,isReservedTag:Wn,getTagNamespace:Zn,staticKeys:function(e){return e.reduce(function(e,t){return e.concat(t.staticKeys||[])},[]).join(",")}(ba)},xa=g(function(e){return p("type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap"+(e?","+e:""))});function ka(e,t){e&&($a=xa(t.staticKeys||""),wa=t.isReservedTag||T,function e(t){t.static=function(e){if(2===e.type)return!1;if(3===e.type)return!0;return!(!e.pre&&(e.hasBindings||e.if||e.for||d(e.tag)||!wa(e.tag)||function(e){for(;e.parent;){if("template"!==(e=e.parent).tag)return!1;if(e.for)return!0}return!1}(e)||!Object.keys(e).every($a)))}(t);if(1===t.type){if(!wa(t.tag)&&"slot"!==t.tag&&null==t.attrsMap["inline-template"])return;for(var n=0,r=t.children.length;n<r;n++){var i=t.children[n];e(i),i.static||(t.static=!1)}if(t.ifConditions)for(var o=1,a=t.ifConditions.length;o<a;o++){var s=t.ifConditions[o].block;e(s),s.static||(t.static=!1)}}}(e),function e(t,n){if(1===t.type){if((t.static||t.once)&&(t.staticInFor=n),t.static&&t.children.length&&(1!==t.children.length||3!==t.children[0].type))return void(t.staticRoot=!0);if(t.staticRoot=!1,t.children)for(var r=0,i=t.children.length;r<i;r++)e(t.children[r],n||!!t.for);if(t.ifConditions)for(var o=1,a=t.ifConditions.length;o<a;o++)e(t.ifConditions[o].block,n)}}(e,!1))}var Aa=/^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/,Oa=/\([^)]*?\);*$/,Sa=/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/,Ta={esc:27,tab:9,enter:13,space:32,up:38,left:37,right:39,down:40,delete:[8,46]},Ea={esc:["Esc","Escape"],tab:"Tab",enter:"Enter",space:[" ","Spacebar"],up:["Up","ArrowUp"],left:["Left","ArrowLeft"],right:["Right","ArrowRight"],down:["Down","ArrowDown"],delete:["Backspace","Delete","Del"]},Na=function(e){return"if("+e+")return null;"},ja={stop:"$event.stopPropagation();",prevent:"$event.preventDefault();",self:Na("$event.target !== $event.currentTarget"),ctrl:Na("!$event.ctrlKey"),shift:Na("!$event.shiftKey"),alt:Na("!$event.altKey"),meta:Na("!$event.metaKey"),left:Na("'button' in $event && $event.button !== 0"),middle:Na("'button' in $event && $event.button !== 1"),right:Na("'button' in $event && $event.button !== 2")};function Da(e,t){var n=t?"nativeOn:":"on:",r="",i="";for(var o in e){var a=La(e[o]);e[o]&&e[o].dynamic?i+=o+","+a+",":r+='"'+o+'":'+a+","}return r="{"+r.slice(0,-1)+"}",i?n+"_d("+r+",["+i.slice(0,-1)+"])":n+r}function La(e){if(!e)return"function(){}";if(Array.isArray(e))return"["+e.map(function(e){return La(e)}).join(",")+"]";var t=Sa.test(e.value),n=Aa.test(e.value),r=Sa.test(e.value.replace(Oa,""));if(e.modifiers){var i="",o="",a=[];for(var s in e.modifiers)if(ja[s])o+=ja[s],Ta[s]&&a.push(s);else if("exact"===s){var c=e.modifiers;o+=Na(["ctrl","shift","alt","meta"].filter(function(e){return!c[e]}).map(function(e){return"$event."+e+"Key"}).join("||"))}else a.push(s);return a.length&&(i+=function(e){return"if(!$event.type.indexOf('key')&&"+e.map(Ma).join("&&")+")return null;"}(a)),o&&(i+=o),"function($event){"+i+(t?"return "+e.value+"($event)":n?"return ("+e.value+")($event)":r?"return "+e.value:e.value)+"}"}return t||n?e.value:"function($event){"+(r?"return "+e.value:e.value)+"}"}function Ma(e){var t=parseInt(e,10);if(t)return"$event.keyCode!=="+t;var n=Ta[e],r=Ea[e];return"_k($event.keyCode,"+JSON.stringify(e)+","+JSON.stringify(n)+",$event.key,"+JSON.stringify(r)+")"}var Ia={on:function(e,t){e.wrapListeners=function(e){return"_g("+e+","+t.value+")"}},bind:function(e,t){e.wrapData=function(n){return"_b("+n+",'"+e.tag+"',"+t.value+","+(t.modifiers&&t.modifiers.prop?"true":"false")+(t.modifiers&&t.modifiers.sync?",true":"")+")"}},cloak:S},Fa=function(e){this.options=e,this.warn=e.warn||Sr,this.transforms=Tr(e.modules,"transformCode"),this.dataGenFns=Tr(e.modules,"genData"),this.directives=A(A({},Ia),e.directives);var t=e.isReservedTag||T;this.maybeComponent=function(e){return!!e.component||!t(e.tag)},this.onceId=0,this.staticRenderFns=[],this.pre=!1};function Pa(e,t){var n=new Fa(t);return{render:"with(this){return "+(e?Ra(e,n):'_c("div")')+"}",staticRenderFns:n.staticRenderFns}}function Ra(e,t){if(e.parent&&(e.pre=e.pre||e.parent.pre),e.staticRoot&&!e.staticProcessed)return Ha(e,t);if(e.once&&!e.onceProcessed)return Ba(e,t);if(e.for&&!e.forProcessed)return za(e,t);if(e.if&&!e.ifProcessed)return Ua(e,t);if("template"!==e.tag||e.slotTarget||t.pre){if("slot"===e.tag)return function(e,t){var n=e.slotName||'"default"',r=qa(e,t),i="_t("+n+(r?","+r:""),o=e.attrs||e.dynamicAttrs?Ga((e.attrs||[]).concat(e.dynamicAttrs||[]).map(function(e){return{name:b(e.name),value:e.value,dynamic:e.dynamic}})):null,a=e.attrsMap["v-bind"];!o&&!a||r||(i+=",null");o&&(i+=","+o);a&&(i+=(o?"":",null")+","+a);return i+")"}(e,t);var n;if(e.component)n=function(e,t,n){var r=t.inlineTemplate?null:qa(t,n,!0);return"_c("+e+","+Va(t,n)+(r?","+r:"")+")"}(e.component,e,t);else{var r;(!e.plain||e.pre&&t.maybeComponent(e))&&(r=Va(e,t));var i=e.inlineTemplate?null:qa(e,t,!0);n="_c('"+e.tag+"'"+(r?","+r:"")+(i?","+i:"")+")"}for(var o=0;o<t.transforms.length;o++)n=t.transforms[o](e,n);return n}return qa(e,t)||"void 0"}function Ha(e,t){e.staticProcessed=!0;var n=t.pre;return e.pre&&(t.pre=e.pre),t.staticRenderFns.push("with(this){return "+Ra(e,t)+"}"),t.pre=n,"_m("+(t.staticRenderFns.length-1)+(e.staticInFor?",true":"")+")"}function Ba(e,t){if(e.onceProcessed=!0,e.if&&!e.ifProcessed)return Ua(e,t);if(e.staticInFor){for(var n="",r=e.parent;r;){if(r.for){n=r.key;break}r=r.parent}return n?"_o("+Ra(e,t)+","+t.onceId+++","+n+")":Ra(e,t)}return Ha(e,t)}function Ua(e,t,n,r){return e.ifProcessed=!0,function e(t,n,r,i){if(!t.length)return i||"_e()";var o=t.shift();return o.exp?"("+o.exp+")?"+a(o.block)+":"+e(t,n,r,i):""+a(o.block);function a(e){return r?r(e,n):e.once?Ba(e,n):Ra(e,n)}}(e.ifConditions.slice(),t,n,r)}function za(e,t,n,r){var i=e.for,o=e.alias,a=e.iterator1?","+e.iterator1:"",s=e.iterator2?","+e.iterator2:"";return e.forProcessed=!0,(r||"_l")+"(("+i+"),function("+o+a+s+"){return "+(n||Ra)(e,t)+"})"}function Va(e,t){var n="{",r=function(e,t){var n=e.directives;if(!n)return;var r,i,o,a,s="directives:[",c=!1;for(r=0,i=n.length;r<i;r++){o=n[r],a=!0;var u=t.directives[o.name];u&&(a=!!u(e,o,t.warn)),a&&(c=!0,s+='{name:"'+o.name+'",rawName:"'+o.rawName+'"'+(o.value?",value:("+o.value+"),expression:"+JSON.stringify(o.value):"")+(o.arg?",arg:"+(o.isDynamicArg?o.arg:'"'+o.arg+'"'):"")+(o.modifiers?",modifiers:"+JSON.stringify(o.modifiers):"")+"},")}if(c)return s.slice(0,-1)+"]"}(e,t);r&&(n+=r+","),e.key&&(n+="key:"+e.key+","),e.ref&&(n+="ref:"+e.ref+","),e.refInFor&&(n+="refInFor:true,"),e.pre&&(n+="pre:true,"),e.component&&(n+='tag:"'+e.tag+'",');for(var i=0;i<t.dataGenFns.length;i++)n+=t.dataGenFns[i](e);if(e.attrs&&(n+="attrs:"+Ga(e.attrs)+","),e.props&&(n+="domProps:"+Ga(e.props)+","),e.events&&(n+=Da(e.events,!1)+","),e.nativeEvents&&(n+=Da(e.nativeEvents,!0)+","),e.slotTarget&&!e.slotScope&&(n+="slot:"+e.slotTarget+","),e.scopedSlots&&(n+=function(e,t,n){var r=e.for||Object.keys(t).some(function(e){var n=t[e];return n.slotTargetDynamic||n.if||n.for||Ka(n)}),i=!!e.if;if(!r)for(var o=e.parent;o;){if(o.slotScope&&o.slotScope!==ca||o.for){r=!0;break}o.if&&(i=!0),o=o.parent}var a=Object.keys(t).map(function(e){return Ja(t[e],n)}).join(",");return"scopedSlots:_u(["+a+"]"+(r?",null,true":"")+(!r&&i?",null,false,"+function(e){var t=5381,n=e.length;for(;n;)t=33*t^e.charCodeAt(--n);return t>>>0}(a):"")+")"}(e,e.scopedSlots,t)+","),e.model&&(n+="model:{value:"+e.model.value+",callback:"+e.model.callback+",expression:"+e.model.expression+"},"),e.inlineTemplate){var o=function(e,t){var n=e.children[0];if(n&&1===n.type){var r=Pa(n,t.options);return"inlineTemplate:{render:function(){"+r.render+"},staticRenderFns:["+r.staticRenderFns.map(function(e){return"function(){"+e+"}"}).join(",")+"]}"}}(e,t);o&&(n+=o+",")}return n=n.replace(/,$/,"")+"}",e.dynamicAttrs&&(n="_b("+n+',"'+e.tag+'",'+Ga(e.dynamicAttrs)+")"),e.wrapData&&(n=e.wrapData(n)),e.wrapListeners&&(n=e.wrapListeners(n)),n}function Ka(e){return 1===e.type&&("slot"===e.tag||e.children.some(Ka))}function Ja(e,t){var n=e.attrsMap["slot-scope"];if(e.if&&!e.ifProcessed&&!n)return Ua(e,t,Ja,"null");if(e.for&&!e.forProcessed)return za(e,t,Ja);var r=e.slotScope===ca?"":String(e.slotScope),i="function("+r+"){return "+("template"===e.tag?e.if&&n?"("+e.if+")?"+(qa(e,t)||"undefined")+":undefined":qa(e,t)||"undefined":Ra(e,t))+"}",o=r?"":",proxy:true";return"{key:"+(e.slotTarget||'"default"')+",fn:"+i+o+"}"}function qa(e,t,n,r,i){var o=e.children;if(o.length){var a=o[0];if(1===o.length&&a.for&&"template"!==a.tag&&"slot"!==a.tag){var s=n?t.maybeComponent(a)?",1":",0":"";return""+(r||Ra)(a,t)+s}var c=n?function(e,t){for(var n=0,r=0;r<e.length;r++){var i=e[r];if(1===i.type){if(Wa(i)||i.ifConditions&&i.ifConditions.some(function(e){return Wa(e.block)})){n=2;break}(t(i)||i.ifConditions&&i.ifConditions.some(function(e){return t(e.block)}))&&(n=1)}}return n}(o,t.maybeComponent):0,u=i||Za;return"["+o.map(function(e){return u(e,t)}).join(",")+"]"+(c?","+c:"")}}function Wa(e){return void 0!==e.for||"template"===e.tag||"slot"===e.tag}function Za(e,t){return 1===e.type?Ra(e,t):3===e.type&&e.isComment?(r=e,"_e("+JSON.stringify(r.text)+")"):"_v("+(2===(n=e).type?n.expression:Xa(JSON.stringify(n.text)))+")";var n,r}function Ga(e){for(var t="",n="",r=0;r<e.length;r++){var i=e[r],o=Xa(i.value);i.dynamic?n+=i.name+","+o+",":t+='"'+i.name+'":'+o+","}return t="{"+t.slice(0,-1)+"}",n?"_d("+t+",["+n.slice(0,-1)+"])":t}function Xa(e){return e.replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}new RegExp("\\b"+"do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,super,throw,while,yield,delete,export,import,return,switch,default,extends,finally,continue,debugger,function,arguments".split(",").join("\\b|\\b")+"\\b");function Ya(e,t){try{return new Function(e)}catch(n){return t.push({err:n,code:e}),S}}function Qa(e){var t=Object.create(null);return function(n,r,i){(r=A({},r)).warn;delete r.warn;var o=r.delimiters?String(r.delimiters)+n:n;if(t[o])return t[o];var a=e(n,r),s={},c=[];return s.render=Ya(a.render,c),s.staticRenderFns=a.staticRenderFns.map(function(e){return Ya(e,c)}),t[o]=s}}var es,ts,ns=(es=function(e,t){var n=la(e.trim(),t);!1!==t.optimize&&ka(n,t);var r=Pa(n,t);return{ast:n,render:r.render,staticRenderFns:r.staticRenderFns}},function(e){function t(t,n){var r=Object.create(e),i=[],o=[];if(n)for(var a in n.modules&&(r.modules=(e.modules||[]).concat(n.modules)),n.directives&&(r.directives=A(Object.create(e.directives||null),n.directives)),n)"modules"!==a&&"directives"!==a&&(r[a]=n[a]);r.warn=function(e,t,n){(n?o:i).push(e)};var s=es(t.trim(),r);return s.errors=i,s.tips=o,s}return{compile:t,compileToFunctions:Qa(t)}})(Ca),rs=(ns.compile,ns.compileToFunctions);function is(e){return(ts=ts||document.createElement("div")).innerHTML=e?'<a href="\n"/>':'<div a="\n"/>',ts.innerHTML.indexOf("&#10;")>0}var os=!!z&&is(!1),as=!!z&&is(!0),ss=g(function(e){var t=Yn(e);return t&&t.innerHTML}),cs=wn.prototype.$mount;wn.prototype.$mount=function(e,t){if((e=e&&Yn(e))===document.body||e===document.documentElement)return this;var n=this.$options;if(!n.render){var r=n.template;if(r)if("string"==typeof r)"#"===r.charAt(0)&&(r=ss(r));else{if(!r.nodeType)return this;r=r.innerHTML}else e&&(r=function(e){if(e.outerHTML)return e.outerHTML;var t=document.createElement("div");return t.appendChild(e.cloneNode(!0)),t.innerHTML}(e));if(r){var i=rs(r,{outputSourceRange:!1,shouldDecodeNewlines:os,shouldDecodeNewlinesForHref:as,delimiters:n.delimiters,comments:n.comments},this),o=i.render,a=i.staticRenderFns;n.render=o,n.staticRenderFns=a}}return cs.call(this,e,t)},wn.compile=rs,module.exports=wn;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"timers":8}],18:[function(require,module,exports){
'use strict';

/**
 * Stringify/parse functions that don't operate
 * recursively, so they avoid call stack exceeded
 * errors.
 */
exports.stringify = function stringify(input) {
  var queue = [];
  queue.push({obj: input});

  var res = '';
  var next, obj, prefix, val, i, arrayPrefix, keys, k, key, value, objPrefix;
  while ((next = queue.pop())) {
    obj = next.obj;
    prefix = next.prefix || '';
    val = next.val || '';
    res += prefix;
    if (val) {
      res += val;
    } else if (typeof obj !== 'object') {
      res += typeof obj === 'undefined' ? null : JSON.stringify(obj);
    } else if (obj === null) {
      res += 'null';
    } else if (Array.isArray(obj)) {
      queue.push({val: ']'});
      for (i = obj.length - 1; i >= 0; i--) {
        arrayPrefix = i === 0 ? '' : ',';
        queue.push({obj: obj[i], prefix: arrayPrefix});
      }
      queue.push({val: '['});
    } else { // object
      keys = [];
      for (k in obj) {
        if (obj.hasOwnProperty(k)) {
          keys.push(k);
        }
      }
      queue.push({val: '}'});
      for (i = keys.length - 1; i >= 0; i--) {
        key = keys[i];
        value = obj[key];
        objPrefix = (i > 0 ? ',' : '');
        objPrefix += JSON.stringify(key) + ':';
        queue.push({obj: value, prefix: objPrefix});
      }
      queue.push({val: '{'});
    }
  }
  return res;
};

// Convenience function for the parse function.
// This pop function is basically copied from
// pouchCollate.parseIndexableString
function pop(obj, stack, metaStack) {
  var lastMetaElement = metaStack[metaStack.length - 1];
  if (obj === lastMetaElement.element) {
    // popping a meta-element, e.g. an object whose value is another object
    metaStack.pop();
    lastMetaElement = metaStack[metaStack.length - 1];
  }
  var element = lastMetaElement.element;
  var lastElementIndex = lastMetaElement.index;
  if (Array.isArray(element)) {
    element.push(obj);
  } else if (lastElementIndex === stack.length - 2) { // obj with key+value
    var key = stack.pop();
    element[key] = obj;
  } else {
    stack.push(obj); // obj with key only
  }
}

exports.parse = function (str) {
  var stack = [];
  var metaStack = []; // stack for arrays and objects
  var i = 0;
  var collationIndex,parsedNum,numChar;
  var parsedString,lastCh,numConsecutiveSlashes,ch;
  var arrayElement, objElement;
  while (true) {
    collationIndex = str[i++];
    if (collationIndex === '}' ||
        collationIndex === ']' ||
        typeof collationIndex === 'undefined') {
      if (stack.length === 1) {
        return stack.pop();
      } else {
        pop(stack.pop(), stack, metaStack);
        continue;
      }
    }
    switch (collationIndex) {
      case ' ':
      case '\t':
      case '\n':
      case ':':
      case ',':
        break;
      case 'n':
        i += 3; // 'ull'
        pop(null, stack, metaStack);
        break;
      case 't':
        i += 3; // 'rue'
        pop(true, stack, metaStack);
        break;
      case 'f':
        i += 4; // 'alse'
        pop(false, stack, metaStack);
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '-':
        parsedNum = '';
        i--;
        while (true) {
          numChar = str[i++];
          if (/[\d\.\-e\+]/.test(numChar)) {
            parsedNum += numChar;
          } else {
            i--;
            break;
          }
        }
        pop(parseFloat(parsedNum), stack, metaStack);
        break;
      case '"':
        parsedString = '';
        lastCh = void 0;
        numConsecutiveSlashes = 0;
        while (true) {
          ch = str[i++];
          if (ch !== '"' || (lastCh === '\\' &&
              numConsecutiveSlashes % 2 === 1)) {
            parsedString += ch;
            lastCh = ch;
            if (lastCh === '\\') {
              numConsecutiveSlashes++;
            } else {
              numConsecutiveSlashes = 0;
            }
          } else {
            break;
          }
        }
        pop(JSON.parse('"' + parsedString + '"'), stack, metaStack);
        break;
      case '[':
        arrayElement = { element: [], index: stack.length };
        stack.push(arrayElement.element);
        metaStack.push(arrayElement);
        break;
      case '{':
        objElement = { element: {}, index: stack.length };
        stack.push(objElement.element);
        metaStack.push(objElement);
        break;
      default:
        throw new Error(
          'unexpectedly reached end of input: ' + collationIndex);
    }
  }
};

},{}],19:[function(require,module,exports){
;(function(){

const TreeField = require('./TreeField.vue');

module.exports = {
  props: {
    value: Object,
  },
  data() {
    return {
      doc: this.value
    };
  },
  components: {
    TreeField
  }
};

})()
if (module.exports.__esModule) module.exports = module.exports.default
var __vue__options__ = (typeof module.exports === "function"? module.exports.options: module.exports)
if (__vue__options__.functional) {console.error("[vueify] functional components are not supported and should be defined in plain js files using render functions.")}
__vue__options__.render = function render () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',[_c('div',{staticClass:"ui form"},[_c('tree-field',{model:{value:(_vm.doc),callback:function ($$v) {_vm.doc=$$v},expression:"doc"}})],1)])}
__vue__options__.staticRenderFns = []
if (module.hot) {(function () {  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-73faef72", __vue__options__)
  } else {
    hotAPI.reload("data-v-73faef72", __vue__options__)
  }
})()}
},{"./TreeField.vue":24,"vue":16,"vue-hot-reload-api":14}],20:[function(require,module,exports){
;(function(){

module.exports = {
  props: {
    id: String,
    rev: String,
    isCurrent: Boolean
  },
  data() {
    return {
      confirmDelete: false,
    };
  }
};

})()
if (module.exports.__esModule) module.exports = module.exports.default
var __vue__options__ = (typeof module.exports === "function"? module.exports.options: module.exports)
if (__vue__options__.functional) {console.error("[vueify] functional components are not supported and should be defined in plain js files using render functions.")}
__vue__options__.render = function render () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"item",class:{ active: _vm.isCurrent },on:{"click":function($event){$event.preventDefault();return _vm.$emit('loading', _vm.id)}}},[_c('a',{attrs:{"href":_vm.id}},[_vm._v(_vm._s(_vm.id))]),_vm._v(" "),(_vm.isCurrent)?_c('div',{staticClass:"menu"},[_c('a',{staticClass:"item",staticStyle:{"white-space":"nowrap"}},[_vm._v(_vm._s(_vm.rev))])]):_vm._e(),_vm._v(" "),(_vm.isCurrent)?_c('div',{staticClass:"ui right aligned container"},[_c('a',{staticClass:"ui basic negative icon mini button",attrs:{"href":_vm.id,"title":"delete this note"},on:{"click":function($event){$event.preventDefault();_vm.confirmDelete ? _vm.$emit('deleting', _vm.id) : _vm.confirmDelete = true},"blur":function($event){_vm.confirmDelete = false}}},[_c('i',{staticClass:"ui trash icon"}),_vm._v(" "),(!_vm.confirmDelete)?_c('span',[_vm._v("delete")]):_vm._e(),_vm._v(" "),(_vm.confirmDelete)?_c('span',[_vm._v("are you sure?")]):_vm._e()]),_vm._v(" "),_c('a',{staticClass:"ui positive mini button",on:{"click":function($event){$event.preventDefault();return _vm.$emit('saving')}}},[_vm._v("save")])]):_vm._e()])}
__vue__options__.staticRenderFns = []
if (module.hot) {(function () {  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-2196159d", __vue__options__)
  } else {
    hotAPI.reload("data-v-2196159d", __vue__options__)
  }
})()}
},{"vue":16,"vue-hot-reload-api":14}],21:[function(require,module,exports){
;(function(){

module.exports = {
  props: ['value'],
  methods: {
    saving($event) {
      try {
        this.$emit('input', JSON.parse($event.target.value));
      } catch (e) {
        // ignore JSON.parse error...because it'll be happening constantly
        // TODO: consider listening for a "save" event from parent instead
      }
    }
  }
};

})()
if (module.exports.__esModule) module.exports = module.exports.default
var __vue__options__ = (typeof module.exports === "function"? module.exports.options: module.exports)
if (__vue__options__.functional) {console.error("[vueify] functional components are not supported and should be defined in plain js files using render functions.")}
__vue__options__.render = function render () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('textarea',{domProps:{"value":JSON.stringify(_vm.value, null, '  ')},on:{"input":_vm.saving}})}
__vue__options__.staticRenderFns = []
if (module.hot) {(function () {  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-166dacfa", __vue__options__)
  } else {
    hotAPI.reload("data-v-166dacfa", __vue__options__)
  }
})()}
},{"vue":16,"vue-hot-reload-api":14}],22:[function(require,module,exports){
;(function(){

module.exports = {
  props: {
    show: Boolean
  },
  data() {
    return {
      username: '',
      password: '',
      url: ''
    };
  },
  methods: {
    showStyles() {
      return this.show ? 'display: flex !important' : '';
    }
  }
};

})()
if (module.exports.__esModule) module.exports = module.exports.default
var __vue__options__ = (typeof module.exports === "function"? module.exports.options: module.exports)
if (__vue__options__.functional) {console.error("[vueify] functional components are not supported and should be defined in plain js files using render functions.")}
__vue__options__.render = function render () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"ui dimmer modals page transition",class:{ visible: _vm.show, active: _vm.show },style:(_vm.showStyles)},[_c('div',{staticClass:"ui small modal transition active scrolling",class:{ visible: _vm.show, active: _vm.show }},[_c('div',{staticClass:"content"},[_c('div',{staticClass:"ui form"},[_c('div',{staticClass:"fields"},[_c('div',{staticClass:"four wide field"},[_c('label',[_vm._v("Username")]),_vm._v(" "),_c('input',{directives:[{name:"model",rawName:"v-model",value:(_vm.username),expression:"username"}],attrs:{"type":"text","placeholder":"username"},domProps:{"value":(_vm.username)},on:{"input":function($event){if($event.target.composing){ return; }_vm.username=$event.target.value}}})]),_vm._v(" "),_c('div',{staticClass:"four wide field"},[_c('label',[_vm._v("Password")]),_vm._v(" "),_c('input',{directives:[{name:"model",rawName:"v-model",value:(_vm.password),expression:"password"}],attrs:{"type":"password","placeholder":"password"},domProps:{"value":(_vm.password)},on:{"input":function($event){if($event.target.composing){ return; }_vm.password=$event.target.value}}})]),_vm._v(" "),_c('div',{staticClass:"eight wide field"},[_c('label',[_vm._v("CouchDB or PouchDB URL")]),_vm._v(" "),_c('div',{staticClass:"ui input"},[_c('input',{directives:[{name:"model",rawName:"v-model",value:(_vm.url),expression:"url"}],attrs:{"type":"text","placeholder":"https://example.com/database"},domProps:{"value":(_vm.url)},on:{"input":function($event){if($event.target.composing){ return; }_vm.url=$event.target.value}}})])])])])]),_vm._v(" "),_c('div',{staticClass:"actions"},[_c('div',{staticClass:"ui cancel icon button",on:{"click":function($event){return _vm.$emit('hiding')}}},[_c('i',{staticClass:"close icon"}),_vm._v(" Cancel\n      ")]),_vm._v(" "),_c('button',{staticClass:"ui positive icon button",on:{"click":function($event){return _vm.$emit('syncing', { url: _vm.url, username: _vm.username, password: _vm.password })}}},[_c('i',{staticClass:"random icon"}),_vm._v(" Sync\n      ")])])])])}
__vue__options__.staticRenderFns = []
if (module.hot) {(function () {  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-7034ff46", __vue__options__)
  } else {
    hotAPI.reload("data-v-7034ff46", __vue__options__)
  }
})()}
},{"vue":16,"vue-hot-reload-api":14}],23:[function(require,module,exports){
;(function(){

module.exports = {
  props: ['value']
};

})()
if (module.exports.__esModule) module.exports = module.exports.default
var __vue__options__ = (typeof module.exports === "function"? module.exports.options: module.exports)
if (__vue__options__.functional) {console.error("[vueify] functional components are not supported and should be defined in plain js files using render functions.")}
__vue__options__.render = function render () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('textarea',{domProps:{"value":_vm.value},on:{"input":function($event){return _vm.$emit('saving', $event.target.value)}}})}
__vue__options__.staticRenderFns = []
if (module.hot) {(function () {  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-66978b68", __vue__options__)
  } else {
    hotAPI.reload("data-v-66978b68", __vue__options__)
  }
})()}
},{"vue":16,"vue-hot-reload-api":14}],24:[function(require,module,exports){
;(function(){

const TextareaEditor = require('./TextareaEditor.vue');

module.exports = {
  name: 'tree-field',
  props: {
    value: Object
  },
  data() {
    return {
      doc: this.value
    };
  },
  computed: {
    topLevelKeys() {
      return Object.keys(this.value);
    }
  },
  components: {
    TextareaEditor
  },
  methods: {
    saveField(key, value) {
      this.doc[key] = value;
    }
  }
};

})()
if (module.exports.__esModule) module.exports = module.exports.default
var __vue__options__ = (typeof module.exports === "function"? module.exports.options: module.exports)
if (__vue__options__.functional) {console.error("[vueify] functional components are not supported and should be defined in plain js files using render functions.")}
__vue__options__.render = function render () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"ui basic segment",staticStyle:{"padding-top":"0","padding-bottom":"0"}},_vm._l((_vm.topLevelKeys),function(key){return _c('div',{key:key,staticClass:"field"},[_c('label',[_vm._v(_vm._s(key))]),_vm._v(" "),(typeof _vm.doc[key] === 'object')?_c('tree-field',{model:{value:(_vm.doc[key]),callback:function ($$v) {_vm.$set(_vm.doc, key, $$v)},expression:"doc[key]"}}):(typeof _vm.doc[key] === 'string' && _vm.doc[key].search('\\n') > -1)?_c('textarea-editor',{on:{"saving":function($event){return _vm.saveField(key, $event)}},model:{value:(_vm.doc[key]),callback:function ($$v) {_vm.$set(_vm.doc, key, $$v)},expression:"doc[key]"}}):_c('input',{directives:[{name:"model",rawName:"v-model",value:(_vm.doc[key]),expression:"doc[key]"}],attrs:{"type":"text"},domProps:{"value":(_vm.doc[key])},on:{"input":function($event){if($event.target.composing){ return; }_vm.$set(_vm.doc, key, $event.target.value)}}})],1)}),0)}
__vue__options__.staticRenderFns = []
if (module.hot) {(function () {  var hotAPI = require("vue-hot-reload-api")
  hotAPI.install(require("vue"), true)
  if (!hotAPI.compatible) return
  module.hot.accept()
  if (!module.hot.data) {
    hotAPI.createRecord("data-v-11ab5af2", __vue__options__)
  } else {
    hotAPI.reload("data-v-11ab5af2", __vue__options__)
  }
})()}
},{"./TextareaEditor.vue":23,"vue":16,"vue-hot-reload-api":14}],25:[function(require,module,exports){
const PouchDB = require('pouchdb-browser');
const Vue = require('vue');

Vue.config.debug = true;

const DesignDocEditor = require('./DesignDocEditor.vue');
const DocLink = require('./DocLink.vue');
const JsonEditor = require('./JsonEditor.vue');
const SyncModal = require('./SyncModal.vue');

let db = new PouchDB('holst'); // !!! only temporary...changes to actual db
window.db = db;

window.app = new Vue({
  el: '#app',
  filters: {
    json(value) {
      return JSON.parse(value, null, '  ');
    }
  },
  components: {
    DesignDocEditor,
    DocLink,
    JsonEditor,
    SyncModal
  },
  data: {
    new_doc_name: '',
    url: '',
    doc_id: '',
    doc_rev: '',
    doc_attachments: {},
    doc: {}, // the doc without the underscores
    ids: {},
    showSyncForm: false
  },
  computed: {
    completeDoc() {
      const underscores = { _id: this.doc_id };
      if (this.doc_rev !== '') {
        underscores._rev = this.doc_rev;
      }
      if (this.doc_attachments !== undefined && Object.keys(this.doc_attachments).length > 0) {
        underscores._attachments = this.doc_attachments;
      }
      return Object.assign(this.doc, underscores);
    },
    docEditor() {
      return this.doc_id.substr(0, 8) === '_design/'
        ? 'DesignDocEditor'
        : 'JsonEditor';
    }
  },
  created() {
    this.listDocs();
  },
  methods: {
    setDBUrl() {
      // TODO: validate / force remote URL?
      db = new PouchDB(this.url);
      this.listDocs();
    },
    listDocs() {
      const self = this;
      db.allDocs()
        .then((resp) => {
          self.ids = {};
          for (let i = 0; i < resp.rows.length; i++) {
            self.ids[resp.rows[i].key] = resp.rows[i].value.rev;
          }
        });
    },
    newDoc() {
      const self = this;
      if (self.new_doc_name !== '') {
        // save the doc immediately
        db.put({ _id: self.new_doc_name })
          .then((resp) => {
            if (resp.ok) {
              // store the _id & _rev, so we can PUT the update later
              self.doc_id = resp.id;
              self.doc_rev = resp.rev;
              self.doc = {};
              // reset the new doc value for future use
              self.new_doc_name = '';
              // reload the list of docs
              self.listDocs();
            }
          }).catch(console.error.bind(console));
      } else {
        // TODO: um..yeah..error handling...
        alert('Documents need names...sorry.');
      }
    },
    loadDoc(id) {
      const self = this;
      db.get(id)
        .then((doc) => {
          self.doc_id = doc._id;
          self.doc_rev = doc._rev;
          self.doc_attachments = doc._attachments;
          const tempDoc = doc;
          delete tempDoc._id;
          delete tempDoc._rev;
          delete tempDoc._attachments;
          self.doc = tempDoc;
        });
    },
    saveDoc() {
      const self = this;
      db.put(self.completeDoc)
        .then((resp) => {
          if (resp.ok) {
            self.ids[resp.id] = resp.rev;
            self.doc_rev = resp.rev;
          }
        });
      // TODO: handle errors and stuff
    },
    deleteDoc() {
      db.remove(this.completeDoc)
        .then((resp) => {
          if (resp.ok) {
            this.doc_id = '';
            this.doc_rev = '';
            this.listDocs();
          }
        });
      // TODO: handle errors
    },
    syncTo(opts) {
      const self = this;
      const auth = (opts.user !== '' && opts.password !== '')
        ? {
          auth: {
            user: this.remote.user,
            password: this.remote.password
          }
        }
        : {};

      // TODO: maybe do some validation or something
      const remote = new PouchDB(opts.url, auth);
      db.sync(remote)
        .on('complete', (info) => {
          console.info('sync info', info);
          alert('woot!');
          self.showSyncForm = false;
          self.listDocs();
        })
        .on('error', console.error);
    }
  }
});

},{"./DesignDocEditor.vue":19,"./DocLink.vue":20,"./JsonEditor.vue":21,"./SyncModal.vue":22,"pouchdb-browser":5,"vue":16}]},{},[25]);
