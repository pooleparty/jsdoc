import Filter from 'jsdoc/src/filter';
import Scanner from 'jsdoc/src/scanner';

describe('jsdoc/src/scanner', () => {
  var env = require('jsdoc/env');
  var path = require('jsdoc/path');

  var filter = new Filter({
    includePattern: new RegExp('.+\\.js(doc)?$'),
    excludePattern: new RegExp('(^|\\/|\\\\)_'),
  });
  var sourcePath = path.normalize(`${env.pwd}/test/fixtures/src`);

  it('should export a "Scanner" class', () => {
    expect(Scanner).toBeDefined();
    expect(typeof Scanner).toBe('function');
  });

  describe('Scanner', () => {
    it('should inherit from EventEmitter', () => {
      var EventEmitter = require('events').EventEmitter;
      var testScanner = new Scanner();

      expect(testScanner instanceof EventEmitter).toBe(true);
    });

    it('should have a "scan" method', () => {
      var testScanner = new Scanner();

      expect(testScanner.scan).toBeDefined();
      expect(typeof testScanner.scan).toBe('function');
    });

    describe('scan', () => {
      it('should return the correct source files', () => {
        var testScanner = new Scanner();
        var sourceFiles = testScanner.scan([sourcePath], 3, filter);

        sourceFiles = sourceFiles.map($ => path.relative(env.pwd, $));

        expect(sourceFiles.length).toEqual(3);
        expect(sourceFiles.indexOf(path.join('test', 'fixtures', 'src', 'one.js'))).toBeGreaterThan(-1);
        expect(sourceFiles.indexOf(path.join('test', 'fixtures', 'src', 'two.js'))).toBeGreaterThan(-1);
        expect(sourceFiles.indexOf(path.join('test', 'fixtures', 'src', 'dir1', 'three.js'))).toBeGreaterThan(-1);
      });
    });
  });
});
