const { request } = require('@octokit/request');
const fs = require('fs');
const HttpProxyAgent = require('http-proxy-agent');

const cnsl = require('@nycopportunity/pttrn/bin/util/console');
const alerts = require('@nycopportunity/pttrn/config/alerts');

let GITHUB_PERSONAL_ACCESS_TOKEN = '';
let OUTPUT = []

let LISTS = {
  'core': [
    'patterns-cli',
    'patterns-docs',
    'patterns-scripts'
  ],
  'pinned': [
    'patterns-demo',
    'patterns-test',
    'patterns-angular',
    'patterns-create-react-app'
  ],
  'plugins': [
    'patterns-plugin-properties',
    'patterns-plugin-feather',
    'patterns-plugin-twig'
  ],
  'modules': [
    'pattern-elements',
    'pattern-typography',
    'pattern-application-header',
    'pattern-navigation',
    'pattern-menu',
    'pattern-attribution',
    'pattern-modal'
  ],
  'libraries': [
    'standard',
    'working-nyc-patterns',
    'ACCESS-NYC-PATTERNS',
    'nyco-patterns',
    'growingupnyc-patterns',
    'generationnyc-patterns',
    'screeningapi-docs',
    'mental-health-for-all'
  ],
  'nyc': [
    'USWDS-generator',
    'react-uswds',
    'nyc-core-framework',
    'labs-ui',
    'nyc-planning-style-guide',
    'nyc-lib',
  ]
};

/**
 * Write JSON Output
 *
 * @param  {String}  path  The path to write the file to
 */
const write = async (path = 'dist/data') => {
  try {
    let lists = Object.keys(LISTS);

    cnsl.describe(`${alerts.info} Building collections.`);

    for (let i = 0; i < lists.length; i++) {
      let l = LISTS[lists[i]];

      let listOutput = OUTPUT.filter(o => {
        return l.includes(o.full_name.split('/')[1]);
      });

      await fs.writeFileSync(`${path}/${lists[i]}.json`, JSON.stringify(listOutput));

      cnsl.success(`Output ${alerts.str.path(`${path}/${lists[i]}.json`)} was made.`);
    }
  } catch (error) {
    cnsl.error(error);
  }
};

/**
 * The main handler for requests to the API
 *
 * @param   {String}  req      A request matching one from the GitHub API https://docs.github.com/en/rest/reference
 * @param   {Object}  options  A list of options to pass along to the octokit.request() method
 */
const main = async (req, options) => {
  try {
    cnsl.describe(`${alerts.info} Retrieving ${alerts.str.string(options.org || options.username)} repository information.`);

    options.headers = {
      authorization: `token ${GITHUB_PERSONAL_ACCESS_TOKEN}`
    };

    if (process.env.HTTP_PROXY) {
      options.request = {
        agent: new HttpProxyAgent(process.env.HTTP_PROXY)
      };
    }

    let result = await request(req, options);

    // cnsl.describe(`Response sample and schema:
      // ${alerts.str.string(JSON.stringify(result.data[0], undefined, 2))}`);

    for (let index = 0; index < result.data.length; index++) {
      const item = result.data[index];

      if (item.private || item.archived) continue;

      OUTPUT.push({
        'name': item.name,
        'full_name': item.full_name,
        'organization': options.org,
        'description': item.description,
        'url': item.html_url,
        'language': item.language,
        'stargazers_count': item.stargazers_count,
        'forks': item.forks,
        'owner': item.owner.login
      });
    }

    cnsl.success(`Success. Added ${alerts.str.string(result.data.length)} item(s) to the output.`);

    return true;
  } catch (error) {
    cnsl.error(error);
  }
};

/**
 * The main runner for the meta command
 */
const run = async () => {
  try {
    GITHUB_PERSONAL_ACCESS_TOKEN = await fs.readFileSync('.gh-token');

    await main('GET /orgs/{org}/repos', {
      org: 'CityOfNewYork',
      type: 'public',
      per_page: 100,
      page: 1
    });

    await main('GET /orgs/{org}/repos', {
      org: 'CityOfNewYork',
      type: 'public',
      per_page: 100,
      page: 2
    });

    await main('GET /orgs/{org}/repos', {
      org: 'NYCOpportunity',
      type: 'public',
      per_page: 100
    });

    await main('GET /users/{username}/repos', {
      username: 'timkeane',
      type: 'public',
      per_page: 100
    });

    await main('GET /orgs/{org}/repos', {
      org: 'NYCPlanning',
      type: 'public',
      per_page: 100,
      page: 1
    });

    await main('GET /orgs/{org}/repos', {
      org: 'NYCPlanning',
      type: 'public',
      per_page: 100,
      page: 2
    });

    await main('GET /orgs/{org}/repos', {
      org: 'NYCPlanning',
      type: 'public',
      per_page: 100,
      page: 3
    });

    await main('GET /orgs/{org}/repos', {
      org: 'nyc-cto',
      type: 'public',
      per_page: 100,
      page: 1
    });

    await write();
  } catch (error) {
    cnsl.error(error);
  }
};

/**
 * Export our methods
 *
 * @type {Object}
 */
module.exports = {
  run: run,
  main: main
};
