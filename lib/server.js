const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(app.get('port'), () => {
  console.log('SMS Proxy App listening on port', app.get('port'));
});

require('dotenv').config();
const config = require(__dirname + '/../config');

const SmsProxy = require('./SmsProxy');
const smsProxy = new SmsProxy(config);

app.post('/inbound-sms', (req, res) => {
  let from = req.body.msisdn;
  let to = req.body.to;
  let text = req.body.text;

  console.log("Text from : " + from + "\nMessage : " + text);
  
  smsProxy.proxySms(from, to, text);
  
  res.sendStatus(200);
});

// Useful functions for testing out the functionality and querying bookings
app.post('/conversation', (req, res) => {
  let userANumber = req.body.userANumber;
  let userBNumber = req.body.userBNumber;
  
  smsProxy.createConversation(userANumber, userBNumber, (err, result) => {
    if(err) {
      res.status(500).json(err);
    }
    else {
      res.json(result);
    }
  });
  
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/provision', (req, res) => {
  smsProxy.provisionVirtualNumbers();
  
  res.sendStatus(200);
});

app.get('/configure-numbers', (req, res) => {
  smsProxy.reconfigureNumbers();
  
  res.sendStatus(200);
});

app.get('/provisioned', (req, res) => {
  res.json(smsProxy.provisionedNumbers);
});

app.get('/conversations', (req, res) => {
  res.json(smsProxy.conversations);
});
