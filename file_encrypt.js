/* - - - - - - - - - - - - - - - - file encrypt by fiefdx- - - - - - - - - - - - - - - - -  */

"use strict";

const path = require('path');
const fs = require('fs');
const util = require('util');

const tea = require('node-tea');
const sha1 = require('sha1');

let encrypt_block_size = 1024 * 8;

function getEncryptLength(length) {
    let fillN = (8 - (length + 2)) % 8 + 2;
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

function FileEncrypt(filePath) {
    this.filePath = filePath;
    this.fileName = path.basename(filePath);
    this.fileSize = 0;
    this.fileHeader = 'crypt';
    this.fileType = '.crypt';
    this.fileNamePos = 0;
    this.fileNameLen = 0;
    this.filePos = 0;
    this.fileLen = 0;
    this.encryptFileName = '';
    this.encryptFilePath = '';
    this.decryptFilePath = '';
    this.fp = null;
}

FileEncrypt.prototype.openSourceFile = function() {
    if (fs.existsSync(this.filePath) && fs.lstatSync(this.filePath).isFile()) {
        const stats = fs.statSync(this.filePath);
        this.fileSize = stats.size;
        this.fp = fs.openSync(this.filePath, 'r');
    } else {
        throw new Error(util.format("File [%s] doesn't exists!", this.filePath));
    }
}

FileEncrypt.prototype.encrypt = function(key) {
    let fileNameHash = sha1(this.fileName);
    let timestamp = util.format("%d", Date.now());
    this.encryptFileName = sha1(util.format("%s%s%s", fileNameHash, this.fileSize, timestamp)) + this.fileType;
    this.encryptFilePath = path.join(path.dirname(this.filePath), this.encryptFileName);
    let cryptFp = null;
    if (!fs.existsSync(this.encryptFilePath)) {
        cryptFp = fs.openSync(this.encryptFilePath, 'w');
    } else {
        throw new Error(util.format("Encrypt file [%s] exists already!", this.encryptFilePath));
    }
    if (this.fp && cryptFp) {
        if (key != '') {
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
            }
            fs.writeSync(cryptFp, new Buffer(longToBytes(this.fileLen)), 0, 8, 17);
        } else {
            throw new Error("Password is empty!");
        }

        fs.closeSync(cryptFp);
    }
}

FileEncrypt.prototype.decrypt = function(key) {
    let cryptFp = null;
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
                let fileName = tea.bytesToStr(tea.decryptBytes(Array.from(fileNameBuf), key));
                this.decryptFilePath = path.join(path.dirname(this.filePath), fileName);
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
                }
                fs.closeSync(cryptFp);
            } else {
                throw new Error("Password is empty!");
            }
        } else {
            throw new Error(util.format("This file [%s] is not a encrypt file!", this.filePath));
        }
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
            throw new Error(util.format("This file [%s] is not a encrypt file!", this.filePath));
        }
    }
    fs.closeSync(this.fp);
    return result;
}

module.exports.FileEncrypt = FileEncrypt;
