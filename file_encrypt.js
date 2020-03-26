/* - - - - - - - - - - - - - - - - file encrypt by fiefdx- - - - - - - - - - - - - - - - -  */

"use strict";

const path = require('path');
const fs = require('fs');
const util = require('util');

const tea = require('node-tea');
const sha1 = require('sha1');

let encrypt_block_size = 1024 * 8;

const fsRead = util.promisify(fs.read);
const fsOpen = util.promisify(fs.open);
const fsWrite = util.promisify(fs.write);
const fsWriteFile = util.promisify(fs.writeFile);
const fsClose = util.promisify(fs.close);


function getEncryptLength(length) {
    let fillN = (8 - (length + 2)) % 8;
    if (fillN < 0) {
        fillN += 8;
    }
    fillN += 2;
    return 1 + length + fillN + 7;
}

function intToBytes(i) {
    let b = new Array(4);
    b[3] = i & 0x000000ff;
    b[2] = (i >>> 8) & 0x000000ff;
    b[1] = (i >>> 16) & 0x000000ff;
    b[0] = (i >>> 24) & 0x000000ff;
    return b;
}

function bytesToInt(b) {
    let i;
    i = (((b[0] & 0x000000ff) << 24)|
         ((b[1] & 0x000000ff) << 16)|
         ((b[2] & 0x000000ff) << 8)|
          (b[3] & 0x000000ff));
    return i;
}

function longToBytes(i) {
    let b = new Array(8);
    b[7] = i & 0x00000000000000ff;
    b[6] = (i >>> 8) & 0x00000000000000ff;
    b[5] = (i >>> 16) & 0x00000000000000ff;
    b[4] = (i >>> 24) & 0x00000000000000ff;
    b[3] = (i >>> 32) & 0x00000000000000ff;
    b[2] = (i >>> 40) & 0x00000000000000ff;
    b[1] = (i >>> 48) & 0x00000000000000ff;
    b[0] = (i >>> 56) & 0x00000000000000ff;
    return b;
}

function bytesToLong(b) {
    let i;
    i = (((b[0] & 0x00000000000000ff) << 56)|
         ((b[1] & 0x00000000000000ff) << 48)|
         ((b[2] & 0x00000000000000ff) << 40)|
         ((b[3] & 0x00000000000000ff) << 32)|
         ((b[4] & 0x00000000000000ff) << 24)|
         ((b[5] & 0x00000000000000ff) << 16)|
         ((b[6] & 0x00000000000000ff) << 8)|
          (b[7] & 0x00000000000000ff));
    return i;
}

function FileEncrypt(inPath, outPath, fileType, cryptFileName = true) {
    this.inPath = inPath;
    this.outPath = outPath || path.dirname(this.inPath); // if not specified outPath, then outPath will be inPath's base path
    this.fileName = path.basename(inPath);
    this.fileSize = 0;
    this.fileHeader = 'crypt';
    this.fileType = fileType || '.crypt';
    this.cryptFileName = cryptFileName;
    this.fileNamePos = 0;
    this.fileNameLen = 0;
    this.filePos = 0;
    this.fileLen = 0;
    this.encryptFileName = '';
    this.encryptFilePath = '';
    this.decryptFilePath = '';
    this.fp = null;
    this.progressCallInterval = 100; // 100 milliseconds
}

FileEncrypt.prototype.openSourceFile = function() {
    if (fs.existsSync(this.inPath) && fs.lstatSync(this.inPath).isFile()) {
        const stats = fs.statSync(this.inPath);
        this.fileSize = stats.size;
        this.fp = fs.openSync(this.inPath, 'r');
    } else {
        throw new Error(util.format("File [%s] doesn't exists!", this.inPath));
    }
}

