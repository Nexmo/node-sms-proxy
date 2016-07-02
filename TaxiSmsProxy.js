var NEXMO_API_KEY = process.env.NEXMO_API_KEY;
var NEXMO_API_SECRET = process.env.NEXMO_API_SECRET;
var NEXMO_DEBUG = process.env.NEXMO_DEBUG;
var SMS_WEBHOOK_URL = process.env.SMS_WEBHOOK_URL;

var Nexmo = require('nexmo');
var nexmo = new Nexmo({apiKey: NEXMO_API_KEY, apiSecret: NEXMO_API_SECRET}, {debug: NEXMO_DEBUG});

var TaxiSmsProxy = function() {
  // LVNs to be assigned to passenger and driver
  this.provisionedNumbers = ['447520615084', '447520619555'];
  
  // In progress bookings
  this.bookings = [];
};

TaxiSmsProxy.prototype.provisionLVNs = function() {
  // Buy a UK number with only SMS.
  // You could extend this to also support VOICE.
  nexmo.number.search('GB', {features: 'SMS'}, function(err, res) {
    if(err) {
      console.error(err)
    }
    else {
      var numbers = res.numbers;
      
      // For demo purposes:
      // - Assume that at least two numbers will be available
      // - Buy just two virtual numbers: one for the passenger and one for the driver.
      this.buyNumber(numbers[0]);
      this.buyNumber(numbers[1]);
    }
  }.bind(this));
};

TaxiSmsProxy.prototype.buyNumber = function(number) {
  nexmo.number.buy(number.country, number.msisdn, function(err, res) {
    if(err) {
      console.error(err)
    }
    else {
      this.configureNumber(number);
    }
  }.bind(this));
};

TaxiSmsProxy.prototype.configureNumber = function(number) {
  nexmo.number.update(number.country, number.msisdn, {moHttpUrl: SMS_WEBHOOK_URL}, function(err, res) {
    if(err) {
      console.error(err)
    }
    else {
      this.provisionedNumbers.push(number.msisdn);
    }
  }.bind(this));
};

TaxiSmsProxy.prototype.makeBooking = function(passengerRealNumber, driverRealNumber) {
  // Create booking object
  // For demo purposes:
  // - Use first indexed LVN for passenger
  // - Use second indexed LVN for driver
  var booking = {
      passenger: {
        realNumber: passengerRealNumber,
        lvn: this.provisionedNumbers[0],
        name: 'Passenger'
      },
      driver: {
        realNumber: driverRealNumber,
        lvn: this.provisionedNumbers[1],
        name: 'Driver'
      },
      messages: []
  };
  
  this.bookings.push(booking);
};

var fromPassengerToDriver = function(from, to, booking) {
  console.log('fromPassengerToDriver',
    from, '===', booking.passenger.realNumber,
    to, '===', booking.driver.lvn
  );
  return (from === booking.passenger.realNumber &&
          to == booking.driver.lvn);
};
var fromDriverToPassenger = function(from, to, booking) {
  console.log('fromDriverToPassenger',
    from, '===', booking.driver.realNumber,
    to, '===', booking.passenger.lvn
  );
  return (from === booking.driver.realNumber &&
          to === booking.passenger.lvn);
};

TaxiSmsProxy.prototype.getProxyRoute = function(from, to) {  
  var proxyRoute = null;
  var booking;
  for(var i = 0, l = this.bookings.length; i < l; ++i) {
    booking = this.bookings[i];
    
    // Use to and from to determine the booking
    var toDriver = fromPassengerToDriver(from, to, booking);
    var toPassenger = fromDriverToPassenger(from, to, booking);
    
    if(toDriver || toPassenger) {
      proxyRoute = {
        booking: booking,
        to: toDriver? booking.driver : booking.passenger,
        from: toDriver? booking.passenger : booking.driver
      };
      break;
    }
  }
  
  return proxyRoute;
};

TaxiSmsProxy.prototype.proxySms = function(from, to, message) {  
  // Determine how the SMS should be routed
  var proxyRoute = this.getProxyRoute(from, to);
  
  if(proxyRoute === null) {
    var errorText = 'No booking found' +
                    ' from: ' + from +
                    ' to: ' + to;
    throw new Error(errorText);
  }
  
  // Store the message
  proxyRoute.booking.messages.push({
    from: from,
    to: to,
    message: message
  });
  
  // Always send
  // - from the LVN
  // - to the real Number
  // Prefix the message with the name of the sender to clarify
  nexmo.message.sendSms(proxyRoute.from.lvn,
                        proxyRoute.to.realNumber,
                        proxyRoute.from.name + ': ' + message);
};

module.exports = TaxiSmsProxy;
