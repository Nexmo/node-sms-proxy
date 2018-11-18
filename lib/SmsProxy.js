const Nexmo = require('nexmo');

class SmsProxy {

    constructor(config) {
        this.config = config;

        this.nexmo = new Nexmo({
            apiKey: this.config.NEXMO_API_KEY,
            apiSecret: this.config.NEXMO_API_SECRET
        }, {
                debug: this.config.NEXMO_DEBUG
            });

        // Virtual Numbers to be assigned to UserA and UserB
        this.provisionedNumbers = [].concat(this.config.PROVISIONED_NUMBERS);

        // In progress conversations
        this.conversations = [];
    }

    provisionVirtualNumbers() {
        // Buy a UK number with SMS capabilities.
        this.nexmo.number.search('GB', { features: 'SMS' }, (err, res) => {
            if (err) {
                console.error(err);
            }
            else {
                const numbers = res.numbers;

                // For demo purposes:
                // - Assume that at least two numbers will be available
                // - Rent just two virtual numbers: one for each conversation participant
                this.rentNumber(numbers[0]);
                this.rentNumber(numbers[1]);
            }
        });
    }

    rentNumber(number) {
        this.nexmo.number.buy(number.country, number.msisdn, (err, res) => {
            if (err) {
                console.error(err);
            }
            else {
                this.configureNumber(number);
            }
        });
    }

    isProvisioned(checkNumber) {
        this.provisionedNumbers.forEach((number) => {
            if (checkNumber.msisdn === number.msisdn) {
                return true;
            }
        });
        return false;
    }

    configureNumber(number) {
        this.nexmo.number.update(number.country, number.msisdn, { moHttpUrl: this.config.SMS_WEBHOOK_URL }, (err, res) => {
            console.log
            if (err) {
                console.error(err);
            }
            else if (!this.isProvisioned(number)) {
                this.provisionedNumbers.push(number);
            }
        });

    }

    reconfigureNumbers() {
        this.provisionedNumbers.forEach(this.configureNumber);
    }

    createConversation(userANumber, userBNumber, cb) {
        this.checkNumbers(userANumber, userBNumber)
            .then(this.saveConversation.bind(this))
            .then(this.sendSMS.bind(this))
            .then((conversation) => {
                cb(null, conversation);
            })
            .catch((err) => {
                console.error(err);
                cb(err);
            });
    }

    checkNumbers(userANumber, userBNumber) {
        let userAGet = new Promise((resolve, reject) => {
            this.nexmo.numberInsight.get({ level: 'basic', number: userANumber }, (error, result) => {
                if (error) {
                    console.error(error);
                    reject(`Check for ${userANumber} failed`);
                }
                else {
                    console.log(result);
                    resolve(result)
                }
            });
        });

        let userBGet = new Promise((resolve, reject) => {
            this.nexmo.numberInsight.get({ level: 'basic', number: userBNumber }, (error, result) => {
                if (error) {
                    console.error(error);
                    reject(`Check for ${userBNumber} failed`);
                }
                else {
                    console.log(result);
                    resolve(result)
                }
            });
        });

        return Promise.all([userAGet, userBGet]);
    }

    saveConversation(results) {
        const userAResult = results[0];
        const userANumber = {
            msisdn: userAResult.international_format_number,
            country: userAResult.country_code
        };

        const userBResult = results[1];
        const userBNumber = {
            msisdn: userBResult.international_format_number,
            country: userBResult.country_code
        };

        // Create conversation object - for demo purposes:
        // - Use first indexed LVN for user A
        // - Use second indexed LVN for user B

        const virtualNumbers = this.provisionedNumbers

        const conversation = {
            userA: {
                realNumber: userANumber,
                virtualNumber: virtualNumbers[0]
            },
            userB: {
                realNumber: userBNumber,
                virtualNumber: virtualNumbers[1]
            }
        };

        this.conversations.push(conversation);

        return conversation;
    }

    sendSMS(conversation) {
        // Send UserA conversation information
        // From the UserB virtual number
        // To the UserA real number
        this.nexmo.message.sendSms(conversation.userB.virtualNumber.msisdn,
            conversation.userA.realNumber.msisdn,
            'Reply to this SMS to talk to UserB');

        // Send UserB conversation information
        // From the UserA virtual number
        // To the UserB real number
        this.nexmo.message.sendSms(conversation.userA.virtualNumber.msisdn,
            conversation.userB.realNumber.msisdn,
            'Reply to this SMS to talk to UserA');

        return conversation;
    }

    getProxyRoute(from, to) {
        let proxyRoute = null;
        let conversation;

        this.conversations.some((conversation, index) => {
            // Use to and from to determine the conversation
            const fromUserA = this.fromUserAToUserB(from, to, conversation);
            const fromUserB = this.fromUserBToUserA(from, to, conversation);    
            
            if (fromUserA || fromUserB) {
                proxyRoute = {
                    to: fromUserA ? conversation.userB : conversation.userA,
                    from: fromUserA ? conversation.userA : conversation.userB
                };
                return true;
            }
        });
        return proxyRoute;
    }

    proxySms(from, to, text) {
        // Determine how the SMS should be routed
        let proxyRoute = this.getProxyRoute(from, to);

        if (proxyRoute === null) {
            let errorText = 'No booking found' +
                ' from: ' + from +
                ' to: ' + to;
            throw new Error(errorText);
        }

        // Always send
        // - from the virtual number
        // - to the real number
        this.nexmo.message.sendSms(proxyRoute.from.virtualNumber.msisdn,
            proxyRoute.to.realNumber.msisdn,
            text);
    }

    fromUserAToUserB(from, to, conversation) {
        return (from === conversation.userA.realNumber.msisdn &&
            to === conversation.userB.virtualNumber.msisdn);
    }

    fromUserBToUserA(from, to, conversation) {
        return (from === conversation.userB.realNumber.msisdn &&
            to === conversation.userA.virtualNumber.msisdn);
    }
}

module.exports = SmsProxy;