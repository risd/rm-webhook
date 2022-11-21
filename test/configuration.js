const test = require( 'tape' )

test( 'configuration', async function ( t ) {
  t.plan( 1 )

  const conf = await require( '../lib/configuration.js' )()

  t.assert( typeof conf === 'object', 'successfully loaded configuration' )
} )
