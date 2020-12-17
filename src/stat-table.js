let fs = require('fs');
let table = require('text-table');

//Hashmap that will hold player states
let playerStats = new Map();

/**
 * Adds the stats from the fight to the leaderboard.
 * @param {string} fp - pointer to the JSON file of parsed evtc log
 */
async function addFightToLeaderboard(fp) {
    //Read in JSON file
    let file = fs.readFileSync(fp);
    let fightStats = await JSON.parse(file);

    let fightObj = {
        map : fightStats.fightName,
        duration : fightStats.duration,
        playerList : [],
        enemyData : {}
    };

    //Loop through each player in the fight
    await fightStats.players.forEach(  (player) => {

        //account id will act as our key, meaning it will merge anyone who character swaps.
        let accountId = player.account;

        //Check if key already exists, if it doesn't then add it.
        if( !(accountId in playerStats) ){
            //Create the initial stat object, which contains all the stats tracked for the leaderboard
            let statObj = {
                characters : [],
                totalActiveTime : 0,
                fightsParticipated : 0,
                damage : 0,
                cleanses : 0,
                strips : 0,
                stabUptime : 0,
                alacUptime : 0,
                dodges : 0,
                distance : 0,
                downs : 0,
                deaths : 0,
                fightTime : 0,
            };
            //Add initial object to map
            playerStats[accountId] = statObj;
        }

        //Retrieve stats from previouis fights for this player
        let statObj = playerStats[accountId];
        //Stats for this specific fight
        let fightStatObj = {};

        //Add character name if need be
        if( !(statObj.characters.includes(player.name)) ){
            statObj.characters.push(player.name);
        }

        //Parse out the offensive, defensive and support stats from JSON
        let offensiveStats = player.dpsTargets[0][0];
        let defensiveStats = player.defenses[0];
        let supportStats = player.support[0];
        let generalStats = player.statsAll[0];

        //Find buff uptime % 
        //Stability
        let buffUptimeArray = player.buffUptimes;
        let stability = buffUptimeArray.find( (buff) => {
            if(buff.id === 1122){
                return true;
            }
        })
        let stabUptime = (stability === undefined ? 0 : stability.buffData[0].uptime);
        //alacrity
        let alacrity = buffUptimeArray.find( (buff) => {
            if(buff.id === 30328){
                return true;
            }
        })
        let alacUptime = (alacrity === undefined ? 0 : alacrity.buffData[0].uptime);

        let activeTime = player.activeTimes[0];

        let deathTime = activeTime
        if(player.deathRecap != undefined){
            deathTime = player.deathRecap[0].deathTime;
        }

        //Create fight specific stats
        fightStatObj.account = accountId;
        fightStatObj.character = player.name;
        fightStatObj.totalActiveTime = activeTime;
        fightStatObj.fightsParticipated = 1;
        fightStatObj.damage = offensiveStats.damage;
        fightStatObj.cleanses = supportStats.condiCleanse + supportStats.condiCleanseSelf;
        fightStatObj.strips = supportStats.boonStrips;
        fightStatObj.stabUptime = stabUptime;
        fightStatObj.alacUptime = alacUptime;
        fightStatObj.dodges = defensiveStats.dodgeCount;
        fightStatObj.distance = generalStats.distToCom;
        fightStatObj.downs = defensiveStats.downCount;
        fightStatObj.deaths = defensiveStats.deadCount;
        fightStatObj.fightTime = deathTime;

        //Save fight specific stats
        fightObj.playerList.push(fightStatObj)

    
        //Add current fight statistics to the previous fights
        statObj.totalActiveTime += activeTime
        statObj.fightsParticipated += 1;
        statObj.damage += offensiveStats.damage;
        statObj.cleanses += supportStats.condiCleanse + supportStats.condiCleanseSelf;
        statObj.strips += supportStats.boonStrips;
        statObj.stabUptime += activeTime * stabUptime;
        statObj.alacUptime += activeTime * alacUptime;
        statObj.dodges += defensiveStats.dodgeCount;
        statObj.distance += (generalStats.distToCom * activeTime); // to average across all fights
        statObj.downs += defensiveStats.downCount;
        statObj.deaths += defensiveStats.deadCount;
        statObj.fightTime += deathTime;

        //Save statistics back to the map
        playerStats[accountId] = statObj;
    });    

    //Save enemy fight data
    let enemyStats = fightStats.targets[0];
    let enemyDpsStats = enemyStats.dpsAll[0]
    fightObj.enemyData = {
        totalDamage : enemyDpsStats.damage,
        powerDamage : enemyDpsStats.powerDamage,
        powerDps : enemyDpsStats.powerDps,
        condiDamage : enemyDpsStats.condiDamage,
        condiDps : enemyDpsStats.condiDps
    }

    return fightObj;

}

/**
 * Transforms the given fightObj into a stat table.
 * @param {*} fightObj 
 * @param {*} sortStr 
 */
