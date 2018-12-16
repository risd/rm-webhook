/**

Update sites
------

Update a series of @rids/webhook sites in batch, without needed a local
repository for each site.
*/

var debug = require( 'debug' )( 'update-sites' )

var confPathToConfigurationObject = require( './configuration' )
var migrationsForVersion = require( '../migrations' )
var minimatch = require( 'minimatch' )
var path = require( 'path' )
var fs = require( 'fs' )

var firebaseEscape = require( './wh' ).util.escapeSite;
var firebaseUnescape = require( './wh' ).util.unescapeSite;
var Firebase = require( './wh' ).util.firebase;
var firebaseAuthSeries = require( './wh' ).util.authSeries;
var functor = require( './wh' ).util.functor;
var npmViewVersion = require( './wh' ).util.npmViewVersion;
var runGitCloneForUpdate = require( './wh' ).util.runGitCloneForUpdate
var runCommitDeployForUpdate = require( './wh' ).util.runCommitDeployForUpdate
var runRmRf = require( './wh' ).util.runRmRf
var updateSite = require( './wh' ).update
var downloadGenerate = require( './wh' ).util.downloadGenerate

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
    whConfig: Object.assign( {}, options ),
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
    .then( setGeneratePath( configFn ) )
    .then( updateSites( configFn ) )
    .then( deleteDownloadedGenerate( configFn ) )
    .then( handleUpdate )
    .catch( handleUpdateError )

  function handleUpdate ( siteList ) {
    var results = {
      generateVersion: configFn().updateToGenerateVersion,
      siteList: siteList,
    }
    callback( null, results )
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
 * generate-version = configFn => siteKeyGitList => config.updateToGenerateVersion => siteKeyGitList
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
        config.updateToGenerateVersion = generateVersion;
        resolve( siteKeyGitList )
      }
    }
  }
}

/**
 * set-downloaded-generate = configFn => siteKeyGitList => config.generatePath => siteKeyGitList
 */
function setGeneratePath ( configFn ) {
  return function getGeneratePath ( siteKeyGitList ) {
    return new Promise( setGeneratePathPromise )

    function setGeneratePathPromise ( resolve, reject ) {
      var config = configFn()
      var generate = config.generate
      downloadGenerate( generate, handleDownloadedGenerate )

      function handleDownloadedGenerate ( error, downloadedGenerate ) {
        if ( error ) return reject( error )
        config.generatePath = downloadedGenerate;
        resolve( siteKeyGitList )
      }
    }
    
  }
}

/**
 *  for each in siteDeploysKeyGitList
    update-site = generate, github, siteName, siteKey, updateDir, migrations =>
      clone = updateDir, github => git clone ssh || git clone https => error?
      checkout = updateDir, gitTag => git checkout master => git checkout hotfix => error?
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

    if ( siteKeyGitList.length === 0 ) return Promise.resolve( siteKeyGitList )

    var siteEntry = siteKeyGitList[ 0 ]
    var siteEntryPromise = updateSitesPromise( siteEntry )

    if ( siteKeyGitList.length === 1 ) return siteEntryPromise.then( passListPromise )

    for (var i = 1; i < siteKeyGitList.length; i++) {
      var siteEntry = siteKeyGitList[ i ]
      siteEntryPromise = siteEntryPromise.then( queueUpdateSitesPromise( siteEntry ) )
    }

    return siteEntryPromise.then( passListPromise )

    function passListPromise ( siteEntry ) {
      return new Promise( function ( resolve, reject ) {
        resolve( siteKeyGitList )
      } )
    }
  }

  function queueUpdateSitesPromise ( siteEntry ) {
    return function queued () {
      return updateSitesPromise( siteEntry )
    }
  }

  function updateSitesPromise ( siteEntry ) {
    debug( `Updating: ${ siteEntry.siteName }` )
    var config = configFn()
    var platformName = config.platformName
    var updateToGenerateVersion = config.updateToGenerateVersion
    var generatePath = config.generatePath
    var whConfig = config.whConfig

    var updateDirectory = `${ platformName }--${ siteEntry.siteName }`
    config.updateDirectory = updateDirectory

    var cloneOptions = {
      userRepo: siteEntry.github,
      dirName: '.',
      cloneToDir: updateDirectory,
      gitTag: `update-generate-${ updateToGenerateVersion }`,
    }

    // whConfig supplied in addition to updateOptions defined here
    // to supplement the site init process. (wh/init)
    var updateOptions = Object.assign( {
      generatePath: generatePath,
      generateVersion: updateToGenerateVersion,
      siteName: siteEntry.siteName,
      siteKey: siteEntry.siteKey,
      force: true,
      platformName: platformName,
      dirName: updateDirectory,
      deleteGenerate: false,
    }, whConfig )

    return gitClone( cloneOptions )
      .then( setCurrentGenerateVersion( configFn ) )
      .then( doSiteUpdate( updateOptions ) )
      .then( doMigrations( configFn ) )
      .then( pushUpdates( cloneOptions ) )
      .then( unlinkDirectory( updateDirectory ) )
      .then( handleSiteUpdates )
      .catch( handleSiteUpdatesError )

    function handleSiteUpdates ( migrationsResults ) {
      debug( `Updated: ${ siteEntry.siteName }` )
      return Promise.resolve( siteEntry )
    }

    function handleSiteUpdatesError ( error ) {
      if ( error.message === CurrentGenerateUpToDate() ) {
        debug( `${ siteEntry.siteName } is already up to date.` )
        return unlinkDirectory( updateDirectory )( Object.assign( { alreadyUpToDate: true }, siteEntry) )
          .then( handleSiteUpdates )
          .catch( handleSiteUpdatesError )
      }
      else {
        return Promise.reject( error )  
      }
    }
  }

  function CurrentGenerateUpToDate () {
    return `current generator is up to date`
  }

  // options : { userRepo, dirName, cloneToDir, gitTag } => git-clone-for-update => error?
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

  // set-current-generate-version = configFn => () => config.currentGenerateVersion|error
  function setCurrentGenerateVersion ( configFn ) {
    return function resolveSetCurrentGenerateVersion () {
      var config = configFn()
      var updateToGenerateVersion = config.updateToGenerateVersion;
      var updateDirectory = config.updateDirectory;
      var platformName = config.platformName;

      try {
        var packageJson = JSON.parse( fs.readFileSync( `./${ path.join( updateDirectory, 'package.json' ) }` ).toString() )
      }
      catch ( error ) {
        return Promise.reject( error )
      }
      
      try {
        config.currentGenerateVersion = packageJson[ platformName ].generate;
      }
      catch ( error ) {
        config.currentGenerateVersion = '0.0.0';
      }

      if( updateToGenerateVersion === config.currentGenerateVersion ) {
        return Promise.reject( new Error( CurrentGenerateUpToDate() ) )
      }

      Promise.resolve()
    }
  }

  // options => () => wh/update => error?
  function doSiteUpdate ( options ) {
    return function resolveSiteUpdate () {
      return new Promise( siteUpdatePromise )
    }

    function siteUpdatePromise ( resolve, reject ) {
      updateSite( options, handleSiteUpdate )

      function handleSiteUpdate ( error, generatePath ) {
        if ( error ) return reject( error )
        resolve()
      }
    }
  }

  // configFn => () => MigrationResults : [{ generatePath, siteDirectory, migrationName, migrationError }]
  function doMigrations ( configFn ) {
    return function resolveMigrations () {
      var config = configFn()
      var currentGenerateVersion = config.currentGenerateVersion
      var updateToGenerateVersion = config.updateToGenerateVersion
      var migrations = migrationsForVersion( currentGenerateVersion, updateToGenerateVersion )
      return Promise.all( migrations.map( seedMigrationPromises ) )

      function seedMigrationPromises ( migrationFn ) {
        var generatePath = config.generatePath
        var updateDirectory = config.updateDirectory

        return migrationFn( {
          siteDirectory: updateDirectory,
          generatePath: generatePath,
        } )
      }
    }
  }

  // options => () => MigrationResults|error
  function pushUpdates ( options ) {
    return function resolvePushUpdates ( migrationResults ) {
      return new Promise( doCommitPush )

      function doCommitPush ( resolve, reject ) {
        runCommitDeployForUpdate( options, handleDeploy )

        function handleDeploy ( error, output ) {
          if ( error ) return reject( error )
          resolve( migrationResults )
        }
      }
    }
  }

  // directory => () => run-rm-raf => MigrationResults|error
  function unlinkDirectory ( directory ) {
    return function resolveUnlinkDirectory ( migrationResults ) {
      return new Promise( doUnlink )

      function doUnlink ( resolve, reject ) {
        runRmRf( directory, handleUnlink )

        function handleUnlink ( error ) {
          if ( error ) return reject( error )
          resolve( migrationResults )
        }
      }
    }
  }
}

/**
 * delete-downloaded-generate = configFn => ( siteKeyGitList ) => () => siteKeyGitList|error
 */
function deleteDownloadedGenerate ( configFn ) {
  return function resolveDeleteGenerate ( siteKeyGitList ) {
    return new Promise( deleteGeneratePromise )

    function deleteGeneratePromise ( resolve, reject ) {
      var config = configFn()
      var generatePath = config.generatePath
      try {
        fs.unlinkSync( generatePath )  
      }
      catch ( error ) {
        return reject( error )
      }
      resolve( siteKeyGitList )
    }
  }
}
