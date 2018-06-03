import { attachTo } from 'jsdoc/src/handlers';

describe('jsdoc/src/handlers', () => {
  var testParser = jasmine.createParser();

  attachTo(testParser);

  // it('should exist', () => {
  //   expect(handlers).toBeDefined();
  //   expect(typeof handlers).toEqual('object');
  // });

  it('should export an "attachTo" function', () => {
    expect(attachTo).toBeDefined();
    expect(typeof attachTo).toEqual('function');
  });

  describe('attachTo', () => {
    it('should attach a "jsdocCommentFound" handler to the parser', () => {
      var callbacks = testParser.listeners('jsdocCommentFound');

      expect(callbacks).toBeDefined();
      expect(callbacks.length).toEqual(1);
      expect(typeof callbacks[0]).toEqual('function');
    });

    it('should attach a "symbolFound" handler to the parser', () => {
      var callbacks = testParser.listeners('symbolFound');

      expect(callbacks).toBeDefined();
      expect(callbacks.length).toEqual(1);
      expect(typeof callbacks[0]).toEqual('function');
    });

    it('should attach a "fileComplete" handler to the parser', () => {
      var callbacks = testParser.listeners('fileComplete');

      expect(callbacks).toBeDefined();
      expect(callbacks.length).toEqual(1);
      expect(typeof callbacks[0]).toEqual('function');
    });
  });

  describe('jsdocCommentFound handler', () => {
    /* eslint-disable no-script-url */
    var sourceCode = 'javascript:/** @name bar */';
    /* eslint-enable no-script-url */
    var result = testParser.parse(sourceCode);

    it('should create a doclet for comments with "@name" tags', () => {
      expect(result.length).toEqual(1);
      expect(result[0].name).toEqual('bar');
    });
  });

  xdescribe('symbolFound handler', () => {
    // TODO
  });
});
