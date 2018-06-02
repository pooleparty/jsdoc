/* eslint indent: "off", no-process-exit: "off", strict: ["error", "function"] */
/**
 * Helper methods for running JSDoc on the command line.
 *
 * A few critical notes for anyone who works on this module:
 *
 * + The module should really export an instance of `cli`, and `props` should be properties of a
 * `cli` instance.
 *
 * @private
 */
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const args = require('./lib/jsdoc/opts/args');
const Config = require('./lib/jsdoc/config');
const jsdocfs = require('./lib/jsdoc/fs');
const jsdocpath = require('./lib/jsdoc/path');
const stripJsonComments = require('strip-json-comments');
const app = require('./lib/jsdoc/app');
const env = require('./lib/jsdoc/env');
const logger = require('./lib/jsdoc/util/logger');
const Readme = require('./lib/jsdoc/readme');
const stripBom = require('./lib/jsdoc/util/stripbom');

const FATAL_ERROR_MESSAGE =
  'Exiting JSDoc because an error occurred. See the previous log messages for details.';

function readPackageJson(filepath) {
  try {
    return stripJsonComments(jsdocfs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    logger.error('Unable to read the package file "%s"', filepath);

    return null;
  }
}

function buildSourceList() {
  let packageJson;
  let readmeHtml;
  let sourceFile;
  let sourceFiles = env.opts._ ? env.opts._.slice(0) : [];

  if (env.conf.source && env.conf.source.include) {
    sourceFiles = sourceFiles.concat(env.conf.source.include);
  }

  // load the user-specified package/README files, if any
  if (env.opts.package) {
    packageJson = readPackageJson(env.opts.package);
  }
  if (env.opts.readme) {
    readmeHtml = new Readme(env.opts.readme).html;
  }

  // source files named `package.json` or `README.md` get special treatment, unless the user
  // explicitly specified a package and/or README file
  for (let i = 0, l = sourceFiles.length; i < l; i++) {
    sourceFile = sourceFiles[i];

    if (!env.opts.package && /\bpackage\.json$/i.test(sourceFile)) {
      packageJson = readPackageJson(sourceFile);
      sourceFiles.splice(i--, 1);
    }

    if (!env.opts.readme && /(\bREADME|\.md)$/i.test(sourceFile)) {
      readmeHtml = new Readme(sourceFile).html;
      sourceFiles.splice(i--, 1);
    }
  }

  this.props.packageJson = packageJson;
  env.opts.readme = readmeHtml;

  return sourceFiles;
}

function resolvePluginPaths(paths) {
  const pluginPaths = [];

  paths.forEach((plugin) => {
    const basename = jsdocpath.basename(plugin);
    const dirname = jsdocpath.dirname(plugin);
    const pluginPath = jsdocpath.getResourcePath(dirname, basename);

    if (!pluginPath) {
      logger.error('Unable to find the plugin "%s"', plugin);

      return;
    }

    pluginPaths.push(pluginPath);
  });

  return pluginPaths;
}

export default class CLI {
  constructor() {
    this.props = {
      docs: [],
      packageJson: null,
      shouldExitWithError: false,
      tmpdir: null,
    };
  }

  // TODO: docs
  setVersionInfo = () => {
    // allow this to throw--something is really wrong if we can't read our own package file
    const info = JSON.parse(stripBom.strip(fs.readFileSync(path.join(env.dirname, 'package.json'), 'utf8')));

    env.version = {
      number: info.version,
      revision: new Date(parseInt(info.revision, 10)).toUTCString(),
    };

    return this;
  };

  // TODO: docs
  loadConfig = () => {
    let config;
    let confPath;
    let isFile;

    const defaultOpts = {
      destination: './out/',
      encoding: 'utf8',
    };

    try {
      env.opts = args.parse(env.args);
    } catch (e) {
      console.error(`${e.message}\n`);
      this.printHelp().then(() => {
        this.exit(1);
      });
    }

    confPath = env.opts.configure || path.join(env.dirname, 'conf.json');
    try {
      isFile = jsdocfs.statSync(confPath).isFile();
    } catch (e) {
      isFile = false;
    }

    if (!isFile && !env.opts.configure) {
      confPath = path.join(env.dirname, 'conf.json.EXAMPLE');
    }

    try {
      switch (path.extname(confPath)) {
        case '.js':
          config = require(path.resolve(confPath)) || {};
          break;
        case '.json':
        case '.EXAMPLE':
        default:
          config = jsdocfs.readFileSync(confPath, 'utf8');
          break;
      }
      env.conf = new Config(config).get();
    } catch (e) {
      this.exit(1, `Cannot parse the config file ${confPath}: ${e}\n${FATAL_ERROR_MESSAGE}`);
    }

    // look for options on the command line, in the config file, and in the defaults, in that order
    env.opts = _.defaults(env.opts, env.conf.opts, defaultOpts);

    return this;
  };

  // TODO: docs
  configureLogger = () => {
    function recoverableError() {
      this.props.shouldExitWithError = true;
    }

    function fatalError() {
      this.exit(1);
    }

    if (env.opts.debug) {
      logger.setLevel(logger.LEVELS.DEBUG);
    } else if (env.opts.verbose) {
      logger.setLevel(logger.LEVELS.INFO);
    }

    if (env.opts.pedantic) {
      logger.once('logger:warn', recoverableError);
      logger.once('logger:error', fatalError);
    } else {
      logger.once('logger:error', recoverableError);
    }

    logger.once('logger:fatal', fatalError);

    return this;
  };

  // TODO: docs
  logStart = () => {
    logger.debug(this.getVersion());

    logger.debug('Environment info: %j', {
      env: {
        conf: env.conf,
        opts: env.opts,
      },
    });
  };

  // TODO: docs
  logFinish = () => {
    let delta;
    let deltaSeconds;

    if (env.run.finish && env.run.start) {
      delta = env.run.finish.getTime() - env.run.start.getTime();
    }

    if (delta !== undefined) {
      deltaSeconds = (delta / 1000).toFixed(2);
      logger.info('Finished running in %s seconds.', deltaSeconds);
    }
  };

  // TODO: docs
  runCommand = (cb) => {
    let cmd;

    const { opts } = env;

    if (opts.help) {
      cmd = this.printHelp;
    } else if (opts.test) {
      cmd = this.runTests;
    } else if (opts.version) {
      cmd = this.printVersion;
    } else {
      cmd = this.main;
    }

    cmd().then((errCode) => {
      let errorCode = errCode;

      if (!errCode && this.props.shouldExitWithError) {
        errorCode = 1;
      }
      cb(errorCode);
    });
  };

  // TODO: docs
  printHelp = () => {
    this.printVersion();
    console.log(`\n${require('./lib/jsdoc/opts/args').help()}\n`);
    console.log('Visit http://usejsdoc.org for more information.');

    return Promise.resolve(0);
  };

  // TODO: docs
  runTests = () => {
    const runner = Promise.promisify(require(jsdocpath.join(env.dirname, 'test/runner')));

    console.log('Running tests...');

    return runner();
  };

  // TODO: docs
  getVersion = () => `JSDoc ${env.version.number} (${env.version.revision})`;

  // TODO: docs
  printVersion = () => {
    console.log(this.getVersion());

    return Promise.resolve(0);
  };

  // TODO: docs
  main = () => {
    this.scanFiles();

    if (env.sourceFiles.length === 0) {
      console.log('There are no input files to process.');

      return Promise.resolve(0);
    }
    return this.createParser()
      .parseFiles()
      .processParseResults()
      .then(() => {
        env.run.finish = new Date();

        return 0;
      });
  };

  // TODO: docs
  scanFiles = () => {
    const { Filter } = require('./lib/jsdoc/src/filter');

    let filter;

    env.opts._ = buildSourceList();

    // are there any files to scan and parse?
    if (env.conf.source && env.opts._.length) {
      filter = new Filter(env.conf.source);

      env.sourceFiles = app.jsdoc.scanner.scan(
        env.opts._,
        env.opts.recurse ? env.conf.recurseDepth : undefined,
        filter,
      );
    }

    return this;
  };

  createParser = () => {
    const handlers = require('./lib/jsdoc/src/handlers');
    const parser = require('./lib/jsdoc/src/parser');
    const plugins = require('./lib/jsdoc/plugins');

    app.jsdoc.parser = parser.createParser(env.conf.parser);

    if (env.conf.plugins) {
      env.conf.plugins = resolvePluginPaths(env.conf.plugins);
      plugins.installPlugins(env.conf.plugins, app.jsdoc.parser);
    }

    handlers.attachTo(app.jsdoc.parser);

    return this;
  };

  parseFiles = () => {
    const augment = require('./lib/jsdoc/augment');
    const borrow = require('./lib/jsdoc/borrow');
    const { Package } = require('./lib/jsdoc/package');

    const docs = app.jsdoc.parser.parse(env.sourceFiles, env.opts.encoding);
    this.props.docs = docs;

    // If there is no package.json, just create an empty package
    const packageDocs = new Package(this.props.packageJson);
    packageDocs.files = env.sourceFiles || [];
    docs.push(packageDocs);

    logger.debug('Adding inherited symbols, mixins, and interface implementations...');
    augment.augmentAll(docs);
    logger.debug('Adding borrowed doclets...');
    borrow.resolveBorrows(docs);
    logger.debug('Post-processing complete.');

    app.jsdoc.parser.fireProcessingComplete(docs);

    return this;
  };

  processParseResults = () => {
    if (env.opts.explain) {
      this.dumpParseResults();

      return Promise.resolve();
    }
    this.resolveTutorials();

    return this.generateDocs();
  };

  dumpParseResults = () => {
    console.log(require('./lib/jsdoc/util/dumper').dump(this.props.docs));

    return this;
  };

  resolveTutorials = () => {
    const resolver = require('./lib/jsdoc/tutorial/resolver');

    if (env.opts.tutorials) {
      resolver.load(env.opts.tutorials);
      resolver.resolve();
    }

    return this;
  };

  generateDocs = () => {
    const resolver = require('./lib/jsdoc/tutorial/resolver');
    const { taffy } = require('taffydb');

    let template;

    env.opts.template = (function () {
      const publish = env.opts.template || 'templates/default';
      const templatePath = jsdocpath.getResourcePath(publish);

      // if we didn't find the template, keep the user-specified value so the error message is
      // useful
      return templatePath || env.opts.template;
    }());

    try {
      template = require(`${env.opts.template}/publish`);
    } catch (e) {
      logger.fatal(`Unable to load template: ${e.message}` || e);
    }

    // templates should include a publish.js file that exports a "publish" function
    if (template.publish && typeof template.publish === 'function') {
      logger.info('Generating output files...');
      const publishPromise = template.publish(taffy(this.props.docs), env.opts, resolver.root);

      return Promise.resolve(publishPromise);
    }
    logger.fatal(`${env.opts.template} does not export a "publish" function. Global ` +
        '"publish" functions are no longer supported.');

    return Promise.resolve();
  };

  // TODO: docs
  exit = (exitCode, message) => {
    if (exitCode > 0 && message) {
      logger.error(message);
    }
    process.on('exit', () => {
      process.exit(exitCode);
    });
  };
}
