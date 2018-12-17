'use strict'

const Nexmo = require('nexmo');

class SmsProxy {

    /**
     * Create a new SmsProxy
     */
    constructor(config) {

        this.config = config;

        this.nexmo = new Nexmo({
            apiKey: this.config.NEXMO_API_KEY,
            apiSecret: this.config.NEXMO_API_SECRET
        }, {
                debug: true
            });
    }

    createConversation(userANumber, userBNumber) {
        this.conversation = {
            userA: {
                realNumber: userANumber,
                virtualNumber: this.config.VIRTUAL_NUMBER_A
            },
            userB: {
                realNumber: userBNumber,
                virtualNumber: this.config.VIRTUAL_NUMBER_B
            }
        };

        this.sendSMS();
    }

    sendSMS() {
        // Send UserA conversation information
        // From the UserB virtual number
        // To the UserA real number
        console.log(this.conversation);

        this.nexmo.message.sendSms(this.conversation.userB.virtualNumber,
            this.conversation.userA.realNumber,
            'Reply to this SMS to talk to UserB');

        // Send UserB conversation information
        // From the UserA virtual number
        // To the UserB real number
        this.nexmo.message.sendSms(this.conversation.userA.virtualNumber,
            this.conversation.userB.realNumber,
            'Reply to this SMS to talk to UserA');
    }

    fromUserAToUserB(from, to, conversation) {
        return (from === this.conversation.userA.realNumber &&
            to === this.conversation.userB.virtualNumber);
    }

    fromUserBToUserA(from, to, conversation) {
        return (from === this.conversation.userB.realNumber &&
            to === this.conversation.userA.virtualNumber);
    }

    getProxyRoute(from, to) {
        let proxyRoute = null;

            // Use to and from numbers to work out who is sending to whom
            const fromUserA = this.fromUserAToUserB(from, to, this.conversation);
            const fromUserB = this.fromUserBToUserA(from, to, this.conversation);

            if (fromUserA || fromUserB) {
                proxyRoute = {
                    to: fromUserA ? this.conversation.userB : this.conversation.userA,
                    from: fromUserA ? this.conversation.userA : this.conversation.userB
                };
            }
        

        return proxyRoute;
    }

    proxySms(from, to, text) {
        // Determine how the SMS should be routed
        const proxyRoute = this.getProxyRoute(from, to);
        console.log(proxyRoute)

        if (proxyRoute === null) {
            const errorText = 'No conversation found' +
                ' from: ' + from +
                ' to: ' + to;
            throw new Error(errorText);
        }

        // Always send
        // - from the virtual number
        // - to the real number
        this.nexmo.message.sendSms(proxyRoute.from.virtualNumber,
            proxyRoute.to.realNumber, text);
    }

}

module.exports = SmsProxy;
