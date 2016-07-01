var NEXMO_API_KEY = process.env.NEXMO_API_KEY;
var NEXMO_API_SECRET = process.env.NEXMO_API_SECRET;
var NEXMO_DEBUG = process.env.NEXMO_DEBUG;

var Nexmo = require('nexmo');
var nexmo = new Nexmo({apiKey: NEXMO_API_KEY, apiSecret: NEXMO_API_SECRET}, {debug: NEXMO_DEBUG});

var TaxiSmsProxy = function() {
  this.provisionedNumbers = ['447520615084', '447520619555'];
  this.activeJourneys = [];
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
      this.provisionedNumbers.push(number.msisdn);
    }
  }.bind(this));
};

TaxiSmsProxy.prototype.startJourney = function(passengerRealNumber, driverRealNumber) {
  // Create journey object
  // For demo purposes:
  // - Use first indexed LVN for passenger
  // - Use second indexed LVN for driver
  var journey = {
      passenger: {
        realNumber: passengerRealNumber,
        lvn: this.provisionedNumbers[0],
        name: 'Passenger'
      },
      driver: {
        realNumber: driverRealNumber,
        lvn: this.provisionedNumbers[1],
        name: 'Driver'
      }
  };
  
  this.activeJourneys.push(journey);
};

var fromPassengerToDriver = function(from, to, journey) {
  console.log('fromPassengerToDriver',
    from, '===', journey.passenger.realNumber,
    to, '===', journey.driver.lvn
  );
  return (from === journey.passenger.realNumber &&
          to == journey.driver.lvn);
};
var fromDriverToPassenger = function(from, to, journey) {
  console.log('fromDriverToPassenger',
    from, '===', journey.driver.realNumber,
    to, '===', journey.passenger.lvn
  );
  return (from === journey.driver.realNumber &&
          to === journey.passenger.lvn);
};

TaxiSmsProxy.prototype.getProxyRoute = function(from, to) {  
  var proxyRoute = null;
  var journey;
  for(var i = 0, l = this.activeJourneys.length; i < l; ++i) {
    journey = this.activeJourneys[i];
    
    // Use to and from to determine the active journey
    var toDriver = fromPassengerToDriver(from, to, journey);
    var toPassenger = fromDriverToPassenger(from, to, journey);
    
    if(toDriver || toPassenger) {
      proxyRoute = {
        journey: journey,
        to: toDriver? journey.driver : journey.passenger,
        from: toDriver? journey.passenger : journey.driver
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
    var errorText = 'No active journey' +
                    ' from: ' + from +
                    ' to: ' + to;
    throw new Error(errorText);
  }
  
  // Always send
  // - from the LVN
  // - to the real Number
  // Prefix the message with the name of the sender to clarify
  nexmo.message.sendSms(proxyRoute.from.lvn,
                        proxyRoute.to.realNumber,
                        proxyRoute.from.name + ': ' + message);
};

module.exports = TaxiSmsProxy;
