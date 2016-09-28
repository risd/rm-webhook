# rm-webhook

A wrapper around the self hosted friendly version of [`webhook`](https://github.com/risd/webhook)

### Setup

`npm install rm-webhook grunt -g`

Ensure you have a `wh.json` file saved at `~/.risdmedia/wh.json`. It should include the following keys:

```
{
  "embedly": "",
  "server": "",
  "firebase": "",
  "domain": "",
  "generate": "",
}
```

The values of which are in 1Password as a secure note under the title `rm-webhook config (wh.json)`.


### Usage

```
rm-wh create <siteName>
rm-wh delete <siteName>
rm-wh init <siteName>
rm-wh serve
rm-wh deploy
rm-wh backup <toFile>
rm-wh restore <fromFile>
rm-wh preset-build
rm-wh preset-build-all
```
