
var aws = require('aws-sdk');

// load aws config
aws.config.loadFromPath('utils/aws-config.json');

var sendEmail = function(to, subject, body, cb) {
    // load AWS SES
    var ses = new aws.SES({apiVersion: '2010-12-01'});
    var from = 'mdbworld@10gen.com';

    ses.sendEmail({
        Source: from,
        Destination: {ToAddresses: [to]},
        Message: {
            Subject: {
                Data: subject
            },
            Body: {
                Html: {
                    Data: body
                }
            }
        }
    },
    function (err, data) {
        if (err) {
            cb(err)
        }
        console.log('Email sent:');
        cb();
    });
}

module.exports.sendEmail = sendEmail;