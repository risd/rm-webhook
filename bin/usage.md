rm-wh cmd

`cmd`         The command to run. Including `create`,
              `deploy`, `serve` & anything else `wh`
              would get you.

Example

./bin/cmd create new-site

Requires a configuration file at `.risdmedia/wh.json`
that includes keys `embedly`, `server`, `firebase`, `generate`, `domain`.
`embedly` is the Embedly key.
`server` is the IP of the WebHook Google Compute instance.
`firebase` is the name of the Firebase used by WebHook.
`domain` is the self hosted domain
`generate` is a url to the zip file used to create new webhook sites