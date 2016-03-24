# parse-server-fs-adapter
[![Build Status](https://travis-ci.org/parse-server-modules/parse-server-fs-adapter.svg?branch=master)](https://travis-ci.org/parse-server-modules/parse-server-fs-adapter)
[![codecov.io](https://codecov.io/github/parse-server-modules/parse-server-fs-adapter/coverage.svg?branch=master)](https://codecov.io/github/parse-server-modules/parse-server-fs-adapter?branch=master)

parse-server file system storage adapter 


# installation

`npm install --save parse-server-fs-adapter`

# usage with parse-server

### using a config file

```
{
  "appId": 'my_app_id',
  "masterKey": 'my_master_key',
  // other options
  "filesAdapter": {
    "module": "parse-server-fs-adapter",
    "options": {
      "filesSubDirectory": "my/files/folder" // optional
    } 
  }
}
```

### passing as an instance

```
var FSFilesAdapter = require('parse-server-fs-adapter');

var fsAdapter = new FSFilesAdapter({
      "filesSubDirectory": "my/files/folder" // optional
    });

var api = new ParseServer({
	appId: 'my_app',
	masterKey: 'master_key',
	filesAdapter: fsAdapter
})
```

