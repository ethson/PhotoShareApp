"use strict";

/* jshint node: true */

/*
 * This builds on the webServer of previous projects in that it exports the current
 * directory via webserver listing on a hard code (see portno below) port. It also
 * establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 * This webServer exports the following URLs:
 * /              -  Returns a text status message.  Good for testing web server running.
 * /test          - (Same as /test/info)
 * /test/info     -  Returns the SchemaInfo object from the database (JSON format).  Good
 *                   for testing database connectivity.
 * /test/counts   -  Returns the population counts of the cs142 collections in the database.
 *                   Format is a JSON object with properties being the collection name and
 *                   the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the database.
 * /user/list     -  Returns an array containing all the User objects from the database.
 *                   (JSON format)
 * /user/:id      -  Returns the User object with the _id of id. (JSON format).
 * /photosOfUser/:id' - Returns an array with all the photos of the User (id). Each photo
 *                      should have all the Comments on the Photo (JSON format)
 *
 */

var mongoose = require('mongoose');
var async = require('async');

//Loads the express session files
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var fs = require("fs");
var crypto = require('crypto');
var cs142Pass = require('./cs142password');

//Set up password security with SHA-1 digest and salting
//var hash = crypto.createHash('sha1');


//Uses multer to create function uploadedphoto to use on post requests
var processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');

// Load the Mongoose schema for User, Photo, and SchemaInfo
var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');

var express = require('express');
var app = express();

// XXX - Your submission should work without this line
//var cs142models = require('./modelData/photoApp.js').cs142models;

mongoose.connect('mongodb://localhost/cs142project6');

// We have the express static module (http://expressjs.com/en/starter/static-files.html) do all
// the work for us.
app.use(express.static(__dirname));

//Uses the Express session middleware
app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false/*, cookie: {secure: false}*/}));
app.use(bodyParser.json());


app.get('/', function (request, response) {
    response.send('Simple web server of files from ' + __dirname);
});

/*
 * Use express to handle argument passing in the URL.  This .get will cause express
 * To accept URLs with /test/<something> and return the something in request.params.p1
 * If implement the get as follows:
 * /test or /test/info - Return the SchemaInfo object of the database in JSON format. This
 *                       is good for testing connectivity with  MongoDB.
 * /test/counts - Return an object with the counts of the different collections in JSON format
 */
app.get('/test/:p1', function (request, response) {
    // Express parses the ":p1" from the URL and returns it in the request.params objects.
    //console.log('/test called with param1 = ', request.params.p1);

    var param = request.params.p1 || 'info';

    if (param === 'info') {
        // Fetch the SchemaInfo. There should only one of them. The query of {} will match it.
        SchemaInfo.find({}, function (err, info) {
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/info error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (info.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing SchemaInfo');
                return;
            }

            // We got the object - return it in JSON format.
            //console.log('SchemaInfo', info[0]);
            response.end(JSON.stringify(info[0]));
        });
    } else if (param === 'counts') {
        // In order to return the counts of all the collections we need to do an async
        // call to each collections. That is tricky to do so we use the async package
        // do the work.  We put the collections into array and use async.each to
        // do each .count() query.
        var collections = [
            {name: 'user', collection: User},
            {name: 'photo', collection: Photo},
            {name: 'schemaInfo', collection: SchemaInfo}
        ];
        async.each(collections, function (col, done_callback) {
            col.collection.count({}, function (err, count) {
                col.count = count;
                done_callback(err);
            });
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            } else {
                var obj = {};
                for (var i = 0; i < collections.length; i++) {
                    obj[collections[i].name] = collections[i].count;
                }
                response.end(JSON.stringify(obj));

            }
        });
    } else {
        // If we know understand the parameter we return a (Bad Parameter) (400) status.
        response.status(400).send('Bad param ' + param);
    }
});

app.get('/basic/userList', function(request, response) {
    User.find({}, '_id first_name last_name', function(err, users) {
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/list error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (users.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing User Info');
                return;
            }

            // We got the object - return it in JSON format.
            //userListResponse = JSON.parse(JSON.stringify(users));
            var userList = JSON.parse(JSON.stringify(users));
            for(var i = 0; i < userList.length; i++) {
                if(request.session.user_id === userList[i]._id) {
                    userList[i].current = true;
                }
            }
            response.end(JSON.stringify(userList));
    });
});

/*
 * URL /user/list - Return all the User object.
 */
