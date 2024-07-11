'use strict';
const FileSystemAdapter = require('../index.js');
const fs = require('fs');
const os = require('os')
const path = require('path');

describe('File encryption tests', () => {
  const directory = 'sub1/sub2';

  afterEach(function() {
    if(this.skipCleanup) return;
    const filesDir = this.filesDir ?? 'files';
    const fileNames = fs.readdirSync(filesDir);
    fileNames.filter(fileName => fileName.indexOf('.') === 0);
    fileNames.forEach(fileName => {
      fs.unlinkSync(path.join(filesDir, fileName));
    })
  });

  it('should create file location based on config', async function () {
    this.skipCleanup = true;
    const fsAdapter = new FileSystemAdapter();
    const config = {mount: '/parse', applicationId: 'yolo'}
    const location = fsAdapter.getFileLocation(config, 'hello.txt')
    expect(location).toBe('/parse/files/yolo/hello.txt');
  }, 5000)

  it("should save encrypted file in default directory", async function() {
    this.skipCleanup = true;
    const adapter = new FileSystemAdapter({
      encryptionKey: '89E4AFF1-DFE4-4603-9574-BFA16BB446FD'
    });
    const filename = 'file2.txt';
    const filePath = 'files/' + filename;
    await adapter.createFile(filename, "hello world", 'text/utf8');
    const result = await adapter.getFileData(filename);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual("hello world");
    const data = fs.readFileSync(filePath);
    expect(data.toString('utf-8')).not.toEqual("hello world");
  }, 5000);

  it("should save encrypted file in specified directory", async function() {
    const adapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: '89E4AFF1-DFE4-4603-9574-BFA16BB446FD'
    });
    const filename = 'file2.txt';
    const filePath = directory + '/' + filename;
    this.filesDir = directory;
    await adapter.createFile(filename, "hello world", 'text/utf8');
    const result = await adapter.getFileData(filename);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual("hello world");
    const data = fs.readFileSync(filePath);
    expect(data.toString('utf-8')).not.toEqual("hello world");
  }, 5000);

  it("should save encrypted file in specified directory when directory is absolute", async function() {
    const tmpDir = await new Promise( (res, rej)=> {
      fs.mkdtemp(path.join(os.tmpdir() + 'files'), (err, dir) => {
        if (err) {
          rej(err);
        } else {
          res(dir);
        }
      });
    });
    const adapter = new FileSystemAdapter({
      filesSubDirectory: tmpDir + '/sub1/sub2',
      encryptionKey: '89E4AFF1-DFE4-4603-9574-BFA16BB446FD'
    });
    const filename = 'file2.txt';
    const filePath = tmpDir + '/' + directory + '/' + filename;
    this.filesDir = path.join(tmpDir, directory);
    await adapter.createFile(filename, "hello world", 'text/utf8');
    const result = await adapter.getFileData(filename);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual("hello world");
    const data = fs.readFileSync(filePath);
    expect(data.toString('utf-8')).not.toEqual("hello world");
  }, 5000);

  it("should rotate key of all unencrypted files to encrypted files", async function() {
    const unEncryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory
    });
    const encryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: '89E4AFF1-DFE4-4603-9574-BFA16BB446FD'
    });
    const fileName1 = 'file1.txt';
    const data1 = "hello world";
    const fileName2 = 'file2.txt';
    const data2 = "hello new world";
    const filePath1 = directory + '/' + fileName1;
    const filePath2 = directory + '/' + fileName2;
    this.filesDir = directory;
    // Store unecrypted files
    await unEncryptedAdapter.createFile(fileName1, data1, 'text/utf8');
    let result = await unEncryptedAdapter.getFileData(fileName1);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data1);
    const unEncryptedData1 = fs.readFileSync(filePath1);
    await unEncryptedAdapter.createFile(fileName2, data2, 'text/utf8');
    result = await unEncryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const unEncryptedData2 = fs.readFileSync(filePath2);
    // Check if encrypted adapter can read data and make sure it's not the same as unEncrypted adapter
    const {rotated, notRotated} =  await encryptedAdapter.rotateEncryptionKey();
    expect(rotated.length).toEqual(2);
    expect(rotated.filter(function(value){ return value === fileName1;}).length).toEqual(1);
    expect(rotated.filter(function(value){ return value === fileName2;}).length).toEqual(1);
    expect(notRotated.length).toEqual(0);
    result = await encryptedAdapter.getFileData(fileName1);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data1);
    const encryptedData1 = fs.readFileSync(filePath1);
    expect(encryptedData1.toString('utf-8')).not.toEqual(unEncryptedData1);
    result = await encryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const encryptedData2 = fs.readFileSync(filePath2);
    expect(encryptedData2.toString('utf-8')).not.toEqual(unEncryptedData2);
  }, 5000);

  it("should rotate key of all old encrypted files to files encrypted with a new key", async function() {
    const oldEncryptionKey = 'oldKeyThatILoved';
    const oldEncryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: oldEncryptionKey
    });
    const encryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: 'newKeyThatILove'
    });
    const fileName1 = 'file1.txt';
    const data1 = "hello world";
    const fileName2 = 'file2.txt';
    const data2 = "hello new world";
    const filePath1 = directory + '/' + fileName1;
    const filePath2 = directory + '/' + fileName2;
    this.filesDir = directory;
    // Store original encrypted files
    await oldEncryptedAdapter.createFile(fileName1, data1, 'text/utf8');
    let result = await oldEncryptedAdapter.getFileData(fileName1);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data1);
    const oldEncryptedData1 = fs.readFileSync(filePath1);
    await oldEncryptedAdapter.createFile(fileName2, data2, 'text/utf8');
    result = await oldEncryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const oldEncryptedData2 = fs.readFileSync(filePath2);
    // Check if encrypted adapter can read data and make sure it's not the same as unEncrypted adapter
    const {rotated, notRotated} =  await encryptedAdapter.rotateEncryptionKey({oldKey: oldEncryptionKey});
    expect(rotated.length).toEqual(2);
    expect(rotated.filter(function(value){ return value === fileName1;}).length).toEqual(1);
    expect(rotated.filter(function(value){ return value === fileName2;}).length).toEqual(1);
    expect(notRotated.length).toEqual(0);
    const result2 = await encryptedAdapter.getFileData(fileName1);
    expect(result2 instanceof Buffer).toBe(true);
    expect(result2.toString('utf-8')).toEqual(data1);
    const encryptedData1 = fs.readFileSync(filePath1);
    expect(encryptedData1.toString('utf-8')).not.toEqual(oldEncryptedData1);
    result = await encryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const encryptedData2 = fs.readFileSync(filePath2);
    expect(encryptedData2.toString('utf-8')).not.toEqual(oldEncryptedData2);
  }, 5000);

  it("should rotate key of all old encrypted files to unencrypted files", async function() {
    const oldEncryptionKey = 'oldKeyThatILoved';
    const oldEncryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: oldEncryptionKey
    });
    const unEncryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory
    });
    const fileName1 = 'file1.txt';
    const data1 = "hello world";
    const fileName2 = 'file2.txt';
    const data2 = "hello new world";
    const filePath1 = directory + '/' + fileName1;
    const filePath2 = directory + '/' + fileName2;
    this.filesDir = directory;
    // Store original encrypted files
    await oldEncryptedAdapter.createFile(fileName1, data1, 'text/utf8');
    let result = await oldEncryptedAdapter.getFileData(fileName1);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data1);
    const oldEncryptedData1 = fs.readFileSync(filePath1);
    await oldEncryptedAdapter.createFile(fileName2, data2, 'text/utf8');
    result = await oldEncryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const oldEncryptedData2 = fs.readFileSync(filePath2);
    // Check if unEncrypted adapter can read data and make sure it's not the same as oldEncrypted adapter
    const {rotated, notRotated} =  await unEncryptedAdapter.rotateEncryptionKey({oldKey: oldEncryptionKey});
    expect(rotated.length).toEqual(2);
    expect(rotated.filter(function(value){ return value === fileName1;}).length).toEqual(1);
    expect(rotated.filter(function(value){ return value === fileName2;}).length).toEqual(1);
    expect(notRotated.length).toEqual(0);
    const result2 = await unEncryptedAdapter.getFileData(fileName1);
    expect(result2 instanceof Buffer).toBe(true);
    expect(result2.toString('utf-8')).toEqual(data1);
    const encryptedData1 = fs.readFileSync(filePath1);
    expect(encryptedData1.toString('utf-8')).not.toEqual(oldEncryptedData1);
    result = await unEncryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const encryptedData2 = fs.readFileSync(filePath2);
    expect(encryptedData2.toString('utf-8')).not.toEqual(oldEncryptedData2);
  }, 5000);

  it("should only encrypt specified fileNames with the new key", async function() {
    const oldEncryptionKey = 'oldKeyThatILoved';
    const oldEncryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: oldEncryptionKey
    });
    const encryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: 'newKeyThatILove'
    });
    const unEncryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory
    });
    const fileName1 = 'file1.txt';
    const data1 = "hello world";
    const fileName2 = 'file2.txt';
    const data2 = "hello new world";
    const filePath1 = directory + '/' + fileName1;
    const filePath2 = directory + '/' + fileName2;
    this.filesDir = directory;
    // Store original encrypted files
    await oldEncryptedAdapter.createFile(fileName1, data1, 'text/utf8');
    let result = await oldEncryptedAdapter.getFileData(fileName1);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data1);
    const oldEncryptedData1 = fs.readFileSync(filePath1);
    await oldEncryptedAdapter.createFile(fileName2, data2, 'text/utf8');
    result = await oldEncryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const oldEncryptedData2 = fs.readFileSync(filePath2);
    // Inject unecrypted file to see if causes an issue
    const fileName3 = 'file3.txt';
    const data3 = "hello past world";
    await unEncryptedAdapter.createFile(fileName3, data3, 'text/utf8');
    // Check if encrypted adapter can read data and make sure it's not the same as unEncrypted adapter
    const {rotated, notRotated} =  await encryptedAdapter.rotateEncryptionKey({oldKey: oldEncryptionKey, fileNames: [fileName1,fileName2]});
    expect(rotated.length).toEqual(2);
    expect(rotated.filter(function(value){ return value === fileName1;}).length).toEqual(1);
    expect(rotated.filter(function(value){ return value === fileName2;}).length).toEqual(1);
    expect(notRotated.length).toEqual(0);
    expect(rotated.filter(function(value){ return value === fileName3;}).length).toEqual(0);
    const result2 = await encryptedAdapter.getFileData(fileName1);
    expect(result2 instanceof Buffer).toBe(true);
    expect(result2.toString('utf-8')).toEqual(data1);
    const encryptedData1 = fs.readFileSync(filePath1);
    expect(encryptedData1.toString('utf-8')).not.toEqual(oldEncryptedData1);
    result = await encryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const encryptedData2 = fs.readFileSync(filePath2);
    expect(encryptedData2.toString('utf-8')).not.toEqual(oldEncryptedData2);
  }, 5000);

  it("should return fileNames of those it can't encrypt with the new key", async function() {
    const oldEncryptionKey = 'oldKeyThatILoved';
    const oldEncryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: oldEncryptionKey
    });
    const encryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory,
      encryptionKey: 'newKeyThatILove'
    });
    const unEncryptedAdapter = new FileSystemAdapter({
      filesSubDirectory: directory
    });
    const fileName1 = 'file1.txt';
    const data1 = "hello world";
    const fileName2 = 'file2.txt';
    const data2 = "hello new world";
    const filePath1 = directory + '/' + fileName1;
    const filePath2 = directory + '/' + fileName2;
    this.filesDir = directory;
    // Store original encrypted files
    await oldEncryptedAdapter.createFile(fileName1, data1, 'text/utf8');
    let result = await oldEncryptedAdapter.getFileData(fileName1);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data1);
    const oldEncryptedData1 = fs.readFileSync(filePath1);
    await oldEncryptedAdapter.createFile(fileName2, data2, 'text/utf8');
    result = await oldEncryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const oldEncryptedData2 = fs.readFileSync(filePath2);
    // Inject unecrypted file to cause an issue
    const fileName3 = 'file3.txt';
    const data3 = "hello past world";
    await unEncryptedAdapter.createFile(fileName3, data3, 'text/utf8');
    result = await unEncryptedAdapter.getFileData(fileName3);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data3);
    // Check if encrypted adapter can read data and make sure it's not the same as unEncrypted adapter
    const {rotated, notRotated} =  await encryptedAdapter.rotateEncryptionKey({oldKey: oldEncryptionKey});
    expect(rotated.length).toEqual(2);
    expect(rotated.filter(function(value){ return value === fileName1;}).length).toEqual(1);
    expect(rotated.filter(function(value){ return value === fileName2;}).length).toEqual(1);
    expect(notRotated.length).toEqual(1);
    expect(notRotated.filter(function(value){ return value === fileName3;}).length).toEqual(1);
    const result2 = await encryptedAdapter.getFileData(fileName1);
    expect(result2 instanceof Buffer).toBe(true);
    expect(result2.toString('utf-8')).toEqual(data1);
    const encryptedData1 = fs.readFileSync(filePath1);
    expect(encryptedData1.toString('utf-8')).not.toEqual(oldEncryptedData1);
    result = await encryptedAdapter.getFileData(fileName2);
    expect(result instanceof Buffer).toBe(true);
    expect(result.toString('utf-8')).toEqual(data2);
    const encryptedData2 = fs.readFileSync(filePath2);
    expect(encryptedData2.toString('utf-8')).not.toEqual(oldEncryptedData2);
  }, 5000);
})
