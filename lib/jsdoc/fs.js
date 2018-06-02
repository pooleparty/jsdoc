/**
 * Extended version of the standard `fs` module.
 * @module jsdoc/fs
 */


var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var ls = (exports.ls = function (dir, recurse, _allFiles, _path) {
  var file;
  var files;
  var isFile;

  // first pass
  if (_path === undefined) {
    _allFiles = [];
    _path = [dir];
  }

  if (!_path.length) {
    return _allFiles;
  }

  if (recurse === undefined) {
    recurse = 1;
  }

  try {
    isFile = fs.statSync(dir).isFile();
  } catch (e) {
    isFile = false;
  }
  if (isFile) {
    files = [dir];
  } else {
    files = fs.readdirSync(dir);
  }

  for (var i = 0, l = files.length; i < l; i++) {
    file = String(files[i]);

    // skip dot files
    if (file.match(/^\.[^./\\]/)) {
      continue;
    }

    if (fs.statSync(path.join(_path.join('/'), file)).isDirectory()) {
      // it's a directory
      _path.push(file);

      if (_path.length - 1 < recurse) {
        ls(_path.join('/'), recurse, _allFiles, _path);
      }
      _path.pop();
    } else {
      // it's a file
      _allFiles.push(path.normalize(path.join(_path.join('/'), file)));
    }
  }

  return _allFiles;
});

exports.toDir = function (_path) {
  var isDirectory;

  _path = path.normalize(_path);

  try {
    isDirectory = fs.statSync(_path).isDirectory();
  } catch (e) {
    isDirectory = false;
  }

  if (isDirectory) {
    return _path;
  }
  return path.dirname(_path);
};

exports.mkPath = function (_path) {
  if (Array.isArray(_path)) {
    _path = _path.join('');
  }

  mkdirp.sync(_path);
};

var alwaysOverride = {
  copyFileSync: true,
};

Object.keys(fs).forEach((member) => {
  if (!alwaysOverride[member]) {
    exports[member] = fs[member];
  }
});
