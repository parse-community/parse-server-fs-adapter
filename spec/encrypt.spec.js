'use strict';
let FileSystemAdapter = require('../index.js');

describe('File encryption tests', () => {
    var adapter = new FileSystemAdapter({
        filesSubDirectory: 'sub1/sub2',
        encrypt: true,
        secretKey: 'test'
    })
    it("should properly create, read, delete files", (done) => {
        var filename = 'file.txt';
        adapter.createFile(filename, "hello world", 'text/utf8').then((result) => {
            return adapter.getFileData(filename);
        }, (err) => {
            fail("The adapter should create the file");
            done();
        }).then((result) => {
            expect(result instanceof Buffer).toBe(true);
            expect(result.toString('utf-8')).toEqual("hello world");
            adapter.deleteFile(filename);
            done()
        })
    }, 5000);
})

