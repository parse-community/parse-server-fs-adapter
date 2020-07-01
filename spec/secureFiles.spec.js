'use strict';
let FileSystemAdapter = require('../index.js');
var fs = require('fs');

describe('File encryption tests', () => {
    const directory = 'sub1/sub2';

    it("should save/delete file in it's unencrypted format", async function(done) {
        var adapter = new FileSystemAdapter({
            filesSubDirectory: directory
        });
        var filename = 'file.txt';
        const filePath = 'files/'+directory+'/'+filename;
        await adapter.createFile(filename, "hello world", 'text/utf8');
        const result = await adapter.getFileData(filename);
        expect(result instanceof Buffer).toBe(true);
        expect(result.toString('utf-8')).toEqual("hello world");
        const data = fs.readFileSync(filePath);
        expect(data.toString('utf-8')).toEqual("hello world");
        await adapter.deleteFile(filename);
        done()
    }, 5000);

    it("should save/delete file in it's encrypted format", async function(done) {
        var adapter = new FileSystemAdapter({
            filesSubDirectory: directory,
            fileKey: '89E4AFF1-DFE4-4603-9574-BFA16BB446FD'
        });
        var filename = 'file2.txt';
        const filePath = 'files/'+directory+'/'+filename;
        await adapter.createFile(filename, "hello world", 'text/utf8');
        const result = await adapter.getFileData(filename);
        expect(result instanceof Buffer).toBe(true);
        expect(result.toString('utf-8')).toEqual("hello world");
        const data = fs.readFileSync(filePath);
        expect(data.toString('utf-8')).not.toEqual("hello world");
        await adapter.deleteFile(filename);
        done()
    }, 5000);
})
