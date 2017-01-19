Template.loginControl.onCreated(function() {
  this.options = {};
  if (this.data.guestLogin) {
    options.guestLogin = this.data.guestLogin;
  }

  this.email = new Blaze.ReactiveVar('');
  this.validEmail = new Blaze.ReactiveVar(false);
  this.validCode = new Blaze.ReactiveVar(false);
  this.resendingCode = new Blaze.ReactiveVar(false);
  this.loginInProcess = new Blaze.ReactiveVar(false);
  this.codeSent = new Blaze.ReactiveVar(false);
  this.noticeMessage = new Blaze.ReactiveVar('');
  this.noticeStatus = new Blaze.ReactiveVar('');
  this.autorun(() => {
    if (!this.email.get()) {
      this.noticeStatus.set();
      this.noticeMessage.set();
    }
  });
  this.autorun(() => {
    if (this.resendingCode.get()) {
      Meteor.setTimeout(() => {
        this.resendingCode.set(false);
      }, 15000);
    }
  });
});


// Template.loginControl.onRendered(function() {
//   if (Meteor.isCordova) {
//     if (navigator.splashscreen) {
//       navigator.splashscreen.hide();
//     }
//   }
// });


Template.loginControl.helpers({
  ooT(key, defaultValue) {
    if (typeof getTranslationString === 'function') {
      return getTranslationString(key, defaultValue);
    }
    return defaultValue;
  },
  emailPresent() {
    return Template.instance().email.get();
  },
  validEmail() {
    return Template.instance().validEmail.get();
  },
  guestLogin() {
    return Template.instance().options.guestLogin;
  },
  noticeStatus() {
    return Template.instance().noticeStatus.get();
  },
  noticeMessage() {
    return Template.instance().noticeMessage.get();
  },
  codeSent() {
    return Template.instance().codeSent.get();
  },
  validCode() {
    return Template.instance().validCode.get();
  },
  loginInProcess() {
    return Template.instance().loginInProcess.get();
  },
});

Template.loginControl.events({
  'input #newEmailInput'(e, t) {
    t.validEmail.set(validateEmail(e.currentTarget.value));
  },
  'click .js-setEmail'(e, t) {
    t.noticeStatus.set('');
    t.noticeMessage.set('');
    const newEmail = t.find('#newEmailInput').value.trim().toLowerCase();
    if (validateEmail(newEmail)) {
      t.email.set(newEmail);
      Meteor.call('enter_email', newEmail,
          function(error, result) {
            if (error) {
              alert('Your email is not authorized');
              t.email.set('');
              t.noticeStatus.set('notice:critical');
              t.noticeMessage.set(error.reason);
            } else {
              t.codeSent.set(true);
            }
          });
    } else {
      t.noticeStatus.set('notice:critical');
      t.noticeMessage.set('Invalid email');
    }
  },
  'click .js-resendCode'(e, t) {
    if (!t.resendingCode.get()) {
      t.resendingCode.set(true);
      Meteor.call('enter_email', t.email.get(),
        function(error, result) {
          if (error) {
            t.noticeStatus.set('notice:critical');
            t.noticeMessage.set(error.reason);
          } else {
            t.codeSent.set(true);
          }
        });
    }
  },
  'click .js-resetLogin'(e, t) {
    t.email.set('');
  },
  'input #newLoginCode'(e, t) {
    t.noticeStatus.set('');
    t.noticeMessage.set('');
    const code = e.currentTarget.value.trim();
    if (code.length === LOGIN_CODE_LENGTH) {
      t.validCode.set(true);
    } else {
      t.validCode.set(false);
    }
  },
  'click .js-tryLogin'(e, t) {
    t.noticeStatus.set('');
    t.noticeMessage.set('');
    const reg = new RegExp('^\\d+$');
    const code = t.find('#newLoginCode').value.trim();
    if (!reg.test(code)) {
      t.noticeStatus.set('notice:critical');
      t.noticeMessage.set('Invalid code');
      t.validCode.set(false);
    } else {
      t.loginInProcess.set(true);
      Meteor.call('enter_security_code', t.email.get(), code, function(error, pwd) {
        if ( error ) {
          console.log(error);
          t.loginInProcess.set(false);
          t.noticeStatus.set('notice:critical');
          t.noticeMessage.set(error.reason);
          t.validCode.set(false);
        } else {
          Meteor.loginWithPassword(t.email.get(), pwd, function(err) {
            if (err) {
              t.loginInProcess.set(false);
              t.noticeStatus.set('notice:critical');
              t.noticeMessage.set(err.reason);
              t.validCode.set(false);
            } else {
              Meteor.call('cancel_login_code', t.email.get());
              t.loginInProcess.set(false);
              // t.noticeStatus.set('notice:critical');
              // t.noticeMessage.set('Logged in.');
            }
          });
        }
      });
    }
  },
  'click .js-cancelSend'(e, t) {
    t.loginInProcess.set(false);
    t.email.set('');
  },
});
