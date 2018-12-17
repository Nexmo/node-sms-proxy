# SMS Proxy using Node and the Nexmo SMS API

This app uses the Nexmo SMS API to demonstrate how to build an SMS proxy for private communication between users. Each user sees only the other party's virtual number, not their real one.

## Prerequisites

You will need:

* A [free Nexmo account](https://dashboard.nexmo.com/sign-up)
* Somewhere to host this web app: Heroku or your local machine with ngrok both work well

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

If you do not have numbers to use as virtual numbers, purchase two in the [dashboard](https://dashboard.nexmo.xom) and configure them in `.env`.

### Running the App

```sh
npm start
```

The application should be available on `http://localhost:3000`.


### Using the App

Register a conversation with the application so that mappings can be created between real user numbers and Nexmo virtual numbers. This is done by making a `POST` such as the following to `http://localhost:3000/conversation`
 and replacing `USER_A_NUMBER` and `USER_B_NUMBER` with the real numbers of the parties involved:

```
POST /conversation HTTP/1.1
Host: localhost:3000
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded

userANumber=USER_A_NUMBER&userBNumber=USER_B_NUMBER
```

When you do this each of the users will receive a text. Replying to that text will allow the users to communicate anonymously with each other.
