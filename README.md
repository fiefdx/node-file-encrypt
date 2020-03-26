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

   let filePath = '/home/breeze/Develop/fast2array.tar'; // source file path
   let encryptPath = '';
 
   {   // encrypt file
       // to FileEncrypt can be passed 4 Arguments
       // filePath     - the path of the file that should be encrypted
       // outPath      - this is optional  - the Path for the encrypted file
       // fileEnding   - this is optional  - a custom fileEnding like '.myFile', default is '.crypt'
       // cryptFileName - this is optional - boolean if the filename should be hashed, default is true
       let f = new encrypt.FileEncrypt(filePath);
       f.openSourceFile();
       f.encrypt('111111');
       encryptPath = f.encryptFilePath;
       console.log("encrypt sync done");
   }

   { // decrypt file
       fs.unlink(filePath, function() {});
       let f = new encrypt.FileEncrypt(encryptPath);
       f.openSourceFile();
       f.decrypt('111111');
       console.log("decrypt sync done");
   }

   { // get original file name from encrypted file
       let f = new encrypt.FileEncrypt(encryptPath);
       f.openSourceFile();
       console.log(f.info('111111'));
   }

   { // encrypt & decrypt file async
       let f = new encrypt.FileEncrypt(filePath);
       f.openSourceFile();
       f.encryptAsync('111111').then(function() {
           encryptPath = f.encryptFilePath;
           console.log("encrypt async done");
           fs.unlink(filePath, function() {});
           let d = new encrypt.FileEncrypt(encryptPath);
           d.openSourceFile();
           d.decryptAsync('111111').then(function() {
               console.log("decrypt async done");
           });
       });
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
