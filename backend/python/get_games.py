import csv
import requests
import re
import urllib2
import sqlite3
from collections import defaultdict
from lxml import html
from bs4 import BeautifulSoup

##################################################
### GETS ALL SHOTS FOR ALL TEAMS FOR ALL YEARS ###
##################################################
def main():

	connection = sqlite3.connect("data/database.sqlite3");	
	cursor = connection.cursor();
	
	years_num_teams = [("2016", 30), ("2015", 30), ("2014",30), ("2013",30), ("2012",30), ("2011",30), ("2010",30), ("2009",30), ("2008",30), ("2007",30), ("2006",30), ("2005",30), ("2004",29), ("2003",29), ("2002",29), ("2001",29)];

	for year, num_teams in years_num_teams:
		count = 0;
		## Get year summary page, this is where we jump off from to visit each team's page
		year_page = html.fromstring(requests.get("http://www.basketball-reference.com/leagues/NBA_" + year + ".html").content);
		for i in range(1, num_teams + 1):
			team_link = year_page.xpath('//*[@id="team"]/tbody/tr[' + str(i) + ']/td[2]/a/@href')
			if team_link:
				## Number of games this team played this season
				num_games = int(year_page.xpath('//*[@id="team"]/tbody/tr[' + str(i) + ']/td[3]/text()')[0]);
				abr_regex = re.compile("\/.*\/(.*)\/.*");
				team_abr = abr_regex.search(team_link[0]).group(1);
				## Games_link is a page with boxscore links for every game this team played this season
				games_link = "http://www.basketball-reference.com" + team_link[0][:-5] + "_games" + ".html";
				games_page = requests.get(games_link);
				tree = html.fromstring(games_page.content);

				## Loop through all the games the team played, parse the play-by-play
				for i in range(num_games + (num_games / 20) + 1):
					## Every 20 rows, there's a header row that we want to ignore
					if not (i % 21 == 0):
						link = tree.xpath('//*[@id="teams_games"]/tbody/tr[' + str(i) + ']/td[5]/a/@href');
						gameID_regex = re.compile('^/boxscores/([^.]+).html');
						gameID = gameID_regex.search(link[0]).group(1);
						# Go to the play-by-play table and parse each row
						play_by_play_link = "http://www.basketball-reference.com/boxscores/pbp/" + gameID + ".html";
						parsePage(cursor, play_by_play_link, team_abr, gameID, year);

				print "Finished " + team_abr + ", " + year;

			else:
				break;

		# Only commit changes to database after a full year is complete, that way if an error
		# occurs, we can just restart the script on the year it failed on (each year takes over
		# an hour to complete, so this was an important feature of the script)
		print "Finished " + year;
		connection.commit();

	connection.close();


###############################
### PARSE PLAY-BY-PLAY PAGE ###
###############################
def parsePage(cursor, play_by_play_link, team_abr, gameID, year):
	response = urllib2.urlopen(play_by_play_link, 'lxml');
	page = response.read();
	soup = BeautifulSoup(page, "lxml");
	table = soup.find("table", {"class" : "no_highlight stats_table"});

	allRows = table.findAll('tr');
	quarter = ""; 
	left = True;
	isHomeGame = False;

	## The game id is composed of the date and the home team
	## so if the team abbreviation is in the gameID, it means
	## this game is a home game for the team we are processing
	if team_abr in gameID:
		left = False;
		isHomeGame = True;

	shots = [];
	for r in allRows:
		# check tr id if it is a quarter header
		if r.get("id"):
			quarter = r.get("id")[1:];
			continue;

		# check th if it is titles of the table
		tds = r.findAll('td')
		if len(tds) == 0 or len(tds) == 2:
			continue;

		# then get data
		time = tds[0].getText();
		if left:
			description = tds[1];
		else:
			description = tds[5];

		description_text = description.getText();
		if ("misses" in description_text or "makes" in description_text) and ("free throw" not in description_text and "no shot" not in description_text):
			
			player = description.findAll("a")[0];
			player_link = player['href'];
			
			distance = -1;
			# A dunk is from distance 0
			if "rim" in description_text:
				distance = 0;
			else:
				distance_regex = re.compile("^.* ([0-9]+) ft.*");
				result = distance_regex.search(description_text);
				distance = int(result.group(1));

			two_point_regex = re.compile("^.* ([23])-pt.*");
			is_two_pointer = int(two_point_regex.search(description_text).group(1)) == 2;

			# Add data to a list to be inserted into database
			shots.append( (time, quarter, player.getText(), player_link, "makes" in description_text, distance, is_two_pointer, gameID, int(year), isHomeGame,) );
		
	# Do a bulk insert of all the rows for a single game
	cursor.executemany("INSERT INTO RAW_SHOTS VALUES(?,?,?,?,?,?,?,?,?,?);", shots);


if __name__ == "__main__":
	main();

