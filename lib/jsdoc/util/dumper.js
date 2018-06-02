/* global Set */
/**
 * Recursively print out all names and values in a data structure.
 * @module jsdoc/util/dumper
 */

var util = require('util');

var OBJECT_WALKER_KEY = 'hasBeenSeenByWalkerDumper';
var SET_DEFINED = typeof Set !== 'undefined';

class ObjectWalker {
  constructor() {
    this.seenItems = SET_DEFINED ? new Set() : [];
  }

  seen = (object) => {
    var result;

    if (SET_DEFINED) {
      result = this.seenItems.has(object);
    } else {
      result = object[OBJECT_WALKER_KEY];
    }

    return result;
  };

  markAsSeen = (object) => {
    if (SET_DEFINED) {
      this.seenItems.add(object);
    } else {
      object[OBJECT_WALKER_KEY] = true;
      this.seenItems.push(object);
    }
  };

  removeSeenFlag = (obj) => {
    if (SET_DEFINED) {
      this.seenItems.delete(obj);
    } else {
      delete obj[OBJECT_WALKER_KEY];
    }
  };

  // some objects are unwalkable, like Java native objects
  isUnwalkable = o => o && typeof o === 'object' && typeof o.constructor === 'undefined';

  isFunction = o => (o && typeof o === 'function') || o instanceof Function;

  isObject = o =>
    (o && o instanceof Object) ||
    (o && typeof o.constructor !== 'undefined' && o.constructor.name === 'Object');

  checkCircularRefs = (o, func) => {
    if (this.seen(o)) {
      return '<CircularRef>';
    }
    this.markAsSeen(o);

    return func(o);
  };

  walk = (o) => {
    var result;

    var self = this;

    if (this.isUnwalkable(o)) {
      result = '<Object>';
    } else if (o === undefined) {
      result = null;
    } else if (Array.isArray(o)) {
      result = this.checkCircularRefs(o, (arr) => {
        var newArray = [];

        arr.forEach((item) => {
          newArray.push(self.walk(item));
        });

        self.removeSeenFlag(arr);

        return newArray;
      });
    } else if (util.isRegExp(o)) {
      result = `<RegExp ${o}>`;
    } else if (util.isDate(o)) {
      result = `<Date ${o.toUTCString()}>`;
    } else if (util.isError(o)) {
      result = { message: o.message };
    } else if (this.isFunction(o)) {
      result = `<Function${o.name ? ` ${o.name}` : ''}>`;
    } else if (this.isObject(o) && o !== null) {
      result = this.checkCircularRefs(o, (obj) => {
        var newObj = {};

        Object.keys(obj).forEach((key) => {
          if (!SET_DEFINED && key === OBJECT_WALKER_KEY) {
            return;
          }
          newObj[key] = self.walk(obj[key]);
        });

        self.removeSeenFlag(obj);

        return newObj;
      });
    }
    // should be safe to JSON.stringify() everything else
    else {
      result = o;
    }

    return result;
  };
}

/**
 * @param {*} object
 */
export function dump() {
  var args = Array.prototype.slice.call(arguments, 0);
  var result = [];
  var walker;

  for (var i = 0, l = args.length; i < l; i++) {
    walker = new ObjectWalker();
    result.push(JSON.stringify(walker.walk(args[i]), null, 4));
  }

  return result.join('\n');
}
