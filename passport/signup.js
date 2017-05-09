var LocalStrategy   = require('passport-local').Strategy;
var bCrypt = require('bcrypt-nodejs');
var winston = require('winston');
//var awsutils = require('../utils/aws-helper.js');
const sendmail = require('sendmail')();

var config = require('../game/config.js')

module.exports = function(passport, collection, apiKeys){
    
	passport.use('signup', new LocalStrategy({
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) {

            findOrCreateUser = function(){
                // find a user in Mongo with provided username
                collection.findOne({$or: [{username: username},{email: req.params.email}]}, function(err, user) {
                    // In case of any error, return using the done method
                    if (err){
                        console.log('Error in SignUp: '+err);
                        return done(err);
                    }
                    // already exists
                    if (user) {

                        if (user.username == username) {
                            console.log('User already exists with username: ' + username);
                            return done(null, false, req.flash('message', 'User Already Exists'));
                        }
                        else {
                            console.log('A user with the supplied email address already exists');
                            return done(null, false, req.flash('message', 'Email Address Exists'));
                        }
                    } else {
                        // if there is no user with that email
                        // create the user
                        var newUser = {};

                        // set the user's local credentials
                        newUser.username = username;
                        newUser.password = createHash(password);
                        newUser.email = req.param('email');
                        newUser.firstName = req.param('firstName');
                        newUser.lastName = req.param('lastName');
                        newUser.active = false;
                        newUser.location = config.START_ROOM;
                        newUser.moves=0;

                        if (req.param('apiKey')) {
                            apiKeys.forEach(function(k) {
                                if (req.param('apiKey') == k._id && k.active == true) {
                                    newUser.active = true
                                }
                            })

                            if (newUser.active == false) {
                                winston.error('Invalid API key specified');
                                return done(null, false, req.flash('message', 'Invalid API key specified'));
                            }
                        }

                        // save the user
                        collection.insert(newUser, function(err, result) {
                            if (err){
                                console.log('Error in Saving user: '+err);  
                                throw err;  
                            }

                            // Don't require validation for authorized API sign-ups
                            if (newUser.active == true) {
                                return done(null, newUser);
                            }
                            else {
                                var validationURL = req.protocol + '://' + req.get('host') + '/' + newUser._id + '/validate/';
                                var verificationBody = '<p>To activate your account, please click <a href=\'' + validationURL + '\'>here</a></p>';

                                // AWS EMail integration
                               //awsutils.sendEmail(newUser.email, 'MDB World - Verification email', verificationBody, function (err, res) {
                               //    if (err) {
                               //         console.log(err);
                               //     }
                               //     return done(null, newUser);
                               // });
                               sendmail({
                                            from: 'wizzard@mongomud.com',
                                            to: newUser.email,
                                            subject: 'MongoMud User Verification',
                                            html: verificationBody,
                                             }, function(err, reply) {
                                                console.log(err && err.stack);
                                                 console.dir(reply);
                                            });

                            }
                        });
                    }
                });
            };
            // Delay the execution of findOrCreateUser and execute the method
            // in the next tick of the event loop
            process.nextTick(findOrCreateUser);
        })
    );

    // Generates hash using bCrypt
    var createHash = function(password){
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    }
}
