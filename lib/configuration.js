module.exports = getMediaConfiguration;

/**
 * @param  {string?}   confPath The path to find configuration
 * @return {object}    The configuration object
 */
function getMediaConfiguration ( confPath ) {
  var fs = require('fs');

  function getUserHome() {
    return process.env[
        (process.platform == 'win32')
          ? 'USERPROFILE'
          : 'HOME'
      ];
  }

  var defaultConfPath = getUserHome() + '/.risdmedia/wh.json';
  var configurationPath = typeof confPath === 'string'
    ? confPath
    : defaultConfPath;

  try {
    var configuration = JSON.parse(
      fs.readFileSync(configurationPath)
        .toString());
  } catch ( error ) {
    error.message = 'Pass in a valid configuration path, or use the default at ' + defaultConfPath;
    throw new error;
  }

  configuration.gcloud = '~/.risdmedia/gcloud.json'

  var required = ['embedly', 'firebase', 'server', 'generate'];
  var missing = required.filter( function ( key ) { return configuration.hasOwnProperty( key ) === false } )

  if ( missing.length > 0 ) {
    var errorMessage = [
      'Expected the following configuration values from ' + configurationPath + ':'
    ].concat( missing.map( function ( missingKey ) { return '\t' + missingKey + '\n' } ) );

    throw new Error( errorMessage );
  }

  configuration.firebaseName = configuration.firebase;
  
  return configuration;
}
