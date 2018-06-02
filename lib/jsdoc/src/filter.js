/**
 * @module jsdoc/src/filter
 */

import env from '../env';
import path from '../path';

function makeRegExp(config) {
  var regExp = null;

  if (config) {
    regExp = typeof config === 'string' ? new RegExp(config) : config;
  }

  return regExp;
}

/**
 * @constructor
 * @param {Object} opts
 * @param {string[]} opts.exclude - Specific files to exclude.
 * @param {(string|RegExp)} opts.includePattern
 * @param {(string|RegExp)} opts.excludePattern
 */
export default class Filter {
  constructor(opts) {
    this.exclude =
      opts.exclude && Array.isArray(opts.exclude)
        ? opts.exclude.map($ => path.resolve(env.pwd, $))
        : null;
    this.includePattern = makeRegExp(opts.includePattern);
    this.excludePattern = makeRegExp(opts.excludePattern);
  }

  /**
   * @param {string} filepath - The filepath to check.
   * @returns {boolean} Should the given file be included?
   */
  isIncluded = (filepath) => {
    var included = true;

    filepath = path.resolve(env.pwd, filepath);

    if (this.includePattern && !this.includePattern.test(filepath)) {
      included = false;
    }

    if (this.excludePattern && this.excludePattern.test(filepath)) {
      included = false;
    }

    if (this.exclude) {
      this.exclude.forEach((exclude) => {
        if (filepath.indexOf(exclude) === 0) {
          included = false;
        }
      });
    }

    return included;
  };
}