async function getFriendlyTable(fightObj, sortStr) {

    //Create stat table header row
    let headers = ['Character', 'DPS', 'Damage', 'Cleanses', 'Strips', 'Stab', 'Dodges', 'Distance', 'Downs', 'Deaths', 'Time'];
    
    let playerStats = [];
    //Loop through each player
    for(let i = 0; i < fightObj.playerList.length; i++){
        let player = fightObj.playerList[i];
        let stats = [ player.character, 
            Math.round(player.damage / (player.totalActiveTime / 1000)),
            player.damage, player.cleanses, player.strips,
            player.stabUptime.toFixed(2),
            player.dodges, Math.round(player.distance),
            player.downs, player.deaths, `${Math.floor((player.fightTime / 1000) / 60)}m ${Math.round((player.fightTime / 1000)) % 60}s`];
        
        playerStats.push(stats);
    }

    let sortIndex = 2; //default to damage sorting
    if(!(sortStr === undefined)) {
        //Determine which column we're sorting by
        for(let i = 0; i < headers.length; i++){
            if(headers[i].toUpperCase().includes(sortStr.toUpperCase())){
                sortIndex = i;
                break;
            }
        }
    }

    //Sort table by chosen column
    playerStats.sort( function(player1, player2){
        //Separate sorting between numbers and strings
        if(isNaN(player1[sortIndex])){
            return player1[sortIndex].toUpperCase().localeCompare(player2[sortIndex].toUpperCase());
        }
        return  player2[sortIndex] - player1[sortIndex];
    })

    //Create array
    let tableArray = [headers];
    for( i = 0; i < playerStats.length; i++){
        tableArray.push(playerStats[i]);
    }

    //Create ascii table
    let statTable = table(
        tableArray,
        {align : [ 'l' , 'l' , 'l' , 'l' , 'l' , 'l' , 'l' , 'l', 'l' ]}
    );

    return statTable;
}

async function getEnemyTable(fightObj) {

    //Create table headers
    let headers = ['Name', 'Total Damage', 'Power Damage', 'Power DPS', 'Condi Damage', 'Condi DPS'];

    //Create data row
    let enemy = fightObj.enemyData;
    let enemyStats = ['Enemy Players', enemy.totalDamage, enemy.powerDamage, enemy.powerDps, enemy.condiDamage, enemy.condiDps];
    
    let tableArray = [headers, enemyStats]
    //Create ascii table
    let statTable = table(
        tableArray,
        {align : [ 'l', 'l' , 'l' , 'l' , 'l' , 'l' ]}
    );

    return statTable;
}

/**
 * Returns the stat map object as an ascii table
 * Returns array of tables, as discord is limited to 2000 characters per mesage
 */
function getStatTable(sortStr, cb) {

    //Create stat table header row
    let headers = ['Account', 'Characters', 'Fights', 'DPS', 'Damage', 'Cleanses', 'Strips', 'Stab', 'Dodges', 'Dist', 'Downs', 'Deaths', 'Time'];

    //Add player statistics to stat table
    let players = [];
    for(accountId in playerStats){
        let statObj = playerStats[accountId];
        let charactersStr = '';
        //Report last two characters
        for( i = statObj.characters.length - 1; ((i > statObj.characters.length - 3) && i >= 0); i--){
            if(i < statObj.characters.length - 1){
                charactersStr += ' , ';
            }
            charactersStr += statObj.characters[i];
        }

        if(charactersStr.length > 25) {
            charactersStr = charactersStr.slice(0,25) + '...';
        }
        let stats =  [accountId, charactersStr, statObj.fightsParticipated,
             Math.round(statObj.damage /(statObj.totalActiveTime / 1000)),
             statObj.damage, statObj.cleanses, statObj.strips,
             (statObj.stabUptime / statObj.totalActiveTime).toFixed(2),
             statObj.dodges, Math.round((statObj.distance / statObj.totalActiveTime)),
             statObj.downs, statObj.deaths, `${Math.floor((statObj.fightTime / 1000) / 60)}m ${Math.round((statObj.fightTime / 1000)) % 60}s`];
        players.push(stats);
    }

    let sortIndex = 3;//Default to dps
    //Determine which column we're sorting by
    for(let i = 0; i < headers.length; i++){
        if(headers[i].toUpperCase().includes(sortStr.toUpperCase())){
            sortIndex = i;
            break;
        }
    }

    //Sort table by chosen column
    players.sort( function(player1, player2){
        //Separate sorting between numbers and strings
        if(isNaN(player1[sortIndex])){
            return player1[sortIndex].toUpperCase().localeCompare(player2[sortIndex].toUpperCase());
        }
        return  player2[sortIndex] - player1[sortIndex];
    })

    //Create array
    let tableArray = [headers];
    for( i = 0; i < players.length; i++){
        tableArray.push(players[i]);
    }

    //Create ascii table
    let statTable = table(
        tableArray,
        {align : [ 'l' , 'l' , 'l' , 'l' , 'l' , 'l' , 'l' , 'l' , 'l', 'l', 'l', 'l' ]}
    );

    //Write backup to file
    fs.writeFile('./src/out/stat-table.txt', statTable, cb);

    return statTable;

}

/**
 * Returns an array of stat tables no larger than 1800 characters each
 */
function getSizedStatTables(statTable){

    //Split it by newlines
    let tableArray = statTable.split('\n');

    //Maximum row length will be the header length
    let header = tableArray[0];
    let maxRowLength = header.length + 1;
    
    //Find amount of rows available per table
    const reserved = 50;//Reserved for discord messaging
    let dataSpace = 2000 - maxRowLength - reserved;//Chars available for data in each message
    let rowsPerMessage = (dataSpace / maxRowLength) - 1;//Rows per message, subtract header


    //Add rows to messages
    let messageArray = [];
    for(let i = 1; i < tableArray.length; i++){
        //Create a new message if previous one is full
        if(messageArray.length < Math.floor(i / rowsPerMessage) + 1){
            messageArray.push(header + '\n');
        }
        //Add row to message
        messageArray[Math.floor(i / rowsPerMessage)] += (tableArray[i] + '\n');
    }
    return messageArray;
}

/**
 * Initializes a new instance of playerStats
 */
function clearTable() {
    playerStats = new Map();
}

module.exports = {
    addFightToLeaderboard : addFightToLeaderboard,
    getStatTable : getStatTable,
    getSizedStatTables : getSizedStatTables,
    getFriendlyTable : getFriendlyTable,
    getEnemyTable : getEnemyTable,
    clearTable : clearTable
}