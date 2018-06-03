/**
 * Objects that are shared across the entire application.
 *
 * @deprecated As of JSDoc 3.4.0. Do not use this module. It will be removed in a future release.
 * @module jsdoc/app
 */
import Scanner from './src/scanner';
import * as name from './name';

export default {
  /**
   * Namespace for shared objects.
   *
   * @namespace
   * @type {Object}
   */
  jsdoc: {
    name,
    parser: null,
    scanner: new Scanner(),
  },
};
