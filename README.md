# rm-webhook

A wrapper around the self hosted friendly version of [`webhook`](https://github.com/risd/webhook)

### Setup

`npm install rm-webhook grunt -g`

Ensure you have a `wh.json` file saved at `~/.risdmedia/wh.json`. It should include the following keys:

```
{
  "embedly": ""
  "server": ""
  "firebase": ""
  "firebaseAPIKey": ""
  "domain": ""
  "generate": ""
  "platformName": ""
}
```

The values of which are in 1Password as a secure note under the title `rm-webhook config (wh.json)`.

- `embedly` is an Embedly API key. This will be used within the CMS to embed JSON data from URLs into the database.
- `server` is the URL of the `@risd/webhook-open-serer` instance. Including the protocal to use, http or https. This will be used to update the elastic search which is used in the CMS, as well as uploaded files to the `UPLOADS_BUCKET` of the server.
- `firebase` is the name of the firebase realtime database being used to back the platform.
- `firebaseAPIKey` is the web API key for the firebase project being used to back the platform.
- `domain` is the default development domain.
- `generate` is the source of the static site generator. This can be a URL to a tarball, or an `npm install` package string, such as `@risd/webhook-generate@^2.2`. This will be used to download the base when creating a new site, or updating an existing site.


### Usage

```
rm-wh create <siteName>
rm-wh init <siteName>
rm-wh serve
rm-wh deploy
rm-wh backup <toFile>
rm-wh restore <fromFile>
rm-wh preset-build
rm-wh preset-build-all
rm-wh reset-keys
rm-wh deploy-static
rm-wh deploys
rm-wh github
rm-wh update-sites
```

**rm-wh create**

Use this command to create a new website in webhook.

`rm-wh create {site-name}` 

If `site-name` does not include a top level domain, the `domain` key from the `--configuration` flag or default configuration will be used to create a full domain name.


**rm-wh update-sites**

This command can be used to update sites in batch.

Using the github user/repo string defined in `management/sites/{site-name}/github`

`rm-wh update-sites {site-names}` 

`site-names` is a string that will get passed into [minimatch][minimatch], along with all of the sites that are owned by the account that is used to log in after issuing this command.

The `--generate` argument will be used to download a tarball that is used to make the sites from. `--generate` is expected to be an npm module string such as [`@risd/webhook-generate`][rm-wh-generate], or tarball URL.

For example: `rm-wh update-sites '!*edu*'` will update all non `edu` sites. This is useful on RISD webhook, as a way to update all sites that are compatible with the batch uploader. Extra configuration would have to go into making this comptable with the [`risd-edu`][risd-edu] repo, since that repo is a mono repo, with one package being a webhook site. This command expects that the git repo's it pulls from are webhook sites at their root.

For each site that is being updated, the current `risd.systems` generator package semver value, saved in `package.json` under the key `["risd.systems"]["generate"]`, will be used to determine which migrations should be applied to the code base. The `update-sites` process will determine if there are any migrations to apply by comparing the current site generate semver against the update generate semver value. These migrations are functions that modify the code base to align with the update generator version that is being applied to the site. This is useful for capturing updates that occur outside of the scope of the typical site update, which only changes within the `libs`, `tasks`, `options` directories & the `package.json`.

[minimatch]:https://www.npmjs.com/package/minimatch
[rm-wh-generate]:https://github.com/risd/webhook-generate
[risd-edu]:https://github.com/risd/risd-edu
