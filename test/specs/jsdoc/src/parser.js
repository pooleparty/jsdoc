/* eslint no-script-url: 0 */
import env from '../../../../lib/jsdoc/env';
import fs from '../../../../lib/jsdoc/fs';
import * as path from '../../../../lib/jsdoc/path';
import logger from '../../../../lib/jsdoc/util/logger';
import * as parser from '../../../../lib/jsdoc/src/parser';
import { attachTo } from '../../../../lib/jsdoc/src/handlers';

describe('jsdoc/src/parser', () => {
  it('should exist', () => {
    expect(parser).toBeDefined();
    expect(typeof parser).toBe('object');
  });

  it('should export a "createParser" method', () => {
    expect(typeof parser.createParser).toBe('function');
  });

  it('should export a "Parser" constructor', () => {
    expect(typeof parser.Parser).toBe('function');
  });

  describe('createParser', () => {
    it('should return a Parser when called without arguments', () => {
      expect(typeof parser.createParser()).toBe('object');
    });

    it('should create a jsdoc/src/parser.Parser instance with the argument "js"', () => {
      var p = parser.createParser('js');

      expect(p instanceof parser.Parser).toBe(true);
    });

    it('should log a fatal error on bad input', () => {
      spyOn(logger, 'fatal');
      parser.createParser('not-a-real-parser-ever');

      expect(logger.fatal).toHaveBeenCalled();
    });
  });

  describe('Parser', () => {
    var p;

    function newParser() {
      p = new parser.Parser();
    }

    newParser();

    it('should have an "astBuilder" property', () => {
      expect(p.astBuilder).toBeDefined();
    });

    it('should have a "visitor" property', () => {
      expect(p.visitor).toBeDefined();
    });

    it('should have a "walker" property', () => {
      expect(p.walker).toBeDefined();
    });

    it('should accept an astBuilder, visitor, and walker as arguments', () => {
      var astBuilder = {};
      var visitor = {
        /* eslint-disable no-empty-function */
        setParser() {},
        /* eslint-enable no-empty-function */
      };
      var walker = {};

      var myParser = new parser.Parser(astBuilder, visitor, walker);

      expect(myParser.astBuilder).toBe(astBuilder);
      expect(myParser.visitor).toBe(visitor);
      expect(myParser.walker).toBe(walker);
    });

    it('should have a "parse" method', () => {
      expect(p.parse).toBeDefined();
      expect(typeof p.parse).toBe('function');
    });

    it('should have a "results" method', () => {
      expect(p.results).toBeDefined();
      expect(typeof p.results).toBe('function');
    });

    it('should have an "addAstNodeVisitor" method', () => {
      expect(p.addAstNodeVisitor).toBeDefined();
      expect(typeof p.addAstNodeVisitor).toBe('function');
    });

    it('should have a "getAstNodeVisitors" method', () => {
      expect(p.getAstNodeVisitors).toBeDefined();
      expect(typeof p.getAstNodeVisitors).toBe('function');
    });

    describe('astBuilder', () => {
      it('should contain an appropriate astBuilder by default', () => {
        expect(p.astBuilder instanceof require('jsdoc/src/astbuilder').AstBuilder).toBe(true);
      });
    });

    describe('visitor', () => {
      it('should contain an appropriate visitor by default', () => {
        expect(p.visitor instanceof require('jsdoc/src/visitor').default).toBe(true);
      });
    });

    describe('walker', () => {
      it('should contain an appropriate walker by default', () => {
        expect(p.walker instanceof require('jsdoc/src/walker').Walker).toBe(true);
      });
    });

    describe('parse', () => {
      beforeEach(newParser);

      it('should fire "parseBegin" events before it parses any files', () => {
        var spy = jasmine.createSpy();
        var sourceFiles = ['javascript:/** @name foo */'];

        p.on('parseBegin', spy).parse(sourceFiles);
        expect(spy).toHaveBeenCalled();
        expect(spy.mostRecentCall.args[0].sourcefiles).toBe(sourceFiles);
      });

      it("should allow 'parseBegin' handlers to modify the list of source files", () => {
        var sourceCode = 'javascript:/** @name foo */';
        var newFiles = ['[[replaced]]'];
        var evt;

        function handler(e) {
          e.sourcefiles = newFiles;
          evt = e;
        }

        p.on('parseBegin', handler).parse(sourceCode);
        expect(evt.sourcefiles).toBe(newFiles);
      });

      it('should fire "jsdocCommentFound" events when a source file contains JSDoc comments', () => {
        var spy = jasmine.createSpy();
        var sourceCode = ['javascript:/** @name bar */'];

        p.on('jsdocCommentFound', spy).parse(sourceCode);

        expect(spy).toHaveBeenCalled();
        expect(spy.mostRecentCall.args[0].comment).toBe('/** @name bar */');
      });

      it('should fire "symbolFound" events when a source file contains named symbols', () => {
        var spy = jasmine.createSpy();
        var sourceCode = 'javascript:var foo = 1';

        p.on('symbolFound', spy).parse(sourceCode);

        expect(spy).toHaveBeenCalled();
      });

      it('should fire "newDoclet" events after creating a new doclet', () => {
        var spy = jasmine.createSpy();
        var sourceCode = 'javascript:var foo = 1';

        p.on('symbolFound', spy).parse(sourceCode);

        expect(spy).toHaveBeenCalled();
      });

      it('should allow "newDoclet" handlers to modify doclets', () => {
        var results;
        var sourceCode = 'javascript:/** @class */function Foo() {}';

        function handler(e) {
          var doop = require('lodash/cloneDeep');

          e.doclet = doop(e.doclet);
          e.doclet.foo = 'bar';
        }

        attachTo(p);
        p.on('newDoclet', handler).parse(sourceCode);
        results = p.results();

        expect(results[0].foo).toBe('bar');
      });

      it('should call AST node visitors', () => {
        var Syntax = require('jsdoc/src/syntax').Syntax;

        var args;
        var sourceCode = ['javascript:/** foo */var foo;'];
        var visitor = {
          visitNode(node, e) {
            if (e && e.code && !args) {
              args = Array.prototype.slice.call(arguments);
            }
          },
        };

        attachTo(p);
        p.addAstNodeVisitor(visitor);
        p.parse(sourceCode);

        expect(args).toBeDefined();
        expect(Array.isArray(args)).toBe(true);
        expect(args.length).toBe(4);

        // args[0]: AST node
        expect(args[0].type).toBeDefined();
        expect(args[0].type).toBe(Syntax.VariableDeclarator);

        // args[1]: JSDoc event
        expect(typeof args[1]).toBe('object');
        expect(args[1].code).toBeDefined();
        expect(args[1].code.name).toBeDefined();
        expect(args[1].code.name).toBe('foo');

        // args[2]: parser
        expect(typeof args[2]).toBe('object');
        expect(args[2] instanceof parser.Parser).toBe(true);

        // args[3]: current source name
        expect(String(args[3])).toBe('[[string0]]');
      });

      it('should reflect changes made by AST node visitors', () => {
        var doclet;
        var sourceCode = ['javascript:/** foo */var foo;'];
        var visitor = {
          visitNode(node, e) {
            if (e && e.code && e.code.name === 'foo') {
              e.code.name = 'bar';
            }
          },
        };

        attachTo(p);
        p.addAstNodeVisitor(visitor);
        p.parse(sourceCode);

        doclet = p.results()[0];

        expect(doclet).toBeDefined();
        expect(typeof doclet).toBe('object');
        expect(doclet.name).toBeDefined();
        expect(doclet.name).toBe('bar');
      });

      it('should fire "parseComplete" events after it finishes parsing files', () => {
        var eventObject;
        var spy = jasmine.createSpy();
        var sourceCode = ['javascript:/** @class */function Foo() {}'];

        attachTo(p);
        p.on('parseComplete', spy).parse(sourceCode);

        expect(spy).toHaveBeenCalled();

        eventObject = spy.mostRecentCall.args[0];
        expect(eventObject).toBeDefined();
        expect(Array.isArray(eventObject.sourcefiles)).toBe(true);
        expect(eventObject.sourcefiles.length).toBe(1);
        expect(eventObject.sourcefiles[0]).toBe('[[string0]]');
        expect(Array.isArray(eventObject.doclets)).toBe(true);
        expect(eventObject.doclets.length).toBe(1);
        expect(eventObject.doclets[0].kind).toBe('class');
        expect(eventObject.doclets[0].longname).toBe('Foo');
      });

      it('should fire a "processingComplete" event when fireProcessingComplete is called', () => {
        var spy = jasmine.createSpy();
        var doclets = ['a', 'b'];

        p.on('processingComplete', spy).fireProcessingComplete(doclets);

        expect(spy).toHaveBeenCalled();
        expect(typeof spy.mostRecentCall.args[0]).toBe('object');
        expect(spy.mostRecentCall.args[0].doclets).toBeDefined();
        expect(spy.mostRecentCall.args[0].doclets).toBe(doclets);
      });

      it('should not throw errors when parsing files with ES6 syntax', () => {
        function parse() {
          var parserSrc = `javascript:${fs.readFileSync(
            path.join(env.dirname, 'test/fixtures/es6.js'),
            'utf8',
          )}`;

          p.parse(parserSrc);
        }

        expect(parse).not.toThrow();
      });

      it('should be able to parse its own source file', () => {
        var parserSrc = `javascript:${fs.readFileSync(
          path.join(env.dirname, 'lib/jsdoc/src/parser.js'),
          'utf8',
        )}`;

        function parse() {
          p.parse(parserSrc);
        }

        expect(parse).not.toThrow();
      });

      it('should comment out a POSIX hashbang at the start of the file', () => {
        var parserSrc = 'javascript:#!/usr/bin/env node\n/** class */function Foo() {}';

        function parse() {
          p.parse(parserSrc);
        }

        expect(parse).not.toThrow();
      });
    });

    describe('results', () => {
      beforeEach(newParser);

      it('returns an empty array before files are parsed', () => {
        var results = p.results();

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);
      });

      it('returns an array of doclets after files are parsed', () => {
        var source = 'javascript:var foo;';
        var results;

        attachTo(p);

        p.parse(source);
        results = p.results();

        expect(results).toBeDefined();
        expect(results[0]).toBeDefined();
        expect(typeof results[0]).toBe('object');
        expect(results[0].name).toBeDefined();
        expect(results[0].name).toBe('foo');
      });

      it('should reflect comment changes made by "jsdocCommentFound" handlers', () => {
        // we test both POSIX and Windows line endings
        var source =
          'javascript:/**\n * replaceme\r\n * @module foo\n */\n\n' +
          '/**\n * replaceme\n */\nvar bar;';

        p.on('jsdocCommentFound', (e) => {
          e.comment = e.comment.replace('replaceme', 'REPLACED!');
        });
        attachTo(p);

        p.parse(source);
        p.results().forEach((doclet) => {
          expect(doclet.comment).not.toMatch('replaceme');
          expect(doclet.comment).toMatch('REPLACED!');
        });
      });

      // TODO: this test appears to be doing nothing...
      xdescribe('event order', () => {
        var events = {
          all: [],
          jsdocCommentFound: [],
          symbolFound: [],
        };
        var source = fs.readFileSync(path.join(env.dirname, 'test/fixtures/eventorder.js'), 'utf8');

        /*
                function pushEvent(e) {
                    events.all.push(e);
                    events[e.event].push(e);
                }
                */

        function sourceOrderSort(atom1, atom2) {
          if (atom1.range[1] < atom2.range[0]) {
            return -1;
          } else if (atom1.range[0] < atom2.range[0] && atom1.range[1] === atom2.range[1]) {
            return 1;
          }
          return 0;
        }

        it('should fire interleaved jsdocCommentFound and symbolFound events, in source order', () => {
          attachTo(p);
          p.parse(source);
          events.all
            .slice(0)
            .sort(sourceOrderSort)
            .forEach((e, i) => {
              expect(e).toBe(events.all[i]);
            });
        });
      });
    });

    describe('addAstNodeVisitor', () => {
      /* eslint-disable no-empty-function */
      function visitorA() {}
      function visitorB() {}
      /* eslint-enable no-empty-function */

      var visitors;

      beforeEach(newParser);

      it('should work with a single node visitor', () => {
        p.addAstNodeVisitor(visitorA);

        visitors = p.getAstNodeVisitors();

        expect(visitors.length).toBe(1);
        expect(visitors[0]).toBe(visitorA);
      });

      it('should work with multiple node visitors', () => {
        p.addAstNodeVisitor(visitorA);
        p.addAstNodeVisitor(visitorB);

        visitors = p.getAstNodeVisitors();

        expect(visitors.length).toBe(2);
        expect(visitors[0]).toBe(visitorA);
        expect(visitors[1]).toBe(visitorB);
      });
    });

    describe('getAstNodeVisitors', () => {
      beforeEach(newParser);

      it('should return an empty array by default', () => {
        var visitors = p.getAstNodeVisitors();

        expect(Array.isArray(visitors)).toBe(true);
        expect(visitors.length).toBe(0);
      });

      // other functionality is covered by the addNodeVisitors tests
    });
  });
});
