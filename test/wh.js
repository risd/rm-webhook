var test = require( 'tape' )

test( 'ensure wh imports', function ( t ) {
  t.plan( 1 )
  t.assert( typeof require( '../lib/wh.js' ) === 'object', 'underlying wh library loads.' )
} )
