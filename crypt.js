#!/usr/bin/env node

const util = require('util');

const argv = require('minimist')(process.argv.slice(2));
const fileEncrypt = require('./file_encrypt.js').FileEncrypt;

let defaults = {
    b: 8, // encrypt block size
    p: '', // password
    i: '', // input file path
    o: '', // output file path
    e: false, // encrypt
    d: false, // decrypt
    l: false // list original file name
};
let options = {};


function help() {
    console.log(util.format(
        `Usage: crypt [OPTION]...

    Options:
    -e   : encrypt input file
    -d   : decrypt input file
    -l   : list original file name
    -b   : encrypt block size, defaults 8k (-b=8)
    -p   : password
    -i   : input file path (include file name)
    -o   : output file path (exclude file name), if not specified, then it is input file's base path (exclude file name) 
    -h   : get this help
`));
}

function main() {
    // parse options
    for (let k in defaults) {
        options[k] = argv[k] || defaults[k];
    }
    options.p = '' + options.p;

    try {
        if (options.h) {
            help();
        } else if (options.l && options.p != '' && options.i != '' && options.b > 0) { // list original file name
            let f = new fileEncrypt(options.i, options.o);
            f.openSourceFile();
            let name = f.info(options.p).name || ''
            console.log(name);
        } else if (options.e && options.p != '' && options.i != '' && options.b > 0) { // encrypt file
            let f = new fileEncrypt(options.i, options.o);
            f.openSourceFile();
            f.encrypt(options.p);
        } else if (options.d && options.p != '' && options.i != '' && options.b > 0) { // decrypt file
            let f = new fileEncrypt(options.i, options.o);
            f.openSourceFile();
            f.decrypt(options.p);
        } else {
            help();
        }
    } catch (e) {
        console.log(e.message);
    }
        
    process.exit(0);
}

main();