FileEncrypt.prototype.encrypt = function(key, progressCallback) { // progressCallback(percent, startAt)
    let startAt = new Date();
    let lastCallAt = new Date();

    if (this.cryptFileName) {
        let fileNameHash = sha1(this.fileName);
        let timestamp = util.format("%d", Date.now());
        this.encryptFileName = sha1(util.format("%s%s%s", fileNameHash, this.fileSize, timestamp)) + this.fileType;
        this.encryptFilePath = path.join(this.outPath, this.encryptFileName);
    } else {
        let fileName = this.fileName.replace(/\.[^.]*$/, '') + this.fileType;
        this.encryptFilePath = path.join(this.outPath, fileName);
    }
    let cryptFp = null;
    if (!fs.existsSync(this.encryptFilePath)) {
        cryptFp = fs.openSync(this.encryptFilePath, 'w');
    } else {
        throw new Error(util.format("Encrypt file [%s] exists already!", this.encryptFilePath));
    }
    if (this.fp && cryptFp) {
        if (key != '') {
            if (progressCallback && typeof progressCallback === 'function') {
                progressCallback(0, startAt);
            }
            let headerFileName = tea.strToBytes(tea.encrypt(this.fileName, key));
            this.fileNamePos = 25;
            this.fileNameLen = headerFileName.length;
            this.filePos = this.fileNamePos + this.fileNameLen;
            fs.writeFileSync(cryptFp, new Buffer(tea.strToBytes(this.fileHeader)), {encoding: 'binary', flag: 'a'});
            fs.writeFileSync(cryptFp, new Buffer(intToBytes(this.fileNamePos)), {encoding: 'binary', flag: 'a'});
            fs.writeFileSync(cryptFp, new Buffer(intToBytes(this.fileNameLen)), {encoding: 'binary', flag: 'a'});
            fs.writeFileSync(cryptFp, new Buffer(intToBytes(this.filePos)), {encoding: 'binary', flag: 'a'});
            fs.writeFileSync(cryptFp, new Buffer(longToBytes(this.fileLen)), {encoding: 'binary', flag: 'a'});
            fs.writeFileSync(cryptFp, new Buffer(headerFileName), {encoding: 'binary', flag: 'a'});
            let currentPos = 0;
            while (true) {
                let buf = new Buffer(encrypt_block_size);
                let size = fs.readSync(this.fp, buf, 0, encrypt_block_size, currentPos);
                if (size == 0) {
                    fs.closeSync(this.fp);
                    break;
                }
                let cryptBuf = new Buffer(tea.encryptBytes(Array.from(buf.slice(0, size)), key));
                this.fileLen += cryptBuf.length;
                fs.writeFileSync(cryptFp, cryptBuf, {encoding: 'binary', flag: 'a'});
                currentPos += encrypt_block_size;
                let now = Date.now();
                if (progressCallback && typeof progressCallback === 'function' && currentPos < this.fileSize && now - lastCallAt.getTime() >= this.progressCallInterval) {
                    let percent = Math.floor(currentPos * 100 / this.fileSize);
                    if (percent > 100) {
                        percent = 100;
                    }
                    progressCallback(percent, startAt);
                    lastCallAt = new Date();
                }
            }
            fs.writeSync(cryptFp, new Buffer(longToBytes(this.fileLen)), 0, 8, 17);
            if (progressCallback && typeof progressCallback === 'function') {
                progressCallback(100, startAt);
            }
        } else {
            throw new Error("Password is empty!");
        }

        fs.closeSync(cryptFp);
    }
}

