
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' }
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
