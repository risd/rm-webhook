var debug = require('debug')('rm-wh:index');
var wh = require( './lib/wh' );
var configuration = require( './lib/configuration.js' )()

module.exports = {
  deploys: configurer( wh.deploys ),
  push: configurer( wh.push ),
  create: configurer( wh.create ),
  delete: configurer( wh.delete ),
  init: configurer( wh.init ),
  recreate: configurer( wh.recreate ),
  listSites: configurer( wh.listSites ),
  presetBuild: configurer( wh.presetBuild ),
  restore: configurer( wh.restore ),
  update: configurer( wh.update ),
  resetKeys: configurer( wh.resetKeys ),
  serve: configurer( wh.serve ),
  cloneContentUnder: configurer( wh.cloneContentUnder ),
  deployStatic: configurer( wh.deployStatic ),
}

/**
 * Wraps a wh function with an interface to be used by user or CLI
 * 
 * @param  {Function} fn          The webhook function to pass configuration to
 * @return {Function} configured  The interface for the function for the user or CLI to use
 */
function configurer ( fn ) {
  
  function configured ( options, callback ) {
    if ( typeof options === 'function' ) options = {}
    if ( typeof callback === 'undefined' ) callback = noop;

    if ( options.siteName ) options.siteName = optionallyAddDomain( options.siteName )
    
    Object.assign( configuration, options )
    
    fn( configuration, callback )
  }

  return configured;
}

function noop () {}

/**
 * Expects a site name. If there is a `.` in the name, a domain is assumed
 * otherwise, `configuration.domain` is appened as the domain
 * 
 * @param  {string} site The name of the site
 * @return {string} site The name of the site with 
 */
function optionallyAddDomain ( site ) {
  if ( typeof site !== 'string' ) return null;

  var optionalDomain = configuration.domain;
  
  var containsTLD = function () {
    var indexOfPeriod = site.indexOf( '.' );
    return indexOfPeriod === -1 ? false : true;
  }

  var siteHasTLD = containsTLD( site );
  if ( siteHasTLD === true ) return site;
  else return [ site, optionalDomain ].join( '.' );

}
