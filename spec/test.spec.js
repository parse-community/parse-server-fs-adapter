'use strict';
const filesAdapterTests = require('parse-server-conformance-tests').files;
const FileSystemAdapter = require('../index.js');

describe('FileSystemAdapter tests', () => {
  const fsAdapter = new FileSystemAdapter({
    filesSubDirectory: 'sub1/sub2'
  });

  filesAdapterTests.testAdapter("FileSystemAdapter", fsAdapter);
})

describe('FileSystemAdapter tests - no options', () => {
  const fsAdapter = new FileSystemAdapter();

  filesAdapterTests.testAdapter("FileSystemAdapter", fsAdapter);
})
