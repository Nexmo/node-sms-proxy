var Nexmo = require('nexmo');
var Promise = require('bluebird');

/**
 * Create a new SmsProxy
 */
var SmsProxy = function(config) {
  this.config = config;
  
  this.nexmo = new Nexmo({
      apiKey: this.config.NEXMO_API_KEY, 
      apiSecret: this.config.NEXMO_API_SECRET
    },{
      debug: this.config.NEXMO_DEBUG
    });
  
  // Virtual Numbers to be assigned to UserA and UserB
  this.provisionedNumbers = [].concat(this.config.PROVISIONED_NUMBERS);
  
  // In progress conversations
  this.conversations = [];
};

/**
 * Provision two virtual numbers. Would provision more in a real app.
 */
SmsProxy.prototype.provisionVirtualNumbers = function() {
  // Buy a UK number with SMS capabilities.
  this.nexmo.number.search('GB', {features: 'SMS'}, function(err, res) {
    if(err) {
      console.error(err);
    }
    else {
      var numbers = res.numbers;
      
      // For demo purposes:
      // - Assume that at least two numbers will be available
      // - Rent just two virtual numbers: one for each conversation participant
      this.rentNumber(numbers[0]);
      this.rentNumber(numbers[1]);
    }
  }.bind(this));
};

/**
 * Rent the given number
 */
SmsProxy.prototype.rentNumber = function(number) {
  this.nexmo.number.buy(number.country, number.msisdn, function(err, res) {
    if(err) {
      console.error(err);
    }
    else {
      this.configureNumber(number);
    }
  }.bind(this));
};

/**
 * Check if the supplied number has already been stored as provisioned.
 */
SmsProxy.prototype.isProvisioned = function(checkNumber) {
  this.provisionedNumbers.forEach(function(number) {
    if(checkNumber.msisdn === number.msisdn) {
      return true;
    }
  });
  return false;
};

/**
 * Configure the number to be associated with the SMS Proxy application.
 */
SmsProxy.prototype.configureNumber = function(number) {
  this.nexmo.number.update(number.country, number.msisdn, {moHttpUrl: this.config.SMS_WEBHOOK_URL}, function(err, res) {
    if(err) {
      console.error(err);
    }
    else if(!this.isProvisioned(number)) {
      this.provisionedNumbers.push(number);
    }
  }.bind(this));
};

/**
 * Ensure the existing provisioned numbers are linked to the SMS Proxy app.
 */
SmsProxy.prototype.reconfigureNumbers = function() {
  this.provisionedNumbers.forEach(this.configureNumber.bind(this));
};

/**
 * Create a new tracked conversation so there is a real/virtual mapping of numbers.
 */
SmsProxy.prototype.createConversation = function(userANumber, userBNumber, cb) {
  this.checkNumbers(userANumber, userBNumber)
    .then(this.saveConversation.bind(this))
    .then(this.sendSMS.bind(this))
    .then(function(conversation) {
      cb(null, conversation);
    })
    .catch(function(err) {
      console.error(err);
      cb(err);
    });
};

/**
 * Ensure the given numbers are valid and which country they are associated with.
 */
SmsProxy.prototype.checkNumbers = function(userANumber, userBNumber) {
  var niGetPromise = Promise.promisify(this.nexmo.numberInsight.get, {context: this.nexmo.numberInsight});
  var userAGet = niGetPromise({level: 'basic', number: userANumber});
  var userBGet = niGetPromise({level: 'basic', number: userBNumber});
  
  return Promise.all([userAGet, userBGet]);
};

/**
 * Store the conversation information.
 */
SmsProxy.prototype.saveConversation = function(results) {
  var userAResult = results[0];
  var userANumber = {
    msisdn: userAResult.international_format_number,
    country: userAResult.country_code
  };
  
  var userBResult = results[1];
  var userBNumber = {
    msisdn: userBResult.international_format_number,
    country: userBResult.country_code
  };
  
  // Create conversation object - for demo purposes:
  // - Use first indexed LVN for user A
  // - Use second indexed LVN for user B
  var conversation = {
    userA: {
      realNumber: userANumber,
      virtualNumber: this.provisionedNumbers[0]
    },
    userB: {
      realNumber: userBNumber,
      virtualNumber: this.provisionedNumbers[1]
    }
  };
  
  this.conversations.push(conversation);
  
  return conversation;
};

/**
 * Send an SMS to each conversation participant so they know each other's
 * virtual number and can call either other via the proxy.
 */
SmsProxy.prototype.sendSMS = function(conversation) {
  // Send UserA conversation information
  // From the UserB virtual number
  // To the UserA real number
  this.nexmo.message.sendSms(conversation.userB.virtualNumber.msisdn,
                             conversation.userA.realNumber.msisdn,
                             'Call this number to talk to UserB');

  // Send UserB conversation information
  // From the UserA virtual number
  // To the UserB real number
  this.nexmo.message.sendSms(conversation.userA.virtualNumber.msisdn,
                             conversation.userB.realNumber.msisdn,
                             'Call this number to talk to UserB');
                        
  return conversation;
};

var fromUserAToUserB = function(from, to, conversation) {
  return (from === conversation.userA.realNumber.msisdn &&
          to === conversation.userB.virtualNumber.msisdn);
};
var fromUserBToUserA = function(from, to, conversation) {
  return (from === conversation.userB.realNumber.msisdn &&
          to === conversation.userA.virtualNumber.msisdn);
};

/**
 * Work out real number to virual number mapping between users.
 */
SmsProxy.prototype.getProxyRoute = function(from, to) { 
  var proxyRoute = null;
  var conversation;
  for(var i = 0, l = this.conversations.length; i < l; ++i) {
    conversation = this.conversations[i];
    
    // Use to and from to determine the conversation
    var fromUserA = fromUserAToUserB(from, to, conversation);
    var fromUserB = fromUserBToUserA(from, to, conversation);
    
    if(fromUserA || fromUserB) {
      proxyRoute = {
        to: fromUserA? conversation.userB : conversation.userA,
        from: fromUserA? conversation.userA : conversation.userB
      };
      break;
    }
  }
  
  return proxyRoute;
};

SmsProxy.prototype.proxySms = function(from, to, text) {  
  // Determine how the SMS should be routed
  var proxyRoute = this.getProxyRoute(from, to);
  
  if(proxyRoute === null) {
    var errorText = 'No booking found' +
                    ' from: ' + from +
                    ' to: ' + to;
    throw new Error(errorText);
  }
  
  // Always send
  // - from the LVN
  // - to the real Number
  this.nexmo.message.sendSms(proxyRoute.from.virtualNumber.msisdn,
                             proxyRoute.to.realNumber.msisdn,
                             text);
};

module.exports = SmsProxy;
