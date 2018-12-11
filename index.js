var debug = require('debug')('rm-wh:index')
var wh = require( './lib/wh' )
var configurationForPath = require( './lib/configuration.js' )
var updateSites = require( './lib/update-sites.js' )
var optionallyAddDomain = require( './optionally-add-domain.js' )

module.exports = function ( configurationPath ) {
  var configuration = configurationForPath( configurationPath )

  return {
    configuration: configuration,
    deploys: configurer( configuration, wh.deploys ),
    mapDomain: configurer( configuration, wh.mapDomain ),
    push: configurer( configuration, wh.push ),
    create: configurer( configuration, wh.create ),
    delete: configurer( configuration, wh.delete ),
    init: configurer( configuration, wh.init ),
    conf: configurer( configuration, wh.conf ),
    recreate: configurer( configuration, wh.recreate ),
    listSites: configurer( configuration, wh.listSites ),
    presetBuild: configurer( configuration, wh.presetBuild ),
    restore: configurer( configuration, wh.restore ),
    update: configurer( configuration, wh.update ),
    updateSites: configurer( configuration, updateSites ),
    resetKeys: configurer( configuration, wh.resetKeys ),
    serve: configurer( configuration, wh.serve ),
    cloneContentUnder: configurer( configuration, wh.cloneContentUnder ),
    deployStatic: configurer( configuration, wh.deployStatic ),
    pushStatic: configurer( configuration, wh.pushStatic ),
  }
}

/**
 * Wraps a wh function with an interface to be used by user or CLI
 * 
 * @param  {Function} fn          The webhook function to pass configuration to
 * @return {Function} configured  The interface for the function for the user or CLI to use
 */
function configurer ( configuration, fn ) {
  
  function configured ( options, callback ) {
    if ( typeof options === 'function' ) options = {}

    if ( configuration.domain && options.siteName ) options.siteName = optionallyAddDomain( configuraiton.domain, options.siteName )
    
    Object.assign( configuration, options )

    fn( configuration, callback )
  }

  return configured;
}
