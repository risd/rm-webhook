module.exports = optionallyAddDomain;

/**
 * Expects a site name. If there is a `.` in the name, a domain is assumed
 * otherwise, `configuration.domain` is appened as the domain
 * 
 * @param  {string} baseDomain The domain to optionally postfix on the site.
 * @param  {string} site The name of the site
 * @return {string} site The name of the site with 
 */
function optionallyAddDomain ( baseDomain, site ) {
  if ( typeof baseDomain !== 'string' || typeof site !== 'string' ) return null;

  var optionalDomain = baseDomain;
  
  var containsTLD = function () {
    var indexOfPeriod = site.indexOf( '.' );
    return indexOfPeriod === -1 ? false : true;
  }

  var siteHasTLD = containsTLD( site );
  if ( siteHasTLD === true ) return site;
  else return [ site, optionalDomain ].join( '.' );

}
