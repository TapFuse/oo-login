LOGIN_CODE_TIMEOUT_MINUTES = 1;
LOGIN_CODE_LENGTH = 6;

ADMIN_ACCOUNT_ID = 'app@eventspark.io';

import '../lib/lib/oo-login-collection.js';

Meteor.publish('userCodes', function() {
  if (isModeratorById(this.userId)) {
    return Collection.loginCodes.find({}, {fields: {email: 1, code: 1}});
  }
  this.ready();
});

Meteor.publish('userCodesById', function(userId) {
  if (isModeratorById(this.userId)) {
    const userInfo = Meteor.users.findOne({_id: userId}, {fields: {'emails.0.address': 1}});
    if (!!userInfo && typeof userInfo.emails[0].address) {
      return Collection.loginCodes.find({email: userInfo.emails[0].address}, {fields: {email: 1, code: 1}});
    }
  }
  this.ready();
});

Meteor.publish('singleCodeUserApple', function() {
  if (isModeratorById(this.userId)) {
    return Collection.loginCodes.find({email: 'apple@eventspark.io'}, {fields: {email: 1, code: 1}});
  }
  this.ready();
});

function removeExpiredLoginCodes() {
  Collection.loginCodes.remove({ timeout: { $lt: (new Date()).valueOf() } });
}

function loginOnlyGetsOneChance(email) {
  if (email !== 'apple@eventspark.io') {
    Collection.loginCodes.remove({email: email});
  }
}