FileEncrypt.prototype.decrypt = function(key, progressCallback) { // progressCallback(percent, startAt)
    let startAt = new Date();
    let lastCallAt = new Date();
    let cryptFp = null;
    if (this.fp) {
        let fileHeader = new Buffer(this.fileHeader.length);
        fs.readSync(this.fp, fileHeader, 0, 5);
        if (tea.bytesToStr(Array.from(fileHeader)) == this.fileHeader) {
            if (key != '') {
                if (progressCallback && typeof progressCallback === 'function') {
                    progressCallback(0, startAt);
                }
                let fileNamePosBuf = new Buffer(4);
                let fileNameLenBuf = new Buffer(4);
                let filePosBuf = new Buffer(4);
                let fileLenBuf = new Buffer(8);
                fs.readSync(this.fp, fileNamePosBuf, 0, 4);
                fs.readSync(this.fp, fileNameLenBuf, 0, 4);
                fs.readSync(this.fp, filePosBuf, 0, 4);
                fs.readSync(this.fp, fileLenBuf, 0, 8);
                this.fileNamePos = bytesToInt(Array.from(fileNamePosBuf));
                this.fileNameLen = bytesToInt(Array.from(fileNameLenBuf));
                this.filePos = bytesToInt(Array.from(filePosBuf));
                this.fileLen = bytesToLong(Array.from(fileLenBuf));
                let fileNameBuf = new Buffer(this.fileNameLen);
                fs.readSync(this.fp, fileNameBuf, 0, this.fileNameLen, this.fileNamePos);
                let fileName = tea.bytesToStr(tea.decryptBytes(Array.from(fileNameBuf), key));
                this.decryptFilePath = path.join(this.outPath, fileName);
                if (!fs.existsSync(this.decryptFilePath)) {
                    cryptFp = fs.openSync(this.decryptFilePath, 'w');
                } else {
                    throw new Error(util.format("Decrypt file [%s] exists already!", this.decryptFilePath));
                }
                let cryptLength = getEncryptLength(encrypt_block_size);
                let currentPos = this.filePos;
                while (true) {
                    let size = 0;
                    let buf = new Buffer(cryptLength);
                    if (this.fileLen < cryptLength) {
                        size = fs.readSync(this.fp, buf, 0, this.fileLen, currentPos);
                    } else {
                        size = fs.readSync(this.fp, buf, 0, cryptLength, currentPos);
                    }
                    if (size == 0) {
                        fs.closeSync(this.fp);
                        break;
                    }
                    this.fileLen -= size;
                    let decryptBytes = tea.decryptBytes(Array.from(buf.slice(0, size)), key);
                    fs.writeFileSync(cryptFp, new Buffer(decryptBytes), {encoding: 'binary', flag: 'a'});
                    currentPos += size;
                    let now = Date.now();
                    if (progressCallback && typeof progressCallback === 'function' && currentPos < this.fileSize && now - lastCallAt.getTime() >= this.progressCallInterval) {
                        let percent = Math.floor(currentPos * 100 / this.fileSize);
                        if (percent > 100) {
                            percent = 100;
                        }
                        progressCallback(percent, startAt);
                        lastCallAt = new Date();
                    }
                }
                fs.closeSync(cryptFp);
                if (progressCallback && typeof progressCallback === 'function') {
                    progressCallback(100, startAt);
                }
            } else {
                throw new Error("Password is empty!");
            }
        } else {
            throw new Error(util.format("This file [%s] is not a encrypt file!", this.inPath));
        }
    }
}

