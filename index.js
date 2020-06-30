'use strict';
// FileSystemAdapter
//
// Stores files in local file system
// Requires write access to the server's file system.

var fs = require('fs');
var path = require('path');
var pathSep = require('path').sep;
const crypto = require("crypto");
const algorithm = 'aes-256-cbc';

function FileSystemAdapter(options) {
  options = options || {};
  this._encrypt = false;
  this._secretKey = "";

  if (options.encrypt && options.encrypt == true){
    if (!options.secretKey){
        throw "Encrypt key not defined";
    }
    this._encrypt = true;
    this._secretKey = crypto.createHash('sha256').update(String(options.secretKey)).digest('base64').substr(0, 32);
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
      if(err !== null) {
        return reject(err);
      }
      if(this._encrypt === true){	  
        const iv = crypto.createHash('sha256').update(String(this._secretKey)).digest('base64').substr(0, 16);
        const cipher = crypto.createCipheriv(algorithm, this._secretKey, iv);
        const input = fs.createReadStream(filepath);
        const output = fs.createWriteStream(filepath+'.enc');
        input.pipe(cipher).pipe(output);
        output.on('finish', function() {
          fs.unlink(filepath, function(err) {
            if (err !== null) {
              return reject(err);
            }
            fs.rename(filepath+'.enc', filepath, function(err) {
              if (err !== null) {
                return reject(err);
              }
              resolve(data);
            });
          });
        });           
      }else{
        resolve(data);
      }
    });
  });
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
    const encrypt = this._encrypt;
    const secretKey = this._secretKey;
    fs.readFile( filepath , function (err, data) {
      if(err !== null) {
        return reject(err);
      }
      if(encrypt){
         const iv = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 16);
         const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
         resolve(Buffer.concat([decipher.update(data), decipher.final()]));
      }
      resolve(data);
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
