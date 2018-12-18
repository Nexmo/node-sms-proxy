require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const SmsProxy = require('./SmsProxy');

const app = express();
app.set('port', (process.env.PORT || 3000));
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(app.get('port'), function () {
    console.log('SMS Proxy App listening on port', app.get('port'));
});

const smsProxy = new SmsProxy();

app.get('/', (req, res) => {
    res.send('Hello world');
})

// Handle and route incoming SMS to virtual numbers
app.post('/webhooks/inbound-sms', (req, res) => {
    const from = req.body.msisdn;
    const to = req.body.to;
    const text = req.body.text;

    // Route virtual number to real number
    smsProxy.proxySms(from, text);

    res.sendStatus(204);
});

// Start a chat
app.post('/chat', (req, res) => {
    const userANumber = req.body.userANumber;
    const userBNumber = req.body.userBNumber;

    smsProxy.createChat(userANumber, userBNumber, (err, result) => {
        if (err) {
            res.status(500).json(err);
        }
        else {
            res.json(result);
        }
    });

});

