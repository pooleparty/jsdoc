/**
 * @module jsdoc/src/parser
 */
import { EventEmitter } from 'events';
import cloneDeep from 'lodash/cloneDeep';
import fs from '../fs';
import DocletCache from '../src/docletCache';
import logger from '../util/logger';
import { Syntax } from '../src/syntax';
import env from '../env';
import { LONGNAMES, SCOPE, shorten } from '../name';
import { isAssignment, nodeToValue } from '../src/astnode';
import { AstBuilder } from '../src/astbuilder';
import { Walker } from '../src/walker';

var hasOwnProp = Object.prototype.hasOwnProperty;

// TODO: docs
const PARSERS = {
  js: 'jsdoc/src/parser',
};

/* eslint-disable no-script-url */
// Prefix for JavaScript strings that were provided in lieu of a filename.
var SCHEMA = 'javascript:';
/* eslint-enable no-script-url */

// TODO: docs
export function createParser(type) {
  var modulePath;

  if (!type) {
    /* istanbul ignore next */
    type = 'js';
  }

  if (hasOwnProp.call(PARSERS, type)) {
    modulePath = PARSERS[type];
  } else {
    logger.fatal('The parser type "%s" is not recognized.', type);

    return null;
  }

  return new (require(modulePath)).Parser();
}

