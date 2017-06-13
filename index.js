'use strict';
// FileSystemAdapter
//
// Stores files in local file system
// Requires write access to the server's file system.

var fs = require('fs');
var path = require('path');
var pathSep = require('path').sep;
var nodecipher = require('node-cipher');

function FileSystemAdapter(options) {
  options = options || {};

    this._encrypt = false;
    this._secretKey = "";

  if (options.encrypt && options.encrypt == true){
      if (!options.secretKey){
          throw "Encrypt key not defined";
      }
      this._encrypt =true;
      this._secretKey = options.secretKey;
  }
  let filesSubDirectory = options.filesSubDirectory || '';
  this._filesDir = filesSubDirectory;
  this._mkdir(this._getApplicationDir());
  if (!this._applicationDirExist()) {
    throw "Files directory doesn't exist.";
  }
}

FileSystemAdapter.prototype.createFile = function(filename, data) {
  return new Promise((resolve, reject) => {
      let filepath = this._getLocalFilePath(filename);

      fs.writeFile(filepath, data, (err) => {
          if (err !== null) {
              return reject(err);
          }
          if(this._encrypt === true){
              nodecipher.encryptSync({
                  algorithm: 'aes-256-cbc',
                  input: filepath,
                  output: filepath,
                  password: this._secretKey
              }, function (err, opts) {
                  if(err){
                      return reject(err);
                  }
                  return resolve()
              })
          }
          return resolve(data);
      });
  })
}

FileSystemAdapter.prototype.deleteFile = function(filename) {
  return new Promise((resolve, reject) => {
    let filepath = this._getLocalFilePath(filename);
    fs.readFile( filepath , function (err, data) {
      if(err !== null) {
        return reject(err);
      }
      fs.unlink(filepath, (unlinkErr) => {
      if(err !== null) {
          return reject(unlinkErr);
        }
        resolve(data);
      });
    });

  });
}

FileSystemAdapter.prototype.getFileData = function(filename) {
  return new Promise((resolve, reject) => {
    let filepath = this._getLocalFilePath(filename);
    if(this._encrypt && this._encrypt == true){
        console.log(filename);
        console.log(filepath)
        nodecipher.decryptSync({
            input: filepath,
            output: filepath,
            algorithm: 'aes-256-cbc',
            password: this._secretKey
        }, function (err) {
            if (err){
                return reject(err)
            }
        })
    }
    fs.readFile(filepath , function (err, data) {
        if(err) {
            return reject(err);
        }
        return resolve(data);
    });
  });
}

FileSystemAdapter.prototype.getFileLocation = function(config, filename) {
  return config.mount + '/files/' + config.applicationId + '/' + encodeURIComponent(filename);
}

/*
  Helpers
 --------------- */
 FileSystemAdapter.prototype._getApplicationDir = function() {
  if (this._filesDir) {
    return path.join('files', this._filesDir);
  } else {
    return 'files';
  }
 }

FileSystemAdapter.prototype._applicationDirExist = function() {
  return fs.existsSync(this._getApplicationDir());
}

FileSystemAdapter.prototype._getLocalFilePath = function(filename) {
  let applicationDir = this._getApplicationDir();
  if (!fs.existsSync(applicationDir)) {
    this._mkdir(applicationDir);
  }
  return path.join(applicationDir, encodeURIComponent(filename));
}

FileSystemAdapter.prototype._mkdir = function(dirPath) {
  // snippet found on -> https://gist.github.com/danherbert-epam/3960169
  let dirs = dirPath.split(pathSep);
  var root = "";

  while (dirs.length > 0) {
    var dir = dirs.shift();
    if (dir === "") { // If directory starts with a /, the first path will be an empty string.
      root = pathSep;
    }
    if (!fs.existsSync(path.join(root, dir))) {
      try {
        fs.mkdirSync(path.join(root, dir));
      }
      catch (e) {
        if ( e.code == 'EACCES' ) {
          throw new Error("PERMISSION ERROR: In order to use the FileSystemAdapter, write access to the server's file system is required.");
        }
      }
    }
    root = path.join(root, dir, pathSep);
  }
}

module.exports = FileSystemAdapter;
module.exports.default = FileSystemAdapter;
