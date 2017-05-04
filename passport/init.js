var login = require('./login');
var signup = require('./signup');
var ObjectID = require('mongodb').ObjectID
var winston = require('winston');

var USER_COLLECTION = 'users';
var database;

module.exports = function(passport, db){

    database = db;
	// Passport needs to be able to serialize and deserialize users to support persistent login sessions
    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {

        var collection = database.collection(USER_COLLECTION);
        collection.findOne({_id: new ObjectID(id)}, function(err, user) {
            if (err) {
                winston.error('Error getting user. Error: ' + err);
                done(err);
            }
            else {
                done(null, user);
            }
        })
    });

    db.collection('apiKeys').find({active: true}).toArray(function(err, docs) {
        var apiKeys = docs;
        var collection = db.collection(USER_COLLECTION);

        // Setting up Passport Strategies for Login and SignUp/Registration
        login(passport, collection);
        signup(passport, collection, apiKeys);
    })
}
