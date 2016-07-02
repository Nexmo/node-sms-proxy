require('dotenv').config();

var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.urlencoded({ extended: false }));

var TaxiSmsProxy = require('./TaxiSmsProxy');
var taxiSmsProxy = new TaxiSmsProxy();

app.post('/booking', function(req, res) {
  var passengerRealNumber = req.body.passengerNumber;
  var driverRealNumber = req.body.driverNumber;
  var bookingDetails = req.body.bookingDetails;
  
  taxiSmsProxy.makeBooking(passengerRealNumber, driverRealNumber, bookingDetails);
  
  res.sendStatus(200);
});

app.post('/inbound-sms', function(req, res) {
  var from = req.body.msisdn;
  var to = req.body.to;
  var text = req.body.text;
  
  taxiSmsProxy.proxySms(from, to, text);
  
  res.sendStatus(200);
});

// Useful functions for testing out the functionality and querying bookings
app.get('/', function(req, res) {
  res.send('Hello World!');
});

app.get('/provision', function(req, res) {
  taxiSmsProxy.provisionLVNs();
  
  res.sendStatus(200);
});

app.get('/provisioned', function(req, res) {
  res.json(taxiSmsProxy.provisionedNumbers);
});

app.get('/bookings', function(req, res) {
  res.json(taxiSmsProxy.bookings);
});

app.listen(app.get('port'), function() {
  console.log('Taxi SMS Proxy App listening on port', app.get('port'));
});
