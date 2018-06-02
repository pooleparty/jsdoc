/**
 * Make the contents of a README file available to include in the output.
 * @module jsdoc/readme
 */
import env from './env';
import fs from './fs';
import { getParser } from './util/markdown';

/**
 * @class
 * @classdesc Represents a README file.
 * @param {string} path - The filepath to the README.
 */
export default function ReadMe(path) {
  var content = fs.readFileSync(path, env.opts.encoding);
  var parse = getParser();

  this.html = parse(content);
}