app.get('/user/list', function (request, response) {
    var sess = request.session;
    if(!sess.user_id) {
        //response.redirect("/login-register");
        response.status(401).send('User is not logged in');
        return;
    }
    var userListResponse, user_comment_array,
         i, tempStr, tempVal;

    var callback = function(userList) {
        var lookup = {};
        for (var i = 0; i < userList.length; i++) {
            lookup[userList[i]._id] = userList[i];
            userList[i].commentsAuthored = 0;
        }
        async.each(userList, function(user, doneCallback) {
            Photo.find({user_id: user._id},  function(photoErr, photoSet) {
                user.photosPosted = photoSet.length;
                
                async.each(photoSet, function(photo, doneCallback2) {
                    async.each(photo.comments, function(comment, doneCallback3) {
                        lookup[comment.user_id].commentsAuthored++;
                        doneCallback3();

                    }, function(err2){
                        doneCallback2();
                    });
                    
                }, function(err){
                    doneCallback();
                });
            });
        }, function(err) {
            response.end(JSON.stringify(userListResponse));
        });
    };
    User.find({}, '_id first_name last_name', function(err, users) {
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/list error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (users.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing User Info');
                return;
            }

            // We got the object - return it in JSON format.
            userListResponse = JSON.parse(JSON.stringify(users));
            callback(userListResponse);
    });
});


/*
 * URL /user/:id - Return the information for User (id)
 */
app.get('/user/:id', function (request, response) {
    if(!request.session.user_id) {
        response.status(401).send('User is not logged in');
        return;
    }
    var id = request.params.id;
    User.findOne({_id:id}, '_id first_name last_name occupation location description', function(err, user) {
            if (user === null) {
                response.status(400).send('Not found');
                return;
            }
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/'+ id + ' error:', err);
                response.status(400).send(JSON.stringify(err));
                return;
            }
            if (user.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing User Info');
                return;
            }

            // We got the object - return it in JSON format.
            //response.end(JSON.stringify(user));
            var userToSend = JSON.parse(JSON.stringify(user));
            
            var getMentions = function(user) {
                Photo.find({}, function(err, photos) {
                 var i, j, mentions;
                   if(photos.length !==0) {
                       userToSend.photoMentions = [];
                       for(i =0; i < photos.length; i++){
                           if(photos[i].allowedUsers.length !== 0 && photos[i].allowedUsers.indexOf(request.session.first_name) < 0){
                               continue;
                           }
                           mentions = photos[i].mentions;
                           for(j = 0; j < mentions.length; j++) {
                               if(mentions[j] === userToSend._id && userToSend.photoMentions.indexOf(photos[i]) < 0) {
                                   userToSend.photoMentions.push(photos[i]);
                               }
                           }
                       }
                       
                   } 
                   response.end(JSON.stringify(userToSend));
                });
            };
        
            Photo.find({user_id:id}, function(err, photo) {
                var i, mostRecentPhoto = null, mostPopularPhoto = null;
                if(photo.length !== 0){
                    //if(photo[0].allowedUsers.length === 0 || photo[0].allowedUsers.indexOf(request.session.first_name) > -1){
                      //  mostRecentPhoto = photo[0];
                      //  mostPopularPhoto = photo[0];
                    //}
                    for(i = 0; i < photo.length; i++) {
                        if(mostPopularPhoto === null || photo[i].comments.length > mostPopularPhoto.comments.length) {
                            if(photo[i].allowedUsers.length === 0 || photo[i].allowedUsers.indexOf(request.session.first_name) > -1){
                                mostPopularPhoto = photo[i];
                            //} else if(photo[i].allowedUsers.indexOf(request.session.first_name) > -1) {
                              //  mostPopularPhoto = photo[i];
                            }
                        }
                        if(mostRecentPhoto === null || photo[i].date_time > mostRecentPhoto.date_time) {
                            if(photo[i].allowedUsers.length === 0 || photo[i].allowedUsers.indexOf(request.session.first_name) > -1){
                                mostRecentPhoto = photo[i];
                            }
                        }
                    }
                    userToSend.mostRecentPhoto = mostRecentPhoto;
                    userToSend.mostPopularPhoto = mostPopularPhoto;
                    //response.end(JSON.stringify(userToSend));
                } else {
                    userToSend.mostRecentPhoto = null;
                    userToSend.mostPopularPhoto = null;
                    //response.end(JSON.stringify(userToSend));
                }
                getMentions(userToSend);
            });
    });
});

/*
 * URL /photosOfUser/:id - Return the Photos for User (id)
 */
