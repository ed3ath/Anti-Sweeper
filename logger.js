const clc = require('cli-color')
const moment = require('moment-timezone')

const severityMap = {
  info: clc.cyan,
  warn: clc.yellow,
  error: clc.red,
  success: clc.green,
  main: clc.magenta
}

module.exports = (level, sender, msg) => {
  console.log(clc.blue(moment().tz("Asia/Manila").format('LTS')) + ' ' + severityMap[level](`[${sender.toUpperCase()}]`), msg)
}
