import { Mongo } from 'meteor/mongo';
import { Collection } from 'meteor/tapfuse:collection-global';

LOGIN_CODE_LENGTH = 5;

Collection.loginCodes = new Mongo.Collection('logincodes');

validateEmail = function(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
};