app.get('/photosOfUser/:id', function (request, response) {
    if(!request.session.user_id) {
        response.status(401).send('User is not logged in');
        return;
    }
    var id = request.params.id, /*photosFile,*/ userInfo, i, temp ={};
    
    Photo.find({user_id:id}, '_id date_time file_name comments user_id allowedUsers', function(err, photo) {
        
            if (photo === null) {
                console.log('Photo with _id:' + id + ' not found.');
                response.status(400).send('Missing Photo Info');
                return;
            }
        
            if (err) {
                console.error('Doing /photo/'+ id + ' error:', err);
                response.status(400).send(JSON.stringify(err));
                return;
            }
            if (photo.length === 0) {
                response.status(400).send('Not found');
                return;
            }

            // We got the object - return it in JSON format.
            var photosFile = JSON.parse(JSON.stringify(photo));        //made copy that you can change
        
            var finalCallback = function (photosToInspect) {
                //console.log(photosToInspect);
                var photosToSend = [];
                for(var i = 0; i < photosToInspect.length; i++) {
                    //console.log(photosToInspect[i]);
                    //console.log("jajajajaj the above was a singular photo");
                    if(photosToInspect[i].allowedUsers.length === 0) {
                        photosToSend.push(photosToInspect[i]);
                    } else {
                        if(photosToInspect[i].allowedUsers.indexOf(request.session.first_name) > -1 ) {
                            photosToSend.push(photosToInspect[i]);
                        }
                    }
                    delete photosToInspect[i].allowedUsers;
                }
                response.end(JSON.stringify(photosToSend));
            };
        
            async.each(photosFile, function(photoObj, doneCallback) {
                photoObj.favorite = request.session.favorites[photoObj._id];
                async.each(photoObj.comments, function(comment, callback) {
                    var commentUserID = comment.user_id;//, commentLink = comment;
                    delete comment.user_id;
                    User.findOne({_id:commentUserID}, '_id first_name last_name', function(err, users) {
                        comment.user = users;
                        comment.user.first_name = users.first_name;
                        comment.user.last_name = users.last_name;
                        callback(err);
                    });
                }, function(err) {
                    doneCallback(err);
                });
            }, function(err) {
                finalCallback(photosFile);
                //response.end(JSON.stringify(photosFile));
            });
    });
});

app.get('/comments/:id', function (request, response) {
    var id = "" + request.params.id, userInfo, i, commentsAndPhotos = {}, temp ={};
    commentsAndPhotos.comments = [];
    Photo.find({}, function(err, photos) {
        var i, j, commentsSize, commentPhotoObj;
        for(i = 0; i < photos.length; i++) {
            commentsSize = photos[i].comments.length;
            if(commentsSize !== undefined){
                for(j = 0; j < commentsSize; j++) {
                    var temp = "" + photos[i].comments[j].user_id;
                    if(temp === id) {
                        commentPhotoObj = {};
                        commentPhotoObj.comment = photos[i].comments[j];
                        commentPhotoObj.photo = photos[i];
                        commentsAndPhotos.comments.push(commentPhotoObj);
                    }
                }
            }
        }
        response.end(JSON.stringify(commentsAndPhotos));
    });
});


app.post('/admin/login', function(request, response) {
    var login = request.body.login_name, sess = request.session,
        password = request.body.password;

    User.findOne({login_name: login}, '_id login_name first_name password_digest salt favorites', function(err, user) {
            var i;
            if (err) {
                console.error('Doing /user/'+ login + ' error:', err);
                response.status(400).send(JSON.stringify(err));
                return;
            }
            if (user === null) {
                console.log('User not found.');
                response.status(400).send('Not found');
                return;
            }
            if (user.length === 0) {
                response.status(500).send('Missing User Info');
                return;
            }
               
            //console.log(user)
            if(!cs142Pass.doesPasswordMatch(user.password_digest, user.salt, request.body.password)) {
                response.status(400).send();
                return;
            }
            delete user.password_digest;
            delete user.salt;
            // We got the object - return it in JSON format.
            sess.login_name = login;
            sess.first_name = user.first_name;
            sess.user_id = user._id;
            sess.favorites = {};
        
            for(i = 0; i < user.favorites.length; i++){
                sess.favorites[user.favorites[i]] = user.favorites[i];
            }
            delete user.favorites;
            response.status(200).send(JSON.stringify(user));
    });
});