// TODO: docs
function pretreat(code) {
  return (
    code
      // comment out hashbang at the top of the file, like: #!/usr/bin/env node
      .replace(/^(#![\S \t]+\r?\n)/, '// $1')

      // to support code minifiers that preserve /*! comments, treat /*!* as equivalent to /**
      .replace(/\/\*!\*/g, '/**')
      // merge adjacent doclets
      .replace(/\*\/\/\*\*+/g, '@also')
  );
}

// TODO: docs
function definedInScope(doclet, basename) {
  return (
    Boolean(doclet) &&
    Boolean(doclet.meta) &&
    Boolean(doclet.meta.vars) &&
    Boolean(basename) &&
    hasOwnProp.call(doclet.meta.vars, basename)
  );
}

// TODO: docs
/**
 * @class
 * @alias module:jsdoc/src/parser.Parser
 * @mixes module:events.EventEmitter
 *
 * @example <caption>Create a new parser.</caption>
 * var jsdocParser = new (require('jsdoc/src/parser').Parser)();
 */
export class Parser extends EventEmitter {
  constructor(builderInstance, visitorInstance, walkerInstance) {
    super();
    this.clear();

    const Visitor = require('../src/visitor').default;

    this.astBuilder = builderInstance || new AstBuilder();
    this.visitor = visitorInstance || new Visitor();
    this.walker = walkerInstance || new Walker();

    this.visitor.setParser(this);
  }

  // TODO: docs
  clear = () => {
    this.resultBuffer = [];
    this.resultBuffer.index = {
      borrowed: [],
      documented: {},
      longname: {},
      memberof: {},
    };
    this.cacheNodeId = new DocletCache();
    this.cacheLongname = new DocletCache();
    this.cacheLongname.put(LONGNAMES.GLOBAL, {
      meta: {},
    });
  };

  // TODO: update docs
  /**
   * Parse the given source files for JSDoc comments.
   * @param {Array.<string>} sourceFiles An array of filepaths to the JavaScript sources.
   * @param {string} [encoding=utf8]
   *
   * @fires module:jsdoc/src/parser.Parser.parseBegin
   * @fires module:jsdoc/src/parser.Parser.fileBegin
   * @fires module:jsdoc/src/parser.Parser.jsdocCommentFound
   * @fires module:jsdoc/src/parser.Parser.symbolFound
   * @fires module:jsdoc/src/parser.Parser.newDoclet
   * @fires module:jsdoc/src/parser.Parser.fileComplete
   * @fires module:jsdoc/src/parser.Parser.parseComplete
   *
   * @example <caption>Parse two source files.</caption>
   * var myFiles = ['file1.js', 'file2.js'];
   * var docs = jsdocParser.parse(myFiles);
   */
  parse = (sourceFiles, encoding) => {
    encoding = encoding || env.conf.encoding || 'utf8';

    var filename = '';
    var sourceCode = '';
    var parsedFiles = [];
    var e = {};

    if (typeof sourceFiles === 'string') {
      sourceFiles = [sourceFiles];
    }

    e.sourcefiles = sourceFiles;
    logger.debug('Parsing source files: %j', sourceFiles);

    this.emit('parseBegin', e);

    for (var i = 0, l = sourceFiles.length; i < l; i++) {
      sourceCode = '';

      if (sourceFiles[i].indexOf(SCHEMA) === 0) {
        sourceCode = sourceFiles[i].substr(SCHEMA.length);
        filename = `[[string${i}]]`;
      } else {
        filename = sourceFiles[i];
        try {
          sourceCode = fs.readFileSync(filename, encoding);
        } catch (err) {
          logger.error('Unable to read and parse the source file %s: %s', filename, err);
        }
      }

      if (sourceCode.length) {
        this.parseSourceCode(sourceCode, filename);
        parsedFiles.push(filename);
      }
    }

    this.emit('parseComplete', {
      sourcefiles: parsedFiles,
      doclets: this.resultBuffer,
    });
    logger.debug('Finished parsing source files.');

    return this.resultBuffer;
  };

  // TODO: docs
  fireProcessingComplete = (doclets) => {
    this.emit('processingComplete', { doclets });
  };

  // TODO: docs
  results = () => this.resultBuffer;

  // TODO: update docs
  /**
   * @param {module:jsdoc/doclet.Doclet} doclet The parse result to add to the result buffer.
   */
  addResult = (doclet) => {
    var index = this.resultBuffer.index;

    this.resultBuffer.push(doclet);

    // track all doclets by longname
    if (!hasOwnProp.call(index.longname, doclet.longname)) {
      index.longname[doclet.longname] = [];
    }
    index.longname[doclet.longname].push(doclet);

    // track all doclets that have a memberof by memberof
    if (doclet.memberof) {
      if (!hasOwnProp.call(index.memberof, doclet.memberof)) {
        index.memberof[doclet.memberof] = [];
      }
      index.memberof[doclet.memberof].push(doclet);
    }

    // track longnames of documented symbols
    if (!doclet.undocumented) {
      if (!hasOwnProp.call(index.documented, doclet.longname)) {
        index.documented[doclet.longname] = [];
      }
      index.documented[doclet.longname].push(doclet);
    }

    // track doclets with a `borrowed` property
    if (hasOwnProp.call(doclet, 'borrowed')) {
      index.borrowed.push(doclet);
    }
  };

  // TODO: docs
  addAstNodeVisitor = (visitor) => {
    this.visitor.addAstNodeVisitor(visitor);
  };

  // TODO: docs
  getAstNodeVisitors = () => this.visitor.getAstNodeVisitors();

  /** @private */
  parseSourceCode = (sourceCode, sourceName) => {
    var ast;
    var e = {
      filename: sourceName,
    };

    this.emit('fileBegin', e);
    logger.info('Parsing %s ...', sourceName);

    if (!e.defaultPrevented) {
      e = {
        filename: sourceName,
        source: sourceCode,
      };
      this.emit('beforeParse', e);
      sourceCode = e.source;
      sourceName = e.filename;

      sourceCode = pretreat(e.source);

      ast = this.astBuilder.build(sourceCode, sourceName);
      if (ast) {
        this.walkAst(ast, this.visitor, sourceName);
      }
    }

    this.emit('fileComplete', e);
  };

  /** @private */
  walkAst = (ast, visitor, sourceName) => {
    this.walker.recurse(ast, visitor, sourceName);
  };

  // TODO: docs
  addDocletRef = (e) => {
    var fakeDoclet;
    var node;

    if (e && e.code && e.code.node) {
      node = e.code.node;
      if (e.doclet) {
        // allow lookup from node ID => doclet
        this.cacheNodeId.put(node.nodeId, e.doclet);
        this.cacheLongname.put(e.doclet.longname, e.doclet);
      }
      // keep references to undocumented anonymous functions, too, as they might have scoped vars
      else if (
        (node.type === Syntax.FunctionDeclaration ||
          node.type === Syntax.FunctionExpression ||
          node.type === Syntax.ArrowFunctionExpression) &&
        !this.getDocletById(node.nodeId)
      ) {
        fakeDoclet = {
          longname: LONGNAMES.ANONYMOUS,
          meta: {
            code: e.code,
          },
        };
        this.cacheNodeId.put(node.nodeId, fakeDoclet);
        this.cacheLongname.put(fakeDoclet.longname, fakeDoclet);
      }
    }
  };

  // TODO: docs
  getDocletById = id => this.cacheNodeId.get(id);

  /**
   * Retrieve the most recently seen doclet that has the given longname.
   *
   * @param {string} longname - The longname to search for.
   * @return {module:jsdoc/doclet.Doclet?} The most recent doclet for the longname.
   */
  getDocletByLongname = longname => this.cacheLongname.get(longname);

  // TODO: docs
  /**
   * @param {string} longname - The symbol's longname.
   * @return {string} The symbol's basename.
   */
  getBasename = (longname) => {
    if (longname !== undefined) {
      return longname.replace(/^([$a-z_][$a-z_0-9]*).*?$/i, '$1');
    }

    return undefined;
  };

  // TODO: docs
  /**
   * Given a node, determine what the node is a member of.
   * @param {node} node
   * @returns {string} The long name of the node that this is a member of.
   */
  astnodeToMemberof = (node) => {
    var basename;
    var doclet;
    var scope;

    var result = {};
    var type = node.type;

    if (
      (type === Syntax.FunctionDeclaration ||
        type === Syntax.FunctionExpression ||
        type === Syntax.ArrowFunctionExpression ||
        type === Syntax.VariableDeclarator) &&
      node.enclosingScope
    ) {
      doclet = this.getDocletById(node.enclosingScope.nodeId);

      if (!doclet) {
        result.memberof = LONGNAMES.ANONYMOUS + SCOPE.PUNC.INNER;
      } else {
        result.memberof = doclet.longname + SCOPE.PUNC.INNER;
      }
    } else if (type === Syntax.ClassPrivateProperty || type === Syntax.ClassProperty) {
      doclet = this.getDocletById(node.enclosingScope.nodeId);

      if (!doclet) {
        result.memberof = LONGNAMES.ANONYMOUS + SCOPE.PUNC.INSTANCE;
      } else {
        result.memberof = doclet.longname + SCOPE.PUNC.INSTANCE;
      }
    } else if (type === Syntax.MethodDefinition && node.kind === 'constructor') {
      doclet = this.getDocletById(node.enclosingScope.nodeId);

      // global classes aren't a member of anything
      if (doclet.memberof) {
        result.memberof = doclet.memberof + SCOPE.PUNC.INNER;
      }
    }
    // special case for methods in classes that are returned by arrow function expressions; for
    // other method definitions, we get the memberof from the node name elsewhere. yes, this is
    // confusing...
    else if (
      type === Syntax.MethodDefinition &&
      node.parent.parent.parent &&
      node.parent.parent.parent.type === Syntax.ArrowFunctionExpression
    ) {
      doclet = this.getDocletById(node.enclosingScope.nodeId);

      if (doclet) {
        result.memberof =
          doclet.longname + (node.static === true ? SCOPE.PUNC.STATIC : SCOPE.PUNC.INSTANCE);
      }
    } else {
      // check local references for aliases
      scope = node;
      basename = this.getBasename(nodeToValue(node));

      // walk up the scope chain until we find the scope in which the node is defined
      while (scope.enclosingScope) {
        doclet = this.getDocletById(scope.enclosingScope.nodeId);
        if (doclet && definedInScope(doclet, basename)) {
          result.memberof = doclet.meta.vars[basename];
          result.basename = basename;
          break;
        } else {
          // move up
          scope = scope.enclosingScope;
        }
      }

      // do we know that it's a global?
      doclet = this.getDocletByLongname(LONGNAMES.GLOBAL);
      if (doclet && definedInScope(doclet, basename)) {
        result.memberof = doclet.meta.vars[basename];
        result.basename = basename;
      } else {
        doclet = this.getDocletById(node.parent.nodeId);

        // set the result if we found a doclet. (if we didn't, the AST node may describe a
        // global symbol.)
        if (doclet) {
          result.memberof = doclet.longname || doclet.name;
        }
      }
    }

    return result;
  };

  /**
   * Get the doclet for the lowest-level class, if any, that is in the scope chain for a given node.
   *
   * @param {Object} node - The node whose scope chain will be searched.
   * @return {module:jsdoc/doclet.Doclet?} The doclet for the lowest-level class in the node's scope
   * chain.
   */
  getParentClass = (node) => {
    var doclet;
    var nameAtoms;
    var scope = node.enclosingScope;

    function isClass(d) {
      return d && d.kind === 'class';
    }

    while (scope) {
      // get the doclet, if any, for the parent scope
      doclet = this.getDocletById(scope.nodeId);

      if (doclet) {
        // is the doclet for a class? if so, we're done
        if (isClass(doclet)) {
          break;
        }

        // is the doclet for an instance member of a class? if so, try to get the doclet for the
        // owning class
        nameAtoms = shorten(doclet.longname);
        if (nameAtoms.scope === SCOPE.PUNC.INSTANCE) {
          doclet = this.getDocletByLongname(nameAtoms.memberof);
          if (isClass(doclet)) {
            break;
          }
        }
      }

      // move up to the next parent scope
      scope = scope.enclosingScope;
    }

    return isClass(doclet) ? doclet : null;
  };

  // TODO: docs
  /**
   * Resolve what "this" refers to relative to a node.
   * @param {node} node - The "this" node
   * @returns {string} The longname of the enclosing node.
   */
  resolveThis = (node) => {
    var doclet;
    var parentClass;
    var result;

    // Properties are handled below.
    if (node.type !== Syntax.Property && node.enclosingScope) {
      // For ES2015 constructor functions, we use the class declaration to resolve `this`.
      if (
        node.parent &&
        node.parent.type === Syntax.MethodDefinition &&
        node.parent.kind === 'constructor'
      ) {
        doclet = this.getDocletById(node.parent.parent.parent.nodeId);
      }
      // Otherwise, if there's an enclosing scope, we use the enclosing scope to resolve `this`.
      else {
        doclet = this.getDocletById(node.enclosingScope.nodeId);
      }

      if (!doclet) {
        result = LONGNAMES.ANONYMOUS; // TODO handle global this?
      } else if (doclet.this) {
        result = doclet.this;
      } else if (doclet.kind === 'function' && doclet.memberof) {
        parentClass = this.getParentClass(node);

        // like: function Foo() { this.bar = function(n) { /** blah */ this.name = n; };
        // or:   Foo.prototype.bar = function(n) { /** blah */ this.name = n; };
        // or:   var Foo = exports.Foo = function(n) { /** blah */ this.name = n; };
        // or:   Foo.constructor = function(n) { /** blah */ this.name = n; }
        if (parentClass || /\.constructor$/.test(doclet.longname)) {
          result = doclet.memberof;
        }
        // like: function notAClass(n) { /** global this */ this.name = n; }
        else {
          result = doclet.longname;
        }
      }
      // like: var foo = function(n) { /** blah */ this.bar = n; }
      else if (doclet.kind === 'member' && isAssignment(node)) {
        result = doclet.longname;
      }
      // walk up to the closest class we can find
      else if (doclet.kind === 'class' || doclet.kind === 'module') {
        result = doclet.longname;
      } else if (node.enclosingScope) {
        result = this.resolveThis(node.enclosingScope);
      }
    }
    // For object properties, we use the node's parent (the object) instead.
    else {
      doclet = this.getDocletById(node.parent.nodeId);

      if (!doclet) {
        // The object wasn't documented, so we don't know what name to use.
        result = '';
      } else {
        result = doclet.longname;
      }
    }

    return result;
  };

  /**
   * Given an AST node representing an object property, find the doclets for the parent object or
   * objects.
   *
   * If the object is part of a simple assignment (for example, `var foo = { x: 1 }`), this method
   * returns a single doclet (in this case, the doclet for `foo`).
   *
   * If the object is part of a chained assignment (for example, `var foo = exports.FOO = { x: 1 }`,
   * this method returns multiple doclets (in this case, the doclets for `foo` and `exports.FOO`).
   *
   * @param {Object} node - An AST node representing an object property.
   * @return {Array.<module:jsdoc/doclet.Doclet>} An array of doclets for the parent object or
   * objects, or an empty array if no doclets are found.
   */
  resolvePropertyParents = (node) => {
    var currentAncestor = node.parent;
    var nextAncestor = currentAncestor.parent;
    var doclet;
    var doclets = [];

    while (currentAncestor) {
      doclet = this.getDocletById(currentAncestor.nodeId);
      if (doclet) {
        doclets.push(doclet);
      }

      // if the next ancestor is an assignment expression (for example, `exports.FOO` in
      // `var foo = exports.FOO = { x: 1 }`, keep walking upwards
      if (nextAncestor && nextAncestor.type === Syntax.AssignmentExpression) {
        nextAncestor = nextAncestor.parent;
        currentAncestor = currentAncestor.parent;
      }
      // otherwise, we're done
      else {
        currentAncestor = null;
      }
    }

    return doclets;
  };

  // TODO: docs
  /**
   * Resolve what function a var is limited to.
   * @param {AstNode} node
   * @param {string} basename The leftmost name in the long name: in foo.bar.zip
   * the basename is foo.
   */
  resolveVar = (node, basename) => {
    var doclet;
    var result;
    var scope = node.enclosingScope;

    // HACK: return an empty string for function declarations so they don't end up in anonymous
    // scope (see #685 and #693)
    if (node.type === Syntax.FunctionDeclaration) {
      result = '';
    } else if (!scope) {
      result = ''; // global
    } else {
      doclet = this.getDocletById(scope.nodeId);
      if (definedInScope(doclet, basename)) {
        result = doclet.longname;
      } else {
        result = this.resolveVar(scope, basename);
      }
    }

    return result;
  };

  // TODO: docs
  resolveEnum = (e) => {
    var doclets = this.resolvePropertyParents(e.code.node.parent);

    doclets.forEach((doclet) => {
      if (doclet && doclet.isEnum) {
        doclet.properties = doclet.properties || [];

        // members of an enum inherit the enum's type
        if (doclet.type && !e.doclet.type) {
          // clone the type to prevent circular refs
          e.doclet.type = cloneDeep(doclet.type);
        }

        delete e.doclet.undocumented;
        e.doclet.defaultvalue = e.doclet.meta.code.value;

        // add the doclet to the parent's properties
        doclet.properties.push(e.doclet);
      }
    });
  };
}

// TODO: document other events
/**
 * Fired once for each JSDoc comment in the current source code.
 * @event jsdocCommentFound
 * @memberof module:jsdoc/src/parser.Parser
 * @type {Object}
 * @property {string} comment The text content of the JSDoc comment
 * @property {number} lineno The line number associated with the found comment.
 * @property {number} columnno The column number associated with the found comment.
 * @property {string} filename The file name associated with the found comment.
 */
