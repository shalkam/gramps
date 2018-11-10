"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* eslint-disable no-console */
const defaultLogger = {
  info: msg => console.info(msg),
  warn: msg => console.warn(msg),
  error: msg => console.error(msg)
};

exports.default = defaultLogger;