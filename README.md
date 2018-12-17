# SMS Proxy using Node and the Nexmo SMS API

This app used the Nexmo SMS API to demonstrate how to use build an SMS proxy for masked communication between users.

## Prerequisites

You will need:

* A [free Nexmo account](https://dashboard.nexmo.com/sign-up)
* Somewhere to host this web app, Heroku or Your Local Machine with ngrok both work well

## Installation

```sh
git clone https://github.com/nexmo/node-sms-proxy.git
cd node-sms-proxy
npm install
```

## Setup

Rename the config file:

```sh
mv example.env .env
```

Fill in the values in `.env` as appropriate.

If preferred you can set previously provisioned numbers in the `PROVISIONED_NUMBERS` configuration value.

### Running the App

```sh
npm start
```

The application should be available on <http://localhost:3000>.

If you have not set up predefined numbers you can access <http://localhost:3000/provision> for the application to provision numbers.

### Using the App

Register a conversation with the application so that mappings can be created between real user numbers and Nexmo virtual numbers. This is done by making a `POST` such as the following to <http://localhost:3000/conversation>:

```
POST /conversation HTTP/1.1
Host: localhost:3000
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded

userANumber=USER_A_NUMBER&userBNumber=USER_B_NUMBER
```

When you do this each of the users will receive a text. Reply to that text will allow the to communicate anonymously with each other.

You can see a list of registered conversations by accessing <http://localhost:3000/conversations>.
