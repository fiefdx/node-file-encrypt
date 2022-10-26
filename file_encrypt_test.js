"use strict";

import fs from 'fs';

import { FileEncrypt } from './file_encrypt.js';


let filePath = '/home/breeze/Develop/fast2array.tar';
let outPath = '/home/breeze/Develop/';
let encryptPath = '';


{
    let f = new FileEncrypt(filePath);
    f.openSourceFile();
    f.encrypt('111111');
    encryptPath = f.encryptFilePath;
    console.log("encrypt sync done");
}

{
    let f = new FileEncrypt(filePath, outPath, '.myFile');
    f.openSourceFile();
    f.encrypt('111111');
    encryptPath = f.encryptFilePath;
    console.log("encrypt sync with custom ending done");
}

{
    let f = new FileEncrypt(filePath, outPath, '.myFile', false);
    f.openSourceFile();
    f.encrypt('111111');
    encryptPath = f.encryptFilePath;
    console.log("encrypt sync with custom ending and not encrypted fileName done");
}


{
    fs.unlink(filePath, function() {});
    let f = new FileEncrypt(encryptPath);
    f.openSourceFile();
    f.decrypt('111111');
    console.log("decrypt sync done");
}

{
    let f = new FileEncrypt(encryptPath);
    f.openSourceFile();
    console.log(f.info('111111'));
}

{
    let f = new FileEncrypt(filePath);
    f.openSourceFile();
    f.encryptAsync('111111').then(function() {
        encryptPath = f.encryptFilePath;
        console.log("encrypt async done");
        fs.unlink(filePath, function() {});
        let d = new FileEncrypt(encryptPath);
        d.openSourceFile();
        d.decryptAsync('111111').then(function() {
            console.log("decrypt async done");
        });
    });
}
