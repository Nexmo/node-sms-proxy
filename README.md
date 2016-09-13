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

The application should be available on <http://localhost:5000>.

### Using the App

Call one of the virtual numbers that you rented. The call will be tracked and forwarded to the desired destination number.

You can see a list of tracked calls by accessing <http://localhost:5000/tracked-calls>.