app.post('/admin/logout', function(request, response) {
    if(!request.session.user_id) {
        response.status(400).send("No one is logged in");
        return;
    }
    if(request.body.logUser === undefined) {
        delete request.session.user_id;
        delete request.session.login_name;
        request.session.destroy();
        response.status(200).send("Logged out");
    } else {
        //console.log(request.body.logUser);
        response.status(400).send("No one is logged in");
        return;
    }
});

app.post('/commentsOfPhoto/:photo_id', function(request, response) {
    if(request.body.comment === undefined || request.body.comment === ''){
        response.status(400).send();
        return;
    }
    
    var photoId = request.params.photo_id;
    var comment = {};
    var sess = request.session;
    if(!sess.user_id) {
        response.redirect("/login-register");
        return;
    }
    comment.comment = request.body.comment;
    comment.user_id = sess.user_id;
    comment.mentions = request.body.mentions;
    Photo.findOne({_id: photoId}, function(err, photo) {
        if (photo === null) {
            response.status(400).send('Not found');
            return;
        }
        if (err) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        var photoToChange = JSON.parse(JSON.stringify(photo));
        photo.comments.push(comment);
        photo.mentions = photo.mentions.concat(request.body.mentions);
        photo.save();
        
        response.status(200).send(JSON.stringify(photo));
    });
    
});


app.post('/photos/new', function(request, response) {
    var sess = request.session;
    //console.log(request.file);
    if(!sess.user_id) {
        //response.redirect("/login-register");
        response.status(401).send("User is not logged in");
        return;
    }
    
    processFormBody(request, response, function (err) {
        if (err || !request.file) {
            // XXX -  Insert error handling code here.
            return;
        }
        // request.file has the following properties of interest
        //      fieldname      - Should be 'uploadedphoto' since that is what we sent
        //      originalname:  - The name of the file the user uploaded
        //      mimetype:      - The mimetype of the image (e.g. 'image/jpeg',  'image/png')
        //      buffer:        - A node Buffer containing the contents of the file
        //      size:          - The size of the file in bytes

        // XXX - Do some validation here.
        
        if(request.file.mimetype !== 'image/jpeg' && request.file.mimetype !== 'image/png' && request.file.mimetype !== 'image/jpg') {
            response.status(400).send();
            return;
        }
        
        var userString = request.body.selectedUsers.trim();
        var arrayOfUsers;
        if(userString.length === 0) {
            arrayOfUsers = [];
        } else {
            arrayOfUsers = userString.split(',');
        }
        
        // We need to create the file in the directory "images" under an unique name. We make
        // the original file name unique by adding a unique prefix with a timestamp.
        var timestamp = new Date().valueOf();
        var filename = 'U' +  String(timestamp) + request.file.originalname;

        fs.writeFile("./images/" + filename, request.file.buffer, function (err) {
          // XXX - Once you have the file written into your images directory under the name
          // filename you can create the Photo object in the database
          //var Photo = mongoose.model('Photo', photoSchema);
            
          Photo.create({file_name: filename, date_time: timestamp, user_id: sess.user_id, allowedUsers: arrayOfUsers, comments: []}, function(err, newPhoto) {
              response.status(200).send(newPhoto);
          });
        });
    }); 
});

app.post("/user", function(request, response) {
    var userToRegister = request.body;
    //var sess = request.session;
    //console.log(request.body);
    //var userExists = false;
    var passwordEntry = cs142Pass.makePasswordEntry(userToRegister.password);
    
    
    User.findOne({login_name: userToRegister.login_name}, '_id login_name first_name password', function(err, user) {
            if (user !== null) {
                console.log('User not found.');
                //userExists = true;
                response.status(400).send('User already exists');
                return;
            } else {
                User.create({login_name: userToRegister.login_name, password_digest: passwordEntry.hash, salt: passwordEntry.salt, 
                             first_name: userToRegister.first_name, last_name: userToRegister.last_name, 
                             location: userToRegister.location, description: userToRegister.description, occupation: userToRegister.occupation}, 
                             function(err, newUser) {
                    response.status(200).send(JSON.stringify(newUser));
                });
            }
    });
});

app.post('/user/status', function (request, response) {
    var status = {};
    if(!request.session.user_id) {
        status.data = false;
        response.status(200).send(status);
    } else {
        status.data= true;
        status.name = request.session.first_name;
        status.id = request.session.user_id;
        response.status(200).send(status);
    }
});