FileEncrypt.prototype.encryptAsync = async function(key, progressCallback, callback) {
    let err = null;
    let startAt = new Date();
    let lastCallAt = new Date();

    if (this.cryptFileName) {
        let fileNameHash = sha1(this.fileName);
        let timestamp = util.format("%d", Date.now());
        this.encryptFileName = sha1(util.format("%s%s%s", fileNameHash, this.fileSize, timestamp)) + this.fileType;
        this.encryptFilePath = path.join(this.outPath, this.encryptFileName);
    } else {
        let fileName = this.fileName.replace(/\.[^.]*$/, '') + this.fileType;
        this.encryptFilePath = path.join(this.outPath, fileName);
    }
    let cryptFp = null;
    if (!fs.existsSync(this.encryptFilePath)) {
        cryptFp = await fsOpen(this.encryptFilePath, 'w');
        if (this.fp && cryptFp) {
            if (key != '') {
                if (progressCallback && typeof progressCallback === 'function') {
                    progressCallback(0, startAt);
                }
                let headerFileName = tea.strToBytes(tea.encrypt(this.fileName, key));
                this.fileNamePos = 25;
                this.fileNameLen = headerFileName.length;
                this.filePos = this.fileNamePos + this.fileNameLen;
                await fsWriteFile(cryptFp, new Buffer(tea.strToBytes(this.fileHeader)), {encoding: 'binary', flag: 'a'});
                await fsWriteFile(cryptFp, new Buffer(intToBytes(this.fileNamePos)), {encoding: 'binary', flag: 'a'});
                await fsWriteFile(cryptFp, new Buffer(intToBytes(this.fileNameLen)), {encoding: 'binary', flag: 'a'});
                await fsWriteFile(cryptFp, new Buffer(intToBytes(this.filePos)), {encoding: 'binary', flag: 'a'});
                await fsWriteFile(cryptFp, new Buffer(longToBytes(this.fileLen)), {encoding: 'binary', flag: 'a'});
                await fsWriteFile(cryptFp, new Buffer(headerFileName), {encoding: 'binary', flag: 'a'});
                let currentPos = 0;
                while (true) {
                    let buf = new Buffer(encrypt_block_size);
                    let r = await fsRead(this.fp, buf, 0, encrypt_block_size, currentPos);
                    let size = r.bytesRead;
                    if (size == 0) {
                        await fsClose(this.fp);
                        break;
                    }
                    let cryptBuf = new Buffer(tea.encryptBytes(Array.from(buf.slice(0, size)), key));
                    this.fileLen += cryptBuf.length;
                    await fsWriteFile(cryptFp, cryptBuf, {encoding: 'binary', flag: 'a'});
                    currentPos += encrypt_block_size;
                    let now = Date.now();
                    if (progressCallback && typeof progressCallback === 'function' && currentPos < this.fileSize && now - lastCallAt.getTime() >= this.progressCallInterval) {
                        let percent = Math.floor(currentPos * 100 / this.fileSize);
                        if (percent > 100) {
                            percent = 100;
                        }
                        progressCallback(percent, startAt);
                        lastCallAt = new Date();
                    }
                }
                await fsWrite(cryptFp, new Buffer(longToBytes(this.fileLen)), 0, 8, 17);
                if (progressCallback && typeof progressCallback === 'function') {
                    progressCallback(100, startAt);
                }
            } else {
                err = new Error("Password is empty!");
            }
            await fsClose(cryptFp);
        }
    } else {
        err = new Error(util.format("Encrypt file [%s] exists already!", this.encryptFilePath));
    }
    if (callback) {
        callback(err);
    }
}