function loginOrRegisterUserWithNewPassword(callbackObj, emailPassed) {
  const email = emailPassed.toLowerCase();
  const user = Meteor.users.findOne({'emails.address': email});
  const password = Random.hexString(30);
  let userId;
  if ( !user ) {
    console.log('user was NOT FOUND, loginOrRegisterUserWithNewPassword');
       // throw new Meteor.Error(55001, "Your email is not found, please contact support, Error code - 55001");
    const randomnumber = (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString();
    const profile = {
      title: '',
      firstName: 'Guest',
      lastName: randomnumber,
      company: '',
      position: '',
      about: '',
      attendee: true,
      list: ['attendee'],
    };
    const options = {
      email: email,
      username: Random.id(),
      profile: profile,
    };
    userId = Accounts.createUser(options);
    Accounts.setPassword(userId, password, {logout: false});
    if (ServerSettings.findOne({'features.privateLogin': false, appType: 'single'}, {fields: {_id: 1}})) {
      const app = SingleEvents.findOne({isDeleted: false}, {fields: {_id: 1}});
      if (app && app._id) {
        const ticketOptions = {
          appId: app._id,
          userId: userId,
          labels: ['role2'],
          roles: {role2: true},
          loginFlow: true,
        };
        // console.log('Calling appCreateTicketForUser in loginFlow.js');
        Meteor.call('appCreateTicketForUser', ticketOptions, function(err) {
          if (err) {
            console.log(err);
            throw new Meteor.Error(55566, 'Please contact support');
          }
        });
      }
    }

        // console.log('CREATED userId = ' + userId);
  } else {
    userId = user._id;
    // console.log('FOUND userId = ' + userId);

    if (user.locked) {
      throw new Meteor.Error(55555, 'Please contact support');
    }

    Accounts.setPassword(userId, password, {logout: false});
  }

  callbackObj.setUserId(userId);

  return password;
}

Meteor.methods({
  enter_email: function(userEmail) {
    // console.log('loginFlow.js - enter_email called -', userEmail);
    const settings = ServerSettings.findOne({_id: 'mainSettings001'}, {fields: {features: 1, singleCodeValue: 1, isOneCodeEnabled: 1}});
    check(userEmail, String);
      // if need SSL - client check -1 != window.location.protocol.toLowerCase().indexOf('https')
      // check(ssl,Boolean);
      // console.log("enter_email for email address: " + email);
    const email = userEmail.toLowerCase().trim();
    let randomCode = '';
    const randomHash = '';

    // determine if this email address is already a user in the system
    const user = Meteor.users.findOne({'emails.address': email});
    const validCode = Collection.loginCodes.findOne({email: email, timeout: { $gt: (new Date()).valueOf() }});
    // console.log(email + " user = " + user + " valid code = " + validCode.code);
    if (settings && settings.features && settings.features.privateLogin && user === undefined) {
        // return 'Email not recognized, contact support!'
      throw new Meteor.Error(55001, 'Email not authorized');
    } else {
      if (!validCode) {
        // create a loginCodes record, with a new LOGIN_CODE_LENGTH-digit code, to expire in LOGIN_CODE_TIMEOUT_MINUTES
        // make the code be LOGIN_CODE_LENGTH digits, not start with a 0, and not have any repeating digits
        for ( ; randomCode.length < LOGIN_CODE_LENGTH; ) {
          const chr = Random.choice('0123456789');
          if ( randomCode.length === 0 ) {
            if ( (chr === '0') ) {
              continue;
            }
          } else {
            if ( chr === randomCode.charAt(randomCode.length - 1) ) {
              continue;
            }
          }
          randomCode += chr;
        }
      }
    }
    // console.log('%c settings: settings', 'background: #9FBB3A; color: white; padding: 1px 15px 1px 5px;', settings);
    if (settings.isOneCodeEnabled && settings.singleCodeValue) {
      randomCode = settings.singleCodeValue;
    }

    const timeout = (new Date()).valueOf() + (LOGIN_CODE_TIMEOUT_MINUTES * 60 * 1000);
    const codeToSend = randomCode ? randomCode : validCode.code;
    console.log('Code - ', codeToSend, ' has been sent to ', email);
    Collection.loginCodes.upsert({email: email}, {email: email, code: codeToSend, hash: randomHash, timeout: timeout});
    const codeType = user ? 'login' : 'registration';

    // XXX not sure if needed
    this.unblock();
    // console.log('loginFlow.js - sending email - ', email);
    Email.send({
      from: ADMIN_ACCOUNT_ID,
      to: email,
      subject: 'Code: ' + codeToSend,
      text: ( 'Your conference app ' + codeType + ' security code is:\r\n\r\n      ' + codeToSend + '\r\n\r\n' +
              'note: this single-use code is only valid for ' + LOGIN_CODE_TIMEOUT_MINUTES + ' minutes.' ),
      html: ( '<html><body>' +
              '<p>Your <b>Conference App</b> ' + codeType + ' security code is:</p>' +
              '<p style="margin-left:2em;"><font size="+1"><b>' + codeToSend + '</b></font></p>' +
              '<p><font size="-1">note: this single-use code is only valid for ' + LOGIN_CODE_TIMEOUT_MINUTES + ' minutes.</font></p>' +
              '</body></html>' )});

    const ret = { known: (user !== undefined) };
    return ret;
  },

  enter_security_code: function(userEmail, code) {
    check(userEmail, String);
    check(code, String);
    const email = userEmail.toLowerCase();

    if (!email) {
      throw new Meteor.Error(55002, 'Internal error [E41]');
    }
    if (!code) {
      throw new Meteor.Error(55003, 'Internal error [C42]');
    }
    // delete any login codes that have timed out yet
    removeExpiredLoginCodes();

    // If can find this record in login codes then all is well, else it failed
    const loginCode = Collection.loginCodes.findOne({email: email, code: code});
    if ( !loginCode ) {
      throw new Meteor.Error(55004, 'Incorrect code');
    }
    const password = loginOrRegisterUserWithNewPassword(this, email);
    // loginOnlyGetsOneChance(email);

    return password;
  },

  cancel_login_code: function(userEmail) {
    check(userEmail, String);
    // console.log("cancel_login_code for email address: " + email);
    const email = userEmail.toLowerCase();

    // delete any existing record for this user login codes
    loginOnlyGetsOneChance(email);

    return 'ok';
  },
});

Meteor.startup(function() {
  if ( Meteor.settings.MAIL_URL ) {
    process.env.MAIL_URL = Meteor.settings.MAIL_URL;
  }
});
