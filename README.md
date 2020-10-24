# parse-server-fs-adapter
[![Build Status](https://travis-ci.org/parse-community/parse-server-fs-adapter.svg?branch=master)](https://travis-ci.org/parse-community/parse-server-fs-adapter)
[![codecov.io](https://codecov.io/github/parse-community/parse-server-fs-adapter/coverage.svg?branch=master)](https://codecov.io/github/parse-community/parse-server-fs-adapter?branch=master)

parse-server file system storage adapter. 


# Multiple instances of parse-server
When using parse-server-fs-adapter across multiple parse-server instances it's important to establish "centralization" of your file storage (this is the same premise as the other file adapters, you are sending/recieving files through a dedicated link). You can accomplish this at the file storage level by Samba mounting (or any other type of mounting) your storage to each of your parse-server instances, e.g if you are using parse-server via docker (volume mount your SMB drive to `- /Volumes/SMB-Drive/MyParseApp1/files:/parse-server/files`). All parse-server instances need to be able to read and write to the same storage in order for parse-server-fs-adapter to work properly with parse-server. If the file storage isn't centralized, parse-server will have trouble locating files and you will get random behavior on client-side.

# Installation

`npm install --save @parse/fs-files-adapter`

# Usage with parse-server

### Using a config file

```javascript
{
  "appId": 'my_app_id',
  "masterKey": 'my_master_key',
  // other options
  "filesAdapter": {
    "module": "@parse/fs-files-adapter",
    "options": {
      "filesSubDirectory": "my/files/folder", // optional, defaults to ./files
      "encryptionKey": "someKey" //optional, but mandatory if you want to encrypt files
    } 
  }
}
```

### Passing as an instance

```javascript
var FSFilesAdapter = require('@parse/fs-files-adapter');

var fsAdapter = new FSFilesAdapter({
  "filesSubDirectory": "my/files/folder", // optional, defaults to ./files
  "encryptionKey": "someKey" //optional, but mandatory if you want to encrypt files
});

var api = new ParseServer({
	appId: 'my_app',
	masterKey: 'master_key',
	filesAdapter: fsAdapter
})
```

### Rotating to a new encryptionKey
Periodically you may want to rotate your encryptionKey for security reasons. When this is the case, you can start up a development parse-server that has the same configuration as your production server. In the development server, initialize the file adapter with the new key and do the following in your `index.js`:

#### Files were previously unencrypted and you want to encrypt
```javascript
var FSFilesAdapter = require('@parse/fs-files-adapter');

var fsAdapter = new FSFilesAdapter({
  "filesSubDirectory": "my/files/folder", // optional, defaults to ./files
  "encryptionKey": "newKey" //Use the newKey
});

var api = new ParseServer({
	appId: 'my_app',
	masterKey: 'master_key',
	filesAdapter: fsAdapter
})

//This can take awhile depending on how many files and how larger they are. It will attempt to rotate the key of all files in your filesSubDirectory
//It is not recommended to do this on the production server, deploy a development server to complete the process.
const {rotated, notRotated} =  await api.filesAdapter.rotateEncryptionKey();
console.log('Files rotated to newKey: ' + rotated);
console.log('Files that couldn't be rotated to newKey: ' + notRotated);
```

After successfully rotating your key, you should change the `encryptionKey` to `newKey` on your production server and then restart the server.


#### Files were previously encrypted with `oldKey` and you want to encrypt with `newKey`
The same process as above, but pass in your `oldKey` to `rotateEncryptionKey()`.
```javascript
//This can take awhile depending on how many files and how larger they are. It will attempt to rotate the key of all files in your filesSubDirectory
const {rotated, notRotated} =  await api.filesAdapter.rotateEncryptionKey({oldKey: oldKey});
console.log('Files rotated to newKey: ' + rotated);
console.log('Files that couldn't be rotated to newKey: ' + notRotated);
```

#### Only rotate a select list of files that were previously encrypted with `oldKey` and you want to encrypt with `newKey`
This is useful if for some reason there errors and some of the files werent rotated and returned in `notRotated`. The same process as above, but pass in your `oldKey` along with the array of `fileNames` to `rotateEncryptionKey()`.
```javascript
//This can take awhile depending on how many files and how larger they are. It will attempt to rotate the key of all files in your filesSubDirectory
const {rotated, notRotated} =  await api.filesAdapter.rotateEncryptionKey({oldKey: oldKey, fileNames: ["fileName1.png","fileName2.png"]});
console.log('Files rotated to newKey: ' + rotated);
console.log('Files that couldn't be rotated to newKey: ' + notRotated);
```
