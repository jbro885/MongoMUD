var winston = require('winston');
var ObjectID = require('mongodb').ObjectID
var bCrypt = require('bcrypt-nodejs');
//var awsutils = require('../utils/aws-helper.js');
const sendmail = require('sendmail')();
var USER_COLLECTION = 'users';


var validateUser = function (req, res, next) {
    var db = req.database;
    var collection = db.collection(USER_COLLECTION);

    var userId = req.params.id;

    var oid;
    try {
        oid = new ObjectID(userId);
    }
    catch (e) {
        winston.error('Can\'t parse Object ID');
    }

    collection.update({_id: oid},{$set: {active: true}}, function(err, result) {
        if (err) {
            next(err);
        }
        else {
            res.redirect('/accountValidated.html');
        }
    });
};

var passwordResetRequest = function(req, res, next) {
    var userEmail = req.body.email;

    if (!userEmail) {
        var error = new Error('No email address specified in request body');
        next(error);
        return;
    }

    var db = req.database;
    var collection = db.collection(USER_COLLECTION);

    collection.find({email: userEmail}).toArray(function (err, doc) {
        if (err) {
            next(err);
            return;
        }

        var resetSuccess = false;

        if (doc && doc.length > 0) {
            resetSuccess = true;
            var resetEmailURL = req.protocol + '://' + req.get('host') + '/' + doc[0]._id + '/reset/';
            var resetEmailBody = '<p>To reset your password, please click <a href=\'' + resetEmailURL + '\'>here</a></p>';

/*            awsutils.sendEmail(doc[0].email, 'MDB World - Password Reset', resetEmailBody, function (err, res) {
                if (err) {
                    winston.error(err);
                    next(err);
                    return;
                }
            });
*/
               sendmail({
                                            from: 'wizzard@mongomud.com',
                                            to: doc[0].email,
                                            subject: 'MongoMud User - Password Reset',
                                            html: resetEmailBody,
                                             }, function(err, reply) {
                                                console.log(err && err.stack);
                                                 console.dir(reply);
                                            });

        }

        res.render('resetPasswordConfirm', {resetSuccess: resetSuccess});
    });

}

var renderResetPasswordForm = function(req, res, err) {
    res.render('resetPassword', {userId: req.params.id});
}

var resetPassword = function(req, res, next) {
    var db = req.database;
    var collection = db.collection(USER_COLLECTION);
    
    var newPassword = req.body.newPassword;
    var passwordVerify = req.body.verifyPassword;
    var userId = req.body.user;

    if (newPassword != passwordVerify) {
        var error = new Error('Password fields much match');
        next(error);
        return;
    }

    var oid;
    try {
        oid = new ObjectID(userId);
    }
    catch (e) {
        winston.error('Can\'t parse Object ID');
    }

    collection.update({_id: oid}, {$set: {password: createHash(newPassword)}}, function(err, result) {
        if (err) {
            winston.error('Error updating password');
            next(err);
        }
        else {
            winston.info('Password updated successfully for user Id: ' + userId);
            res.redirect('/resetSuccess.html');
        }
    })

}

var removeUser = function(req, res, next) {
    var db = req.database;
    var collection = db.collection(USER_COLLECTION);
    var userId = req.params.id;
    var apiKey = req.param('apiKey');

    db.collection('apiKeys').find({active: true}).toArray(function(err, docs) {
        var apiKeys = docs;
        var validKey = false;
        apiKeys.forEach(function(k) {
            if (apiKey == k._id && k.hosts.indexOf(req.host) > -1 && k.active == true) {
                validKey = true
                collection.remove({username: userId}, function(err, result) {
                    if (err) {
                        next(err);
                    }
                    else {
                        req.logout();
                        req.session.destroy(function (err) {
                            res.redirect('/');
                        });
                    }
                })
            }
        })

        if (validKey == false) {
            winston.error('Invalid API key specified');
            res.statusCode = 403;
            next(new Error('Invalid API key specified'));
        }
    })
}

// Generates hash using bCrypt
var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

module.exports.validate = validateUser;
module.exports.passwordResetRequest = passwordResetRequest;
module.exports.renderResetPasswordForm = renderResetPasswordForm;
module.exports.resetPassword = resetPassword;
module.exports.removeUser = removeUser;