/**

Update sites
------

Update a series of @rids/webhook sites in batch, without needed a local
repository for each site.
*/

var confPathToConfigurationObject = require( './configuration' )
var semverCompare = require( 'semver-compare' )
var migrations = require( '../migrations' )
var minimatch = require( 'minimatch' )
var fs = require( 'fs' )

var firebaseEscape = require( './wh' ).util.escapeSite;
var firebaseUnescape = require( './wh' ).util.unescapeSite;
var Firebase = require( './wh' ).util.firebase;
var firebaseAuthSeries = require( './wh' ).util.authSeries;
var functor = require( './wh' ).util.functor;
var npmViewVersion = require( './wh' ).util.npmViewVersion;
var runGitCloneForUpdate = require( './wh' ).util.runGitCloneForUpdate
var runRmRf = require( './wh' ).util.runRmRf
var updateSite = require( './wh' ).update

module.exports = UpdateSites;

/**
 * init = sitesMiniMatch : str,
      ...whConfig: {
          generate,
          firebaseName,
          firebaseAPIKey,
          firebaseToken?,
          configuration?
          webhookUsername?,
          webhookPassword?,
          platformName?
        }
 */
function UpdateSites ( options, callback ) {
  if ( ! ( this instanceof UpdateSites ) ) return new UpdateSites( options, callback )

  var firebase = Firebase( options )

  var config = {
    generate: options.generate,
    platformName: options.platformName,
    sitesMiniMatch: options.sitesMiniMatch || '*',
    generateVersion: null,
    whConfig: Object.assign( {}, options )
  }

  // firebase used to authenticate
  options.firebase = firebase;

  // firebase used through this module
  config.firebase = firebase;

  // whConfig => () => whConfig
  var whConfigFn = functor( options )
  var configFn = functor( config )

  return firebaseAuth( whConfigFn )
    .then( siteListForUser( whConfigFn ) )
    .then( sitesToUpdate( configFn ) )
    .then( gitForSiteList( configFn ) )
    .then( keyForSiteList( configFn ) )
    .then( setGenerateVersion( configFn ) )
    .then( updateSites( configFn ) )
    .then( handleUpdate )
    .catch( handleUpdateError )

  function handleUpdate ( siteList ) {
    console.log( siteList )
    callback()
  }

  function handleUpdateError ( error ) {
    callback( error )
  }
}


/**
 * firebase-auth = whConfigFn => whConfigFn
 */
function firebaseAuth ( whConfigFn ) {
  return new Promise( firebaseAuthPromise )

  function firebaseAuthPromise ( resolve, reject ) {
    firebaseAuthSeries( whConfigFn, handleFirebaseAuthSeries )

    function handleFirebaseAuthSeries ( error ) {
      if ( error ) return reject( error )
      resolve()
    }
  }
}


/**
 * list-sites = user => siteList
 */
function siteListForUser ( whConfigFn ) {
  return function resolveSiteList () {
    return new Promise( siteListPromise )
  }

  function siteListPromise ( resolve, reject ) {
    var config = whConfigFn()
    var firebase = config.firebase;
    var username = config.webhookUsername;

    firebase.userSites( username )
      .then( handleSites )
      .catch( handleSitesError )

    function handleSites ( userSites ) {
      resolve( sitesForUserData( userSites.val() ) )
    }

    function handleSitesError ( error ) {
      reject( error )
    }
  }

  function sitesForUserData ( userSites ) {
    var siteList = [];

    var userTypes = Object.keys( userSites )
    for (var i = userTypes.length - 1; i >= 0; i--) {
      var userType = userTypes[ i ]
      var userTypeSites = userSites[ userType ]
      if ( userTypeSites ) {
        var sitesForUserType = Object.keys( userTypeSites )
        for (var j = sitesForUserType.length - 1; j >= 0; j--) {
          var siteName = sitesForUserType[ j ]
          siteList.push( {
            siteName: firebaseUnescape( siteName ),
            owner: userType === 'owners',
            user: userType === 'users',
          } )
        }
      }
    }

    return siteList
  }
}

/**
 * sites-to-update = siteList, sitesMiniMatch => updateSiteList
 */
function sitesToUpdate ( configFn ) {
  return function resolveSiteList ( siteList ) {

    return new Promise( sitesToUpdatePromise )

    function sitesToUpdatePromise ( resolve, reject ) {
      var config = configFn();
      var sitesMiniMatch = config.sitesMiniMatch

      resolve( siteList.filter( inConfExpression( sitesMiniMatch ) ) )
    }

    function inConfExpression ( sitesMiniMatch ) {
      return function siteEntryInList ( siteEntry ) {
        return minimatch( siteEntry.siteName, sitesMiniMatch )
      }
    }
  }
}

/**
 * git-for-site = updateSiteList => siteGitList : { siteName, github }
 */
