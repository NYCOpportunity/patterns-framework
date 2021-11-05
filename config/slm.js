let slm = require('@nycopportunity/pttrn/config/slm');

let remotes = {
  development: '',
  production: 'https://nycopportunity.github.io/patterns-framework',
};

slm.root = remotes[process.env.NODE_ENV];

module.exports = slm;
