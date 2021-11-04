const test = require( 'tape' )

test( 'configuration', function ( t ) {
  t.plan( 1 )

  const conf = require( '../lib/configuration.js' )()

  t.assert( typeof conf === 'object', 'successfully loaded configuration' )
} )
