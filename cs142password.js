'use strict';

/*
 * Return a salted and hashed password entry from a
 * clear text password.
 * @param {string} clearTextPassword
 * @return {object} passwordEntry
 * where passwordEntry is an object with two string
 * properties:
 *      salt - The salt used for the password.
 *      hash - The sha1 hash of the password and salt
 */
var crypto = require('crypto');

function makePasswordEntry(clearTextPassword) {
    //console.log("I am here I think inside the password entry digest maker thing");
    var salt = crypto.randomBytes(8).toString('hex');
    var hash = crypto.createHash('sha1');
    var password = clearTextPassword;
    var passwordEntry = {};
    password += salt;
    hash.update(password);
    passwordEntry.salt = salt;
    passwordEntry.hash = hash.digest('hex');
    //console.log("Jajajajajajajajajajaj I am somehow here but who knows man this is ggggggggggggggggggggggggggggggg");
    //console.log(hash);
    //console.log(passwordEntry.hash.length);
    //console.log(passwordEntry.salt.length);
    return passwordEntry; 
}




/*
 * Return true if the specified clear text password
 * and salt generates the specified hash.
 * @param {string} hash
 * @param {string} salt
 * @param {string} clearTextPassword
 * @return {boolean}
 */
function doesPasswordMatch(hash, salt, clearTextPassword) {
    var passwordToTest = clearTextPassword, hashToTest;
    passwordToTest += salt;
    hashToTest = crypto.createHash('sha1').update(passwordToTest).digest('hex');
    return hash === hashToTest;
}

exports.makePasswordEntry = makePasswordEntry;
exports.doesPasswordMatch = doesPasswordMatch;