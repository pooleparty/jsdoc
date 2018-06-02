/**
 * @module jsdoc/src/scanner
 * @requires module:jsdoc/fs
 */

import { EventEmitter } from 'events';

var env = require('../env');
var fs = require('../fs');
var logger = require('../util/logger');
var path = require('../path');

/* eslint-disable no-empty-function */
/**
 * @constructor
 * @mixes module:events
 */
export default class Scanner extends EventEmitter {
  /**
   * Recursively searches the given searchPaths for js files.
   * @param {Array.<string>} searchPaths
   * @param {number} [depth=1]
   * @fires sourceFileFound
   */
  scan = (searchPaths, depth, filter) => {
    let currentFile;
    let filePaths = [];

    searchPaths = searchPaths || [];
    depth = depth || 1;

    searchPaths.forEach((searchPath) => {
      var filepath = path.resolve(env.pwd, decodeURIComponent(searchPath));

      try {
        currentFile = fs.statSync(filepath);
      } catch (e) {
        logger.error('Unable to find the source file or directory %s', filepath);

        return;
      }

      if (currentFile.isFile()) {
        filePaths.push(filepath);
      } else {
        filePaths = filePaths.concat(fs.ls(filepath, depth));
      }
    });

    filePaths = filePaths.filter(filePath => filter.isIncluded(filePath));

    filePaths = filePaths.filter((fileName) => {
      var e = { fileName };

      this.emit('sourceFileFound', e);

      return !e.defaultPrevented;
    });

    return filePaths;
  };
}
