var semverCompare = require( 'semver-compare' )
var trumpet = require( 'trumpet' )
var path = require( 'path' )
var fs = require( 'fs' )

var generateExtract = require( '../lib/wh' ).util.generateExtract;

module.exports = WHMigrations;

function WHMigrations ( currentVeresion, nextVersion ) {
  var migrations = {
    '2.2.7': [
      makeCmsExtensible,
      standardizeCmsStyle,
      copyVscode,
      copyBrowserslist,
    ],
  }

  var migrationsForVersion = Object.keys( migrations )
    .filter( compareVersions )
    .reduce( concatMigrations, [] )

  return migrationsForVersion;


  function compareVersions ( migrationVersion ) {
    return semverCompare( nextVersion, migrationVersion ) >= 0 &&
           semverCompare( migrationVersion, currentVeresion ) >= 0
  }

  function concatMigrations ( migrationFns, version ) {
    return migrationFns.concat( migrations[ version ] )
  }
}

/* migration functions */

// migration-fn = { siteDirectory, generatePath } => { siteDirectory, generatePath, migrationName, migrationError }

function makeCmsExtensible ( options ) {
  var copier = copyFileFor( options )

  var tasks = [
    copier( path.join( 'templates', 'partials', 'cms', 'head.html' ) ),
    copier( path.join( 'templates', 'partials', 'cms', 'head-js.html' ) ),
    copier( path.join( 'templates', 'partials', 'cms', 'footer.html' ) ),
  ]

  return reportResponse( 'make-cms-extensible', options, tasks )

  // see if file exists, if not, add it to extraction

  // extract templates/partials/cms/footer.httml
  // extract templates/partials/cms/head-js.httml
  
  // TODO stream pages/cms.html, get existing, and move into head.html
  // if empty, extract head.html
  // move existing
  //    `link[rel="shortcut icon"]` && 
  //     `link[rel="apple-touch-icon-precomposed"]`
  //   into templates/partials/cms/head.httml
}

function standardizeCmsStyle ( options ) {

  // copy scss/cms.scss if it does not exist
  // copy scss/components/_wysiwyg_custom.scss if it does not exist
  // TODO if scss/cms-custom.scss exists, move to scss/css.scss remove '../' from dependencies
 
  var copier = copyFileFor( options )

  var tasks = [
    copier( path.join( 'scss', 'cms.scss' ) ),
    copier( path.join( 'scss', 'components', '_wysiwyg_custom.scss' ) ),
  ]

  return reportResponse( 'standardize-cms-style', options, tasks )

}


function copyVscode ( options ) {
  // var generatePath = options.generatePath;
  // var siteDirectory = options.siteDirectory;

  // copy .vscode into siteDirectory
  
  var copier = copyFileFor( options )

  var tasks = [ copier( '.vscode' ) ]

  return reportResponse( 'standardize-cms-style', options, tasks )  
  
  // return new Promise ( copyVscodePromise )

  function copyVscodePromise ( resolve, reject ) {
    copyVscodeCallback( function ( error ) {
      if ( error ) return reject( error )
      resolve()
    } )
  }

  function copyVscodeCallback ( callback ) {
    var file = '.vscode'
    if ( fileExists( file ) ) return resolve()
    generateExtract( {
      generatePath: generatePath,
      cwd: siteDirectory,
      filesToExtract: [ file ]
    } ).on( 'error', callback )
       .on( 'finish', callback )

  }
}

function copyBrowserslist ( options ) {
  // copy .browserslistrc into cwd
  
  var copier = copyFileFor( options )

  var tasks = [ copier( '.browserslistrc' ) ]

  return reportResponse( 'standardize-cms-style', options, tasks )  
}

/* migration helpers */

function copyFileFor ( options ) {
  var generatePath = options.generatePath;
  var siteDirectory = options.siteDirectory;

  return function copyFile ( file ) {
    return new Promise( copyFilePromise )

    function copyFilePromise ( resolve, reject ) {
      var siteFilePath = path.join( siteDirectory, file )
      console.log( 'copy-file: ' + file )
      if ( fileExists( siteFilePath ) ) {
        return resolve()
      }
      else {
        extract( Object.assign( { filesToExtract: [ file ] }, options ) )
          .then( resolve )
          .catch( reject )
      }
    }
  }
}

function fileExists ( file ) {
  return fs.existsSync( file )
}

function extract ( options ) {
  var generatePath = options.generatePath;
  var siteDirectory = options.siteDirectory;
  var filesToExtract = options.filesToExtract;

  return new Promise( extractPromise )

  function extractPromise ( resolve, reject ) {
    generateExtract( {
      generatePath: generatePath,
      cwd: siteDirectory,
      filesToExtract: filesToExtract,
    } ).on( 'error', reject )
       .on( 'finish', resolve )
  }
}

function reportResponse ( name, options, migrationFns ) {

  return new Promise( report )

  function report ( resolve, reject ) {

    Promise.all( migrationFns )
      .then( reportSuccess )
      .catch( reportError )

    function reportSuccess () {
      resolve( reportWith() )
    }

    function reportError ( error ) {
      resolve( reportWith( error ) )
    }
  }
  
  function reportWith ( error ) {
    return Object.assign( {
      migrationName: name,
      migrationError: error ? error : null,
    }, options )
  }
}