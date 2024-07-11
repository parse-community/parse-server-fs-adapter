'use strict';
// FileSystemAdapter
//
// Stores files in local file system
// Requires write access to the server's file system.

const fs = require('fs');
const path = require('path');
const pathSep = require('path').sep;
const crypto = require("crypto");
const algorithm = 'aes-256-gcm';

function FileSystemAdapter(options) {
  options = options || {};
  this._encryptionKey = null;

  if (options.encryptionKey !== undefined) {
    this._encryptionKey = crypto.createHash('sha256').update(String(options.encryptionKey)).digest('base64').substring(0, 32);
  }
  const filesSubDirectory = options.filesSubDirectory || '';
  this._filesDir = filesSubDirectory;
  this._mkdir(this._getApplicationDir());
  if (!this._applicationDirExist()) {
    throw "Files directory doesn't exist.";
  }
}

FileSystemAdapter.prototype.createFile = function(filename, data) {
  const filepath = this._getLocalFilePath(filename);
  const stream = fs.createWriteStream(filepath);
  return new Promise((resolve, reject) => {
    try {
      if (this._encryptionKey !== null) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
          algorithm,
          this._encryptionKey,
          iv
        );
        const encryptedResult = Buffer.concat([
          cipher.update(data),
          cipher.final(),
          iv,
          cipher.getAuthTag(),
        ]);
        stream.write(encryptedResult);
        stream.end();
        stream.on('finish', function() {
          resolve(data);
        });
      } else {
        stream.write(data);
        stream.end();
        stream.on('finish', function() {
          resolve(data);
        });
      }
    } catch(err) {
      return reject(err);
    }
  });
}

FileSystemAdapter.prototype.deleteFile = function(filename) {
  const filepath = this._getLocalFilePath(filename);
  const chunks = [];
  const stream = fs.createReadStream(filepath);
  return new Promise((resolve, reject) => {
    stream.read();
    stream.on('data', (data) => {
      chunks.push(data);
    });
    stream.on('end', () => {
      const data = Buffer.concat(chunks);
      fs.unlink(filepath, (err) => {
        if(err !== null) {
          return reject(err);
        }
        resolve(data);
      });
    });
    stream.on('error', (err) => {
      reject(err);
    });
  });
}

FileSystemAdapter.prototype.getFileData = function(filename) {
  const filepath = this._getLocalFilePath(filename);
  const stream = fs.createReadStream(filepath);
  stream.read();
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (data) => {
      chunks.push(data);
    });
    stream.on('end', () => {
      const data = Buffer.concat(chunks);
      if (this._encryptionKey !== null) {
        const authTagLocation = data.length - 16;
        const ivLocation = data.length - 32;
        const authTag = data.slice(authTagLocation);
        const iv = data.slice(ivLocation,authTagLocation);
        const encrypted = data.slice(0,ivLocation);
        try {
          const decipher = crypto.createDecipheriv(algorithm, this._encryptionKey, iv);
          decipher.setAuthTag(authTag);
          const decrypted = Buffer.concat([ decipher.update(encrypted), decipher.final() ]);
          return resolve(decrypted);
        } catch(err) {
          return reject(err);
        }
      }
      resolve(data);
    });
    stream.on('error', (err) => {
      reject(err);
    });
  });
}

FileSystemAdapter.prototype.rotateEncryptionKey = async function(options = {}) {
  const applicationDir = this._getApplicationDir();
  let fileNames = [];
  let oldKeyFileAdapter = {};
  if (options.oldKey !== undefined) {
    oldKeyFileAdapter = new FileSystemAdapter({ filesSubDirectory: this._filesDir, encryptionKey: options.oldKey });
  } else {
    oldKeyFileAdapter = new FileSystemAdapter({ filesSubDirectory: this._filesDir });
  }
  if (options.fileNames !== undefined) {
    fileNames = options.fileNames;
  } else {
    fileNames = fs.readdirSync(applicationDir);
    fileNames = fileNames.filter(fileName => fileName.indexOf('.') !== 0);
  }

  let fileNamesNotRotated = fileNames;
  const fileNamesRotated = [];
  for (const fileName of fileNames) {
    try {
      const plainTextData = await oldKeyFileAdapter.getFileData(fileName)
      // Overwrite file with data encrypted with new key
      await this.createFile(fileName, plainTextData)
      fileNamesRotated.push(fileName);
      fileNamesNotRotated = fileNamesNotRotated.filter(function(value) { return value !== fileName; });
    } catch(err) {
      continue;
    }
  }
  return { rotated: fileNamesRotated, notRotated: fileNamesNotRotated };
}

FileSystemAdapter.prototype.getFileLocation = function(config, filename) {
  return config.mount + '/files/' + config.applicationId + '/' + encodeURIComponent(filename);
}

/*
  Helpers
 --------------- */
FileSystemAdapter.prototype._getApplicationDir = function() {
  if(this._filesDir) {
    return this._filesDir;
  } else {
    return 'files';
  }
}

FileSystemAdapter.prototype._applicationDirExist = function() {
  return fs.existsSync(this._getApplicationDir());
}

FileSystemAdapter.prototype._getLocalFilePath = function(filename) {
  const applicationDir = this._getApplicationDir();
  if (!fs.existsSync(applicationDir)) {
    this._mkdir(applicationDir);
  }
  return path.join(applicationDir, encodeURIComponent(filename));
}

FileSystemAdapter.prototype._mkdir = function(dirPath) {
  // snippet found on -> https://gist.github.com/danherbert-epam/3960169
  const dirs = dirPath.split(pathSep);
  let root = "";

  while (dirs.length > 0) {
    const dir = dirs.shift();
    if (dir === "") { // If directory starts with a /, the first path will be an empty string.
      root = pathSep;
    }
    if (!fs.existsSync(path.join(root, dir))) {
      try {
        fs.mkdirSync(path.join(root, dir));
      } catch (err) {
        if (err.code == 'EACCES') {
          throw new Error("PERMISSION ERROR: In order to use the FileSystemAdapter, write access to the server's file system is required.");
        }
      }
    }
    root = path.join(root, dir, pathSep);
  }
}

module.exports = FileSystemAdapter;
module.exports.default = FileSystemAdapter;