FileEncrypt.prototype.decryptAsync = async function(key, progressCallback, callback) { // progressCallback(percent, startAt)
    let err = null;
    let startAt = new Date();
    let lastCallAt = new Date();
    let cryptFp = null;
    if (this.fp) {
        let fileHeader = new Buffer(this.fileHeader.length);
        await fsRead(this.fp, fileHeader, 0, 5, 0);
        if (tea.bytesToStr(Array.from(fileHeader)) == this.fileHeader) {
            if (key != '') {
                if (progressCallback && typeof progressCallback === 'function') {
                    progressCallback(0, startAt);
                }
                let fileNamePosBuf = new Buffer(4);
                let fileNameLenBuf = new Buffer(4);
                let filePosBuf = new Buffer(4);
                let fileLenBuf = new Buffer(8);
                await fsRead(this.fp, fileNamePosBuf, 0, 4, 5);
                await fsRead(this.fp, fileNameLenBuf, 0, 4, 9);
                await fsRead(this.fp, filePosBuf, 0, 4, 13);
                await fsRead(this.fp, fileLenBuf, 0, 8, 17);
                this.fileNamePos = bytesToInt(Array.from(fileNamePosBuf));
                this.fileNameLen = bytesToInt(Array.from(fileNameLenBuf));
                this.filePos = bytesToInt(Array.from(filePosBuf));
                this.fileLen = bytesToLong(Array.from(fileLenBuf));
                let fileNameBuf = new Buffer(this.fileNameLen);
                await fsRead(this.fp, fileNameBuf, 0, this.fileNameLen, this.fileNamePos);
                let fileName = tea.bytesToStr(tea.decryptBytes(Array.from(fileNameBuf), key));
                this.decryptFilePath = path.join(this.outPath, fileName);
                if (!fs.existsSync(this.decryptFilePath)) {
                    cryptFp = await fsOpen(this.decryptFilePath, 'w');
                    let cryptLength = getEncryptLength(encrypt_block_size);
                    let currentPos = this.filePos;
                    while (true) {
                        let size = 0;
                        let buf = new Buffer(cryptLength);
                        if (this.fileLen < cryptLength) {
                            let r = await fsRead(this.fp, buf, 0, this.fileLen, currentPos);
                            size = r.bytesRead;
                        } else {
                            let r = await fsRead(this.fp, buf, 0, cryptLength, currentPos);
                            size = r.bytesRead;
                        }
                        if (size == 0) {
                            await fsClose(this.fp);
                            break;
                        }
                        this.fileLen -= size;
                        let decryptBytes = tea.decryptBytes(Array.from(buf.slice(0, size)), key);
                        await fsWriteFile(cryptFp, new Buffer(decryptBytes), {encoding: 'binary', flag: 'a'});
                        currentPos += size;
                        let now = Date.now();
                        if (progressCallback && typeof progressCallback === 'function' && currentPos < this.fileSize && now - lastCallAt.getTime() >= this.progressCallInterval) {
                            let percent = Math.floor(currentPos * 100 / this.fileSize);
                            if (percent > 100) {
                                percent = 100;
                            }
                            progressCallback(percent, startAt);
                            lastCallAt = new Date();
                        }
                    }
                    await fsClose(cryptFp);
                    if (progressCallback && typeof progressCallback === 'function') {
                        progressCallback(100, startAt);
                    }
                } else {
                    err = new Error(util.format("Decrypt file [%s] exists already!", this.decryptFilePath));
                }
                
            } else {
                err = new Error("Password is empty!");
            }
        } else {
            err = new Error(util.format("This file [%s] is not a encrypt file!", this.inPath));
        }
    }
    if (callback) {
        callback(err);
    }
}

FileEncrypt.prototype.info = function(key) {
    let result = {name: ''};
    if (this.fp) {
        let fileHeader = new Buffer(this.fileHeader.length);
        fs.readSync(this.fp, fileHeader, 0, 5);
        if (tea.bytesToStr(Array.from(fileHeader)) == this.fileHeader) {
            if (key != '') {
                let fileNamePosBuf = new Buffer(4);
                let fileNameLenBuf = new Buffer(4);
                let filePosBuf = new Buffer(4);
                let fileLenBuf = new Buffer(8);
                fs.readSync(this.fp, fileNamePosBuf, 0, 4);
                fs.readSync(this.fp, fileNameLenBuf, 0, 4);
                fs.readSync(this.fp, filePosBuf, 0, 4);
                fs.readSync(this.fp, fileLenBuf, 0, 8);
                this.fileNamePos = bytesToInt(Array.from(fileNamePosBuf));
                this.fileNameLen = bytesToInt(Array.from(fileNameLenBuf));
                this.filePos = bytesToInt(Array.from(filePosBuf));
                this.fileLen = bytesToLong(Array.from(fileLenBuf));
                let fileNameBuf = new Buffer(this.fileNameLen);
                fs.readSync(this.fp, fileNameBuf, 0, this.fileNameLen, this.fileNamePos);
                result.name = tea.bytesToStr(tea.decryptBytes(Array.from(fileNameBuf), key));
            } else {
                throw new Error("Password is empty!");
            }
        } else {
            throw new Error(util.format("This file [%s] is not a encrypt file!", this.inPath));
        }
    }
    fs.closeSync(this.fp);
    return result;
}

module.exports.FileEncrypt = FileEncrypt;
