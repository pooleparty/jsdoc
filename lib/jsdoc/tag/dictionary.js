/** @module jsdoc/tag/dictionary */
import { defineTags } from './dictionary/definitions';

var hasOwnProp = Object.prototype.hasOwnProperty;

/** @private */
class TagDefinition {
  constructor(dict, title, etc) {
    var self = this;

    etc = etc || {};

    this.title = dict.normalise(title);

    Object.defineProperty(this, '_dictionary', {
      value: dict,
    });

    Object.keys(etc).forEach((p) => {
      self[p] = etc[p];
    });
  }

  /** @private */
  synonym = (synonymName) => {
    this._dictionary.defineSynonym(this.title, synonymName);

    return this; // chainable
  };
}

/**
 * @class
 * @alias module:jsdoc/tag/dictionary.Dictionary
 */
export class Dictionary {
  constructor() {
    this._tags = {};
    this._tagSynonyms = {};
    // The longnames for `Package` objects include a `package` namespace. There's no `package` tag,
    // though, so we declare the namespace here.
    this._namespaces = ['package'];
  }

  /** @function */
  _defineNamespace = (title) => {
    title = this.normalise(title || '');

    if (title && this._namespaces.indexOf(title) === -1) {
      this._namespaces.push(title);
    }

    return this;
  };

  /** @function */
  defineTag = (title, opts) => {
    var tagDef = new TagDefinition(this, title, opts);

    this._tags[tagDef.title] = tagDef;

    if (opts && opts.isNamespace) {
      this._defineNamespace(tagDef.title);
    }

    return this._tags[tagDef.title];
  };

  /** @function */
  defineSynonym = (title, synonym) => {
    this._tagSynonyms[synonym.toLowerCase()] = this.normalise(title);
  };

  /** @function */
  getNamespaces = () => this._namespaces.slice(0);

  /** @function */
  lookUp = (title) => {
    title = this.normalise(title);

    if (hasOwnProp.call(this._tags, title)) {
      return this._tags[title];
    }

    return false;
  };

  /** @function */
  isNamespace = (kind) => {
    if (kind) {
      kind = this.normalise(kind);
      if (this._namespaces.indexOf(kind) !== -1) {
        return true;
      }
    }

    return false;
  };

  /** @function */
  normalise = (title) => {
    var canonicalName = title.toLowerCase();

    if (hasOwnProp.call(this._tagSynonyms, canonicalName)) {
      return this._tagSynonyms[canonicalName];
    }

    return canonicalName;
  };

  /** @function */
  normalize = this.normalise;
}

// initialize the default dictionary
const dictionary = new Dictionary();
defineTags(dictionary);

/** @type {module:jsdoc/tag/dictionary.Dictionary} */
export default dictionary;
