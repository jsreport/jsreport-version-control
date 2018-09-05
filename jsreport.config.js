
const schema = {
  type: 'object',
  properties: {
    provider: { type: 'string' },
    diffLimit: { type: 'string', default: '400kb' }
  }
}

module.exports = {
  'name': 'version-control',
  'main': 'lib/main.js',
  'optionsSchema': {
    versionControl: schema,
    extensions: {
      'version-control': schema
    }
  },
  'dependencies': [ 'templates' ]
}
