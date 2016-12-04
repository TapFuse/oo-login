Package.describe({
  name: 'ox2:login',
  version: '0.0.3',
  // Brief, one-line summary of the package.
  summary: 'TEST, DO NOT USE',
  // URL to the Git repository containing the source code for this package.
  // git: 'https://github.com/ox2/oo-login',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

var C = 'client';
var S = 'server';
var CS = [C, S];

Package.onUse(function(api) {
    api.versionsFrom('1.4.2');
    // Core
    api.use([
      'ecmascript',
      'mongo',
      'promise',
      'templating',
      'less',
    ]);
    // 3rd party
    api.use([
      'mquandalle:jade@0.4.9', 'ox2:inject-style@1.0.0', 'tapfuse:collection-global@2.0.0',
    ]);
    api.addFiles('lib/lib/oo-login-collection.js', CS);
    api.addFiles('lib/oo-login-server.js', S);
    api.addFiles('lib/oo-login-client.less', C);
    api.addFiles('lib/oo-login-client.jade', C);
    api.addFiles('lib/oo-login-client.js', C);
    api.export('validateEmail', CS);
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('ox2:login');
  api.addFiles('tests/package-tests.js');
});
