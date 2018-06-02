

describe('jsdoc/src/visitor', () => {
  // TODO: more tests

  var jsdoc = {
    src: {
      parser: require('jsdoc/src/parser'),
      Visitor: require('jsdoc/src/visitor').default,
    },
  };
  var parser = new jsdoc.src.parser.Parser();
  var visitor = new jsdoc.src.Visitor();

  describe('visitNodeComments', () => {
    // TODO: more tests

    var events = [];

    function listener(event) {
      events.push(event);
    }

    beforeEach(() => {
      parser.addListener('jsdocCommentFound', listener);
    });

    afterEach(() => {
      parser.removeListener('jsdocCommentFound', listener);
      events = [];
    });

    it('should ignore line comments', () => {
      var node = {
        leadingComments: [
          {
            type: 'CommentLine',
            value: ' line comment',
            loc: {
              start: {
                line: 0,
                column: 0,
              },
            },
          },
        ],
      };

      visitor.visitNodeComments(node, parser, 'fake');

      expect(events).toEqual([]);
    });

    it('should ignore normal, non-JSDoc block comments', () => {
      var node = {
        leadingComments: [
          {
            type: 'CommentBlock',
            value: ' block comment ',
            loc: {
              start: {
                line: 0,
                column: 0,
              },
            },
          },
        ],
      };

      visitor.visitNodeComments(node, parser, 'fake');

      expect(events).toEqual([]);
    });

    it('should ignore comments that begin with three or more asterisks', () => {
      var node = {
        leadingComments: [
          {
            type: 'CommentBlock',
            value: '** block comment ',
            loc: {
              start: {
                line: 0,
                column: 0,
              },
            },
          },
        ],
      };

      visitor.visitNodeComments(node, parser, 'fake');

      expect(events).toEqual([]);
    });

    it('should ignore empty block comments', () => {
      var node = {
        leadingComments: [
          {
            type: 'CommentBlock',
            value: '',
            loc: {
              start: {
                line: 0,
                column: 0,
              },
            },
          },
        ],
      };

      visitor.visitNodeComments(node, parser, 'fake');

      expect(events).toEqual([]);
    });

    it('should fire an event for JSDoc comments', () => {
      var node = {
        leadingComments: [
          {
            type: 'CommentBlock',
            value: '* block comment ',
            loc: {
              start: {
                line: 0,
                column: 0,
              },
            },
          },
        ],
      };

      visitor.visitNodeComments(node, parser, 'fake');

      expect(events.length).toBe(1);
      expect(events[0].comment).toBe('/** block comment */');
    });
  });

  // TODO: these tests aren't working; for some strange reason, Node.js 6.10.2 stops running code
  // for visitor.visitNode() while it's in the middle of the SymbolFound constructor. maybe a
  // version-specific bug?
  xdescribe('visitNode', () => {
    // TODO: more tests

    var events = [];

    function listener(event) {
      events.push(event);
    }

    beforeEach(() => {
      parser.addListener('symbolFound', listener);
    });

    afterEach(() => {
      parser.removeListener('symbolFound', listener);
      events = [];
    });

    it('should ignore non-JSDoc leading comments', () => {
      var node = {
        type: 'Property',
        key: {
          type: 'Identifier',
          name: 'foo',
        },
        value: {
          type: 'Literal',
          value: true,
        },
        kind: 'init',
        leadingComments: [
          {
            type: 'CommentBlock',
            value: ' block comment ',
            loc: {
              start: {
                line: 0,
                column: 0,
              },
            },
          },
        ],
      };

      visitor.visitNode(node, parser, 'fake');

      expect(events[0].comment).toBe('');
    });

    it('should include JSDoc leading comments', () => {
      var node = {
        type: 'Property',
        key: {
          type: 'Identifier',
          name: 'foo',
        },
        value: {
          type: 'Literal',
          value: true,
        },
        kind: 'init',
        leadingComments: [
          {
            type: 'CommentBlock',
            value: '* block comment ',
            loc: {
              start: {
                line: 0,
                column: 0,
              },
            },
          },
        ],
      };

      visitor.visitNode(node, parser, 'fake');

      expect(events[0].comment).toBe('/** block comment */');
    });
  });
});