function gitForSiteList ( configFn ) {
  return function resolveSiteGitList ( updateSiteList ) {
    return new Promise( gitForSiteListPromise )

    function gitForSiteListPromise ( resolve, reject ) {
      var config = configFn()
      var firebase = config.firebase;

      Promise.all( updateSiteList.map( addSiteGithub ) )
        .then( handleSiteGitList )
        .catch( handleSiteGitListError )

      function addSiteGithub ( siteEntry ) {
        return new Promise( addSiteGithubPromise )

        function addSiteGithubPromise ( resolve, reject ) {
          firebase.siteGithub( { siteName: siteEntry.siteName } )
            .then( handleSiteEntryGithub )
            .catch( handleSiteEntryGithubError )

          function handleSiteEntryGithub ( githubSnapshot ) {
            resolve( Object.assign( { github: githubSnapshot.val() }, siteEntry ) )
          }

          function handleSiteEntryGithubError ( error ) {
            reject( error )
          }
        }
      }

      function handleSiteGitList ( siteGitList ) {
        resolve( siteGitList.filter( excludeEmptyGithub ) )
      }

      function handleSiteGitListError ( error ) {
        reject( error )
      }

      function excludeEmptyGithub ( siteEntry ) {
        return typeof siteEntry.github === 'string' && siteEntry.github.length > 0;
      }
    }
  }
}

/**
 * key-for-site = siteGitList => siteKeyGitList : { siteName, siteKey, github }
 */
function keyForSiteList ( configFn ) {
  return function resolveSiteList ( siteGitList ) {
    var config = configFn()
    var firebase = config.firebase;

    return Promise.all( siteGitList.map( addSiteKey ) )

    function addSiteKey ( siteEntry ) {
      return new Promise( addSiteKeyPromise )

      function addSiteKeyPromise ( resolve, reject ) {
        firebase.siteKey( { siteName: siteEntry.siteName } )
          .then( handleSiteKey )
          .catch( handleSiteKeyError )

        function handleSiteKey ( siteKeySnapshot ) {
          resolve( Object.assign( { siteKey: siteKeySnapshot.val() }, siteEntry ) )
        }

        function handleSiteKeyError ( error ) {
          reject( error )
        }
      }
    }
  }
}

/**
 * generate-version = configFn => siteKeyGitList => generateVersion => siteKeyGitList
 */
function setGenerateVersion ( configFn ) {
  return function getGenerateVersion ( siteKeyGitList ) {
    return new Promise( setGenerateVersionPromise )

    function setGenerateVersionPromise ( resolve, reject ) {
      var config = configFn()
      var generate = config.generate;

      npmViewVersion( generate, handleGenerateValue )

      function handleGenerateValue ( error, generateVersion ) {
        if ( error ) return reject( error )
        config.generateVersion = generateVersion;
        resolve( siteKeyGitList )
      }
    }
  }
}

/**
 *  for each in siteDeploysKeyGitList
    update-site = generate, github, siteName, siteKey, updateDir, migrations =>
      clone = updateDir, github => git clone ssh || git clone https => error?
      checkout-master = updateDir => git checkout master => error?
      hotfix = gitTag, updateDir => git flow hotfix start generator-{gitTag} => error?
      update = generate, siteName, siteKey, force, updateDir => wh/lib/update => error?
      apply-migrations = updateDir, migrations => error?
      semver-change = updateDir, semverChange => error?
      commit = updateDir => git commit
      finish = gitTag, updateDir => git flow hotfix finish generator-{gitTag}
      # push-dev = updateDir => git checkout develop => git push => npm run deploy
      # push-master = updateDir => git checkout master => git push => npm run deploy
      log = siteName => `Finished ${ unescape( siteName ) }`
 */
function updateSites ( configFn ) {
  return function doUpdates ( siteKeyGitList ) {
    return Promise.all( siteKeyGitList.map( updateSitesPromise ) )
  }

  function updateSitesPromise ( siteEntry ) {
    var config = configFn()
    var platformName = config.platformName
    var generateVersion = config.generateVersion
    var generate = config.generate
    var whConfig = config.whConfig

    var updateDirectory = `${ platformName }--${ siteEntry.siteName }`

    var cloneOptions = {
      userRepo: siteEntry.github,
      dirName: '.',
      cloneToDir: updateDirectory,
      gitTag: `update-generate-${ generateVersion }`,
    }

    var updateOptions = Object.assign( {
      generate: generate,
      siteName: siteEntry.siteName,
      siteKey: siteEntry.siteKey,
      force: true,
      platformName: platformName,
      dirName: updateDirectory,
    }, whConfig )

    return gitClone( cloneOptions )
      // .then( unlinkDirectory( updateDirectory ) )
      .then( doSiteUpdate( updateOptions ) )
      .then( handleSiteUpdates )

    function handleSiteUpdates () {
      return Promise.resolve( siteEntry )
    }
  }

  function gitClone ( options ) {
    return new Promise( doClone )

    function doClone ( resolve, reject ) {
      runGitCloneForUpdate( options, handleClone )

      function handleClone ( error, output ) {
        if ( error ) return reject( error )
        resolve()
      }
    }
  }

  function doSiteUpdate ( options ) {
    return function resolveSiteUpdate () {
      return new Promise( siteUpdatePromise )
    }

    function siteUpdatePromise ( resolve, reject ) {
      updateSite( options, handleSiteUpdate )

      function handleSiteUpdate ( error ) {
        if ( error ) return reject( error )
        resolve()
      }
    }
  }

  function unlinkDirectory ( directory ) {
    return function resolveUnlinkDirectory () {
      return new Promise( doUnlink )
    }

    function doUnlink ( resolve, reject ) {
      runRmRf( directory, handleUnlink )

      function handleUnlink () {
        resolve()
      }
    }
  }
}
