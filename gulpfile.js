/* eslint max-nested-callbacks: 0 */

const eslint = require('gulp-eslint');
const { exec } = require('child_process');
const gulp = require('gulp');
const jsonEditor = require('gulp-json-editor');
const path = require('path');
const util = require('util');

function execCb(cb, err, stdout, stderr) {
  console.log(stdout);
  console.error(stderr);
  cb(err);
}

const options = {
  coveragePaths: ['*.js', 'lib/**/*.js', 'plugins/*.js'],
  lintPaths: [
    '*.js',
    'lib/**/*.js',
    'plugins/*.js',
    'templates/default/*.js',
    'templates/haruki/*.js',
    'test/specs/**/*.js',
  ],
  nodeBin: path.resolve(__dirname, './jsdoc.js'),
  nodePath: process.execPath,
};

gulp.task('bump', () => {
  gulp
    .src('./package.json')
    .pipe(jsonEditor({
      revision: String(Date.now()),
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('coverage', (cb) => {
  const cmd = util.format('./node_modules/.bin/nyc --reporter=html %s -T', options.nodeBin);

  exec(cmd, execCb.bind(null, cb));
});

gulp.task('lint', () =>
  gulp
    .src(options.lintPaths)
    .pipe(eslint())
    .pipe(eslint.formatEach())
    .pipe(eslint.failOnError()));

gulp.task('test', (cb) => {
  const cmd = util.format('%s "%s" -T', options.nodePath, options.nodeBin);

  exec(cmd, execCb.bind(null, cb));
});

gulp.task('default', ['lint', 'test']);
