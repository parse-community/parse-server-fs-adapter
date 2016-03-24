# parse-server-fs-adapter
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

