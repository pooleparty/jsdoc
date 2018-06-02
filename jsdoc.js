#!/usr/bin/env node
/* global require: true */
/* eslint strict: ["error", "function"] */

// initialize the environment for Node.js
var fs = require('fs');
var path = require('path');

var jsdocPath = __dirname;
var pwd = process.cwd();

// Create a custom require method that adds `lib/jsdoc` and `node_modules` to the module
// lookup path. This makes it possible to `require('jsdoc/foo')` from external templates and
// plugins, and within JSDoc itself. It also allows external templates and plugins to
// require JSDoc's module dependencies without installing them locally.
require = require('requizzle')({
  requirePaths: {
    before: [path.join(__dirname, 'lib')],
    after: [path.join(__dirname, 'node_modules')],
  },
  infect: true,
});

// resolve the path if it's a symlink
if (fs.statSync(jsdocPath).isSymbolicLink()) {
  jsdocPath = path.resolve(path.dirname(jsdocPath), fs.readlinkSync(jsdocPath));
}

const env = require('./lib/jsdoc/env');

env.dirname = jsdocPath;
env.pwd = pwd;
env.args = process.argv.slice(2);

var cli = require('./cli');

function cb(errorCode) {
  cli.logFinish();
  cli.exit(errorCode || 0);
}

cli.setVersionInfo();
cli.loadConfig();

if (!env.opts.test) {
  cli.configureLogger();
}

cli.logStart();

if (env.opts.debug) {
  /**
   * Recursively print an object's properties to stdout. This method is safe to use with
   * objects that contain circular references.
   *
   * This method is available only when JSDoc is run with the `--debug` option.
   *
   * @global
   * @name dump
   * @private
   * @param {...*} obj - Object(s) to print to stdout.
   */
  global.dump = function () {
    console.log(require('./lib/jsdoc/util/dumper').dump(arguments));
  };
}

cli.runCommand(cb);
