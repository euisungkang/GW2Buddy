const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./src/config.json', 'utf8'));
const util = require('util');
const exec = util.promisify( require( 'child_process' ).exec);
const statTable = require('./stat-table');

async function runAsciiReport(filename, postFightStatsHeader, postSquadStats, postEnemyStats) {
    //Parse the evtc file into HTML and JSON
    await parseEvtc(filename);
  
    //Run the JSON leaderboard parsing asynchronously
    let jsonFilename = ('./src/input/' + filename.split('.')[0] + '_wvw_kill.json');
    //Parse JSON to leaderboard and post fight stats
    statTable.addFightToLeaderboard(jsonFilename).then( async (fightObj) => {

      //Post header message
      await postFightStatsHeader(fightObj);

      //Post friendly and enemy stats
      await postSquadStats(statTable.getSizedStatTables(await statTable.getFriendlyTable(fightObj)));
      await postEnemyStats(statTable.getSizedStatTables(await statTable.getEnemyTable(fightObj)));

    })
}

// Uses GW2EI to parse the .evtc file to an html report and JSON log
async function parseEvtc(filename) {
  let command = config.PARSER_EXE + ' -p -c ' + config.PARSER_CONF + ' ' + config.LOG_SAVE_PATH + '\\' + filename;
  let {stdout, stderr} = await exec(command);
  console.log(stdout);
  console.log(stderr);
}

module.exports = {
  parseEvtc : parseEvtc,
  runAsciiReport : runAsciiReport,
}