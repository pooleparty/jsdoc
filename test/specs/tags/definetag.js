describe('@define tag', () => {
  var logger = require('jsdoc/util/logger').default;

  describe('JSDoc tags', () => {
    var env = require('jsdoc/env');

    var allowUnknownTags = Boolean(env.conf.tags.allowUnknownTags);

    afterEach(() => {
      jasmine.restoreTagDictionary();
      env.conf.tags.allowUnknownTags = allowUnknownTags;
    });

    it('should not recognize the @define tag', () => {
      env.conf.tags.allowUnknownTags = false;
      jasmine.replaceTagDictionary('jsdoc');
      spyOn(logger, 'error');

      jasmine.getDocSetFromFile('test/fixtures/definetag.js');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Closure Compiler tags', () => {
    beforeEach(() => {
      jasmine.replaceTagDictionary('closure');
    });

    afterEach(() => {
      jasmine.restoreTagDictionary();
    });

    it('should recognize the @define tag', () => {
      var docSet = jasmine.getDocSetFromFile('test/fixtures/definetag.js');
      var enableDebug = docSet.getByLongname('ENABLE_DEBUG')[0];

      expect(enableDebug.kind).toBe('constant');
      expect(enableDebug.type).toBeDefined();
      expect(enableDebug.type.names[0]).toBe('boolean');
    });
  });
});
