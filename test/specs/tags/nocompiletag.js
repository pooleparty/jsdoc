describe('@nocompile tag', () => {
  var env = require('jsdoc/env');
  var logger = require('jsdoc/util/logger').default;

  var allowUnknownTags = Boolean(env.conf.tags.allowUnknownTags);

  beforeEach(() => {
    env.conf.tags.allowUnknownTags = false;
    spyOn(logger, 'error');
  });

  afterEach(() => {
    jasmine.restoreTagDictionary();
    env.conf.tags.allowUnknownTags = allowUnknownTags;
  });

  describe('JSDoc tags', () => {
    beforeEach(() => {
      jasmine.replaceTagDictionary('jsdoc');
    });

    it('should not recognize the @nocompile tag', () => {
      jasmine.getDocSetFromFile('test/fixtures/nocompiletag.js');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Closure Compiler tags', () => {
    beforeEach(() => {
      jasmine.replaceTagDictionary('closure');
    });

    it('should recognize the @nocompile tag', () => {
      jasmine.getDocSetFromFile('test/fixtures/nocompiletag.js');

      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
