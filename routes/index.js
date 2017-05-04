var express = require('express');
var messages = require('./messages');
var user = require('./user');
var router = express.Router();

var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport){

	router.get('/', function(req, res) {
		res.redirect('/login');
	})

	/* Handle Login POST */
	router.post('/login', passport.authenticate('login', {
		successRedirect: '/messages.html',
		failureRedirect: '/login',
		failureFlash : true  
	}));

	router.get('/login', function(req, res) {
		res.render('login', {error: req.flash('message')});
	});

	/* Handle Registration POST */
	router.post('/signup', passport.authenticate('signup', {
		successRedirect: '/postRegister.html',
		failureRedirect: '/register',
		failureFlash : true  
	}));

	router.get('/register', function(req, res) {
		res.render('register', {error: req.flash('message')});
	});

	/* Handle Logout */
	router.get('/signout', function(req, res) {
		req.logout();
		req.session.destroy(function (err) {
			res.redirect('/');
		});
	});

	router.route('/message/:id')
		.get(messages.getMessageById)
		.delete(messages.deleteMessage);

	router.route('/message')
		.get(messages.getMessages)
		.post(messages.postMessage);

	router.route('/:id/validate')
		.get(user.validate);

	router.route('/:id/reset')
		.get(user.renderResetPasswordForm)

	router.route('/resetPassword')
		.post(user.resetPassword)
	
	router.route('/forgottenPassword')
		.post(user.passwordResetRequest);

	router.route('/user/:id')
		.delete(user.removeUser);
	
	return router;
}





