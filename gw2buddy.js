const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const chokidar = require('chokidar');
const config = JSON.parse(fs.readFileSync('./src/config.json', 'utf8'));
const report = require('./src/report');
const statTable = require('./src/stat-table');
const path = require('path');
const { getStatTable } = require('./src/stat-table');

const DISCORD_TOKEN = config.DISCORD_TOKEN;
let processedFiles = new Map();
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
client.login(DISCORD_TOKEN);  

//Print leaderboards when message is sent
client.on('message', async (message) => {

  //Split messages into parameters
  let params = message.content.split(' ');
  let sortStr = 'damage';//default search to damage

  if(params.length > 1){
    sortStr = params[1];
  }

  //Display table of accumulated raid stats
  if (params[0] === '!raidStats') {

    let statTables = statTable.getSizedStatTables(getStatTable(sortStr, () => {
      message.channel.send('', {
        files : [
          './src/out/stat-table.txt'
        ]
      })
    }));

    for( i = 0; i < statTables.length; i++) {
      str = `Stat Table ${i + 1} of ${statTables.length}\n`
      message.channel.send(str + '```' + statTables[i] + '```')
    }
  }

  // Clear directories and create a new stat table
  if (params[0] === '!clear') {
    fs.readdir('./arcdps-logs', (err, files) => {
      if (err) throw err;
    
      for (const file of files) {
        fs.unlink(path.join('./arcdps-logs', file), err => {
          if (err) throw err;
        });
      }
    });
    fs.readdir('./src/input', (err, files) => {
      if (err) throw err;
    
      for (const file of files) {
        fs.unlink(path.join('./src/input', file), err => {
          if (err) throw err;
        });
      }
    });

    statTable.clearTable();
    processedFiles = new Map();
  }
  
  // Introduce bot in general
  if (params[0] === '!introduce') {
    client.channels.fetch(config.GENERAL_CHANNEL_ID).then(channel => {
      channel.send("I'm alive. I am your raid historian.");
    }).catch(err => console.error(err));
  }

});

async function postSquadStatTable(statTables) {

  client.channels.fetch(config.DISCORD_CHANNEL_ID).then(channel => {
    for( i = 0; i < statTables.length; i++){
      str = `Squad Stat Table ${i + 1} of ${statTables.length}\n`
      channel.send(str + '```' + statTables[i] + '```')
    }
  }).catch(err =>  console.error(err));
}

async function postEnemyStatTable(statTables) {
  client.channels.fetch(config.DISCORD_CHANNEL_ID).then(channel => {
    for( i = 0; i <  statTables.length; i++){
      str = `Stats for Enemy Players as a whole.\n`
      channel.send(str + '```' + statTables[i] + '```')
    }
  }).catch(err =>  console.error(err));
}

async function postFightStatsHeader(fightObj) {
  client.channels.fetch(config.DISCORD_CHANNEL_ID).then( channel => {
    let header = `__**Reports for fight on ${fightObj.map} lasting ${fightObj.duration}**__`
    channel.send(header);
  }).catch(err =>  console.error(err));
}

//Watch the log directory, waiting for arcdps to dump log files
chokidar.watch(config.EVTC_WATCH_DIR, {
  awaitWriteFinish : true,
  ignoreInitial :  true
}).on('add', async (path) => {
  console.log(path);
  let pathArray = path.split('\\');
  let filename = pathArray[pathArray.length - 1];
  console.log("test" + filename);

  //Make sure we haven't already processed this file
  if (!(filename in processedFiles)) {

    processedFiles.set(filename, true);
    report.runAsciiReport(filename, postFightStatsHeader, postSquadStatTable, postEnemyStatTable);
    console.log("post successful");
  }

});