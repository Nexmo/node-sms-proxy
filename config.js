"use strict";

require('dotenv').config();

var config = {
  NEXMO_API_KEY: process.env['NEXMO_API_KEY'],
  NEXMO_API_SECRET: process.env['NEXMO_API_SECRET'],
  NEXMO_DEBUG: process.env['NEXMO_DEBUG'],
  NEXMO_APP_ID: process.env['NEXMO_APP_ID'],
  SMS_WEBHOOK_URL: process.env['SMS_WEBHOOK_URL'],
  PROVISIONED_NUMBERS: process.env['PROVISIONED_NUMBERS']? JSON.parse(process.env['PROVISIONED_NUMBERS']) : []
};

module.exports = config;
