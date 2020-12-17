# GW2Buddy
GW2Buddy is a discord bot that parses and calculates your statistics in Guild Wars 2. The discord bot detects .evtc log dumps from arcdps, and automatically displays the information as a neat table in any Discord channel. 

## Installation

Use git to clone the repository in your local machine. Before using GW2Buddy, there are a few configurations you must set in config.json. Please take your time to set them up

```bash
    "DISCORD_CHANNEL_ID": Discord Channel ID That GW2Buddy Sends Messages To,
    "PARSER_EXE": Home Path + "/GW2Buddy/libs/GW2EI/GuildWars2EliteInsights.exe",
    "PARSER_CONF": Home Path + "/GW2Buddy/libs/GW2EI/Settings/custom.conf",
```

## Commands
```bash
   !introduce
   !raidStats [options]    # Displays Combined Stat Table: options to sort by
   !clear                  # Clears all statistics recorded
``` 

## Usage

```python
    npm start
```
Easy as that.
