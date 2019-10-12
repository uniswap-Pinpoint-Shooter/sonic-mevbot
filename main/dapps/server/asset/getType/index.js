const types = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ttf: 'application/font-sfnt',
  svg: 'image/svg+xml',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  png: 'image/png'
}

module.exports = (path) => {
  const ext = path.substr(path.lastIndexOf('.') + 1)
  return types[ext] || 'text/plain'
}
