'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

const omit = key => ['Subscription'].includes(key);

const maybeMap = (key, fn, obj) => omit(key) ? obj[key] : fn(obj[key], key, obj);

const mapObj = fn => obj => {
  if (obj.constructor.name === 'Object') {
    return Object.keys(obj).reduce((acc, key) => _extends({}, acc, {
      [key]: maybeMap(key, fn, obj)
    }), {});
  } else {
    return obj;
  }
};

const checkFn = (fn, fieldName) => {
  if (typeof fn !== 'function') {
    throw new Error(`Expected Function for ${fieldName} resolver but received ${typeof fn}`);
  }
};

const wrapFn = namespace => (fn, fieldName) => {
  checkFn(fn, fieldName);
  return (root, args, context, info) => fn(root, args, context[namespace], info);
};

exports.default = (namespace, resolvers) => {
  if (resolvers instanceof Object) {
    return mapObj(mapObj(wrapFn(namespace)))(resolvers);
  }
};