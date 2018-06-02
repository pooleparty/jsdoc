import logger from '../util/logger';

var babylon = require('babylon');
var env = require('../env');

// exported so we can use them in tests
export const parserOptions = {
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  plugins: [
    'asyncGenerators',
    'bigInt',
    'classPrivateProperties',
    'classProperties',
    'decorators2',
    'doExpressions',
    'dynamicImport',
    'estree',
    'exportExtensions',
    'functionBind',
    'functionSent',
    'importMeta',
    'jsx',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
  ],
  ranges: true,
  sourceType: env.conf.sourceType,
};

// TODO: docs
export class AstBuilder {
  // TODO: docs
  build = (source, filename) => {
    var ast;

    try {
      ast = babylon.parse(source, parserOptions);
      // console.log(JSON.stringify(ast, null, 2));
    } catch (e) {
      logger.error('Unable to parse %s: %s', filename, e.message);
    }

    return ast;
  };
}
