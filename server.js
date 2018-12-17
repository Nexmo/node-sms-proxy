const express = require('express');
const bodyParser = require('body-parser');
const SmsProxy = require('./SmsProxy');

const app = express();
app.set('port', (process.env.PORT || 3000));
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(app.get('port'), function () {
    console.log('SMS Proxy App listening on port', app.get('port'));
});

const config = require('dotenv').config();

const smsProxy = new SmsProxy(config.parsed);

app.get('/', (req, res) => {
    res.send('Hello world');
})

// Handle and route incoming SMS to virtual numbers
app.post('/webhooks/inbound-sms', (req, res) => {
    var from = req.body.msisdn;
    var to = req.body.to;
    var text = req.body.text;

    console.log(`from ${from} to ${to} - ${text}`)

    // Route virtual number to real number
    smsProxy.proxySms(from, to, text);

    res.sendStatus(200);
});

// Start a conversation
app.post('/conversation', (req, res) => {
    var userANumber = req.body.userANumber;
    var userBNumber = req.body.userBNumber;

    smsProxy.createConversation(userANumber, userBNumber, (err, result) => {
        if (err) {
            res.status(500).json(err);
        }
        else {
            res.json(result);
        }
    });

});

