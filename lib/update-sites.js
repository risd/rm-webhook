/**

Update sites
------

init = gitTag : str,
       sitesMiniMatch : str,
       confOrPath : {}|str 
       semverChange : major|minor|patch => error?

parse-conf = confOrPath => conf

get-user-pass = () => user, pass

firebase-init = user, pass => firebase

list-sites = user => siteList

sites-to-update = siteList, sitesMiniMatch => updateSiteList

git-for-site = updateSiteList => siteGitList : { siteName, github }

key-for-site = siteGitList => siteKeyGitList : { siteName, siteKey, github }

deploys-for-site => siteKeyGitList => siteDeploysKeyGitList

generate-version = generate => generateVersion

migrations-for-generate = generateVersion => migrations

for each in siteDeploysKeyGitList
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