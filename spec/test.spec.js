'use strict';
let filesAdapterTests = require('parse-server-conformance-tests').files;

let FileSystemAdapter = require('../index.js');

describe('FileSystemAdapter tests', () => {
  var fsAdapter = new FileSystemAdapter({
    filesSubDirectory: 'sub1/sub2'
  });

  filesAdapterTests.testAdapter("FileSystemAdapter", fsAdapter);  
})