app.post('/toggleFavorite', function(request, response) {
    var sess = request.session, i;
    
    User.findOne({_id: sess.user_id}, function(err, user){
        var index;
        if(err || user === null){
            response.status(400).send();
        }

        if(sess.favorites[request.body.id] === undefined) {
            sess.favorites[request.body.id] = request.body.id;
            user.favorites.push(request.body.id);
        } else {
            delete sess.favorites[request.body.id];
            index = user.favorites.indexOf(request.body.id);
            if(index > -1 ){
                user.favorites.splice(index, 1);
            }
        }
        user.save();
        response.status(200).send();        
        
    });
});

app.get('/getFavorites', function(request, response) {
    var sess = request.session;
    User.findOne({_id: sess.user_id}, function(err, user){
        var favoritesList;
        if(err || user === null){
            response.status(400).send();
        }
        favoritesList = user.favorites;
        Photo.find({_id: {$in: favoritesList}}, '_id date_time file_name', function(err, photos) {
            var photosForModal = [], i, modalObj;
            if(photos.length === 0){
                response.status(200).send(null);
                return;
            }
            
            for(i = 0; i < photos.length; i++) {
                modalObj = {};
                modalObj.url = 'images/' + photos[i].file_name;
                modalObj.thumbUrl = 'images/' + photos[i].file_name;
                modalObj.caption = photos[i].date_time;
                modalObj.favorited = true;
                modalObj.id = photos[i]._id;
                photosForModal.push(modalObj);
            }
            response.status(200).send(JSON.stringify(photosForModal));
        });
        //response.status(200).send();        
    });
    
});

app.post('/deletePhotoComment', function(request, response) {
    var sess = request.session;
    var photoToDelete = request.body.photo, commentToDelete = request.body.comment;
    
    var arrayDiff = function(mainArray, diffArray) {
        var i, j;
        for(i = 0; i < diffArray.length; i++) {
            for(j = 0; j < mainArray.length; j++) {
                if(diffArray[i] === mainArray[j]) {
                    mainArray.splice(j, 1);
                    break;
                }
            }
        }
        return mainArray;
    };
    
    if(commentToDelete !== null) {             //delete the comment from this photo
        Photo.findOne({_id:photoToDelete._id}, function(err, photo){

            var indexToDelete;
            for(var i = 0; i < photo.comments.length; i++) {

                var stringToCompare = JSON.stringify(photo.comments[i]._id);
                stringToCompare = stringToCompare.replace(/(")/g, "");

                if(stringToCompare === commentToDelete._id){
                    indexToDelete = i;
                }
            }
            photo.mentions = arrayDiff(photo.mentions, photo.comments[indexToDelete].mentions);
            photo.comments.splice(indexToDelete, 1);
            photo.save();
            response.status(200).send("Comment deleted");
        });
    } else {                                        //delete the photo, since no comments

        Photo.remove({_id:photoToDelete._id}, function (err) {
            if(err) {
                response.status(400).send("Not found");
            } else {
                response.status(200).send("Photo deleted");
            }
        });
    }
});

app.post('/deleteUser', function(request, response) {
    var sess= request.session;
    var userToDelete = request.body.user, loggedUser = sess.user_id;
    
    if(userToDelete.id !== loggedUser){
        //This should never happen anyway
        console.error("Wrong user is logged");
        response.status(400).send("Could not delete user, wrong permissions");
        return;
    }
    
    var arrayDiff = function(mainArray, diffArray) {
        var i, j;
        for(i = 0; i < diffArray.length; i++) {
            for(j = 0; j < mainArray.length; j++) {
                if(diffArray[i] === mainArray[j]) {
                    mainArray.splice(j, 1);
                    break;
                }
            }
        }
        return mainArray;
    };
    
    Photo.find({}, function(err, photos) {
        var tempString;
        for(var i = 0; i < photos.length; i++){
            for(var j = 0; j<photos[i].comments.length; j++) {
                tempString = JSON.stringify(photos[i].comments[j].user_id);
                tempString = tempString.replace(/(")/g, "");
                if(tempString === loggedUser) {
                    photos[i].mentions = arrayDiff(photos[i].mentions, photos[i].comments[j].mentions);
                    
                    if(j === photos[i].comments.length - 1){
                        photos[i].comments.splice(j, 1);
                    } else {
                        photos[i].comments.splice(j, 1);
                        j--;
                    }
                }
            }
            photos[i].save();
        }
        Photo.remove({user_id: loggedUser}, function(err) {
                if(err) {
                    response.status(400).send();
                }
                User.remove({_id:loggedUser}, function(err) {
                    if(err) {
                        response.status(400).send();
                    }
                    response.status(200).send("The damage is done");
                });
        });
    });
    
});

var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});
