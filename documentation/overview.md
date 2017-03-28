# rm-wh

Primary Command Line Interface (CLI) into RISD webhook.


### Usage

In order to use the `rm-wh` tool, the computer must have `node` & `npm` commands available. Additionally, the interface anticipates finding a JSON file of configuration at `~/.risdmedia/wh.json`. The contents of this JSON file should match the contents of the `risd.systems configuration - wh.json` document in the shared RISD Media 1Password vault. `git` is also a core piece of how the `rm-wh` tool is designed to work. This document will speak to a git branching model by the name of [git-flow][git-flow].

The contents of the `wh.json` file are used to pass in common configuration options, which can each be overridden when executing `rm-wh`.

To install:  `npm install rm-webhook --global`

Once installed `rm-wh` will be accessible. Executing this command will show the available commands, and options that can be used to create, delete, and otherwise manage webhook sites.

A common flow for using `rm-wh` might include creating, deploying, updating templates & configurating additional buckets to deploy to. This flow is captured by the series of commands:

`rm-wh create new-site`
This will create a new webhook site at `new-site.risd.systems`. The site name will have the domain `risd.systems` appended to it if it does not include a `.`. If the site name does include a `.`, such as `rm-wh create new-site.at-my-new-cool.tld`, then the webhook site will be available at `new-site.at-my-new-cool.tld`. Once the site is created, it should be deployed. Deploying makes the CMS & base site available at the URL defined during the creation.

`rm-wh deploy`
Once deployed, the website will be available at `new-site.risd.systems`, and the CMS will be available at `new-site.risd.systems/cms`. This command will package up the local templates, named based on the current git branch, and pushes them to the server to be used for future builds of the website.

`rm-wh serve`
Serve is a command that is used to update templates, determining the relationship between content in the CMS, and the pages where that content flows in. As these are being defined, `rm-wh deploy` can be used to push edits that are made locally, to the site's URL.

`rm-wh deploys`
The deploys interface can be used to manage deploying different sets of templates that are all backed by the same CMS instance. Executing this command will show the current site's deploy configuration. If none have been set, then a default configuration will be used.

Each deploy is configured with:

- `bucket`: the name of the Google Storage Bucket where the built site is pushed. This is the unique identifier for setting or removing a deploy endpoint.
- `branch`: the name of the `git` branch where the templates are stored.

For our `new-site` example, the default configuration would be:

- branch: master
- bucket: new-site.risd.systems

`rm-wh deploys:set new-site.risd.edu`
The set command can be used to add additional buckets. If no `--branch` flag is set, the current branch is used.

`rm-wh deploys:remove deprecated-site.risd.edu`
The remove command will remove the bucket as a location to deploy a website to.


[git-flow]:https://github.com/nvie/gitflow
