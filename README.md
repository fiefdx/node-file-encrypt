# node-file-encrypt

A file encrypt & decrypt package based on TEA

# get & use

1. get it
   
   ```bash
   git clone git@github.com:fiefdx/node-file-encrypt.git

   or

   npm install node-file-encrypt
   
   ```
2. use it
   
   ```javascript
   const fs = require('fs');

   const encrypt = require('node-file-encrypt');

   let filePath = '/home/breeze/Develop/callingwiewer_error.log'; // source file path
   let encryptPath = '';

   {
       let f = new encrypt.FileEncrypt(filePath); // encrypt file
       f.openSourceFile();
       f.encrypt('111111');
       encryptPath = f.encryptFilePath;
   }

   {
       fs.unlink(filePath);
       let f = new encrypt.FileEncrypt(encryptPath); // decrypt file
       f.openSourceFile();
       f.decrypt('111111');
   }

   {
       let f = new encrypt.FileEncrypt(encryptPath); // get original file name from encrypted file
       f.openSourceFile();
       console.log(f.info('111111'));
   }
   ```

   ```bash
   $ sudo npm install -g node-file-encrypt
   $ crypt -h
   Usage: crypt [OPTION]...

    Options:
    -e : encrypt input file
    -d : decrypt input file
    -p : password
    -i : input file path (include file name)
    -o : output file path (exclude file name)
    -h : get this help
   ```