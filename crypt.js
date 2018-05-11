#!/usr/bin/env node

const util = require('util');

const logUpdate = require('log-update');
const duration = require('duration');
const argv = require('minimist')(process.argv.slice(2));
const fileEncrypt = require('./file_encrypt.js').FileEncrypt;

let defaults = {
    p: '', // password
    i: '', // input file path
    o: '', // output file path
    e: false, // encrypt
    d: false, // decrypt
    l: false // list original file name
};
let options = {};
const frames = ['-', '\\', '|', '/'];
let frameN = 0;


function help() {
    console.log(util.format(
        `Usage: crypt [OPTION]...

    Options:
    -e   : encrypt input file
    -d   : decrypt input file
    -l   : list original file name
    -p   : password
    -i   : input file path (include file name)
    -o   : output file path (exclude file name), if not specified, then it is input file's base path (exclude file name) 
    -h   : get this help
`));
}

async function main() {

    // parse options
    for (let k in defaults) {
        options[k] = argv[k] || defaults[k];
    }
    options.p = '' + options.p;

    try {
        if (options.h) {
            help();
        } else if (options.l && options.p != '' && options.i != '') { // list original file name
            let f = new fileEncrypt(options.i, options.o);
            f.openSourceFile();
            let name = f.info(options.p).name || ''
            console.log(name);
        } else if (options.e && options.p != '' && options.i != '') { // encrypt file
            let f = new fileEncrypt(options.i, options.o);
            f.openSourceFile();
            await f.encryptAsync(options.p, function(percent, startAt) {
                const frame = frames[frameN = ++frameN % frames.length];
                const useTime = duration(startAt, new Date()).toString(1);
                const message = `${frame} encrypt: ${percent}% - ${useTime}`;
                logUpdate(message);
            }, function(err) {
                if (err) console.log("err: " + err);
                else console.log(f.encryptFilePath);
            });
        } else if (options.d && options.p != '' && options.i != '') { // decrypt file
            let f = new fileEncrypt(options.i, options.o);
            f.openSourceFile();
            await f.decryptAsync(options.p, function(percent, startAt){
                const frame = frames[frameN = ++frameN % frames.length];
                const useTime = duration(startAt, new Date()).toString(1);
                const message = `${frame} decrypt: ${percent}% - ${useTime}`;
                logUpdate(message);
            }, function(err) {
                if (err) console.log("err: " + err);
                console.log(f.decryptFilePath);
            });
        } else {
            help();
        }
    } catch (e) {
        console.log(e.message);
    }
        
    process.exit(0);
}

main();
