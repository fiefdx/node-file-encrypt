"use strict";

const fs = require('fs');

const encrypt = require('./file_encrypt.js');

let filePath = '/home/breeze/Develop/callingwiewer_error.log';
let encryptPath = '';

{
    let f = new encrypt.FileEncrypt(filePath);
    f.openSourceFile();
    f.encrypt('111111');
    encryptPath = f.encryptFilePath;
}

{
    fs.unlink(filePath);
    let f = new encrypt.FileEncrypt(encryptPath);
    f.openSourceFile();
    f.decrypt('111111');
}

{
    let f = new encrypt.FileEncrypt(encryptPath);
    f.openSourceFile();
    console.log(f.info('111111'));
}
