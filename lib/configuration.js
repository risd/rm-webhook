var fsParseJson = require( '@risd/wh' ).lib.util.fsParseJson;

module.exports = getMediaConfiguration;

/**
 * @param  {string?}   confPath The path to find configuration
 * @return {object}    The configuration object
 */
function getMediaConfiguration ( confPath ) {

  var defaultConfPath = '~/.risdmedia/wh.json';
  var configurationPath = typeof confPath === 'string'
    ? confPath
    : defaultConfPath;

  try {
    var configuration = fsParseJson( configurationPath )
  } catch ( error ) {
    error.message = 'Pass in a valid configuration path, or use the default at ' + defaultConfPath;
    throw error;
  }

  configuration.gcloud = '~/.risdmedia/gcloud.json'

  var required = ['embedly', 'firebase', 'firebaseAPIKey', 'server', 'generate', 'platformName'];
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
