import csv
import requests
import re
import urllib2
import sqlite3
from collections import defaultdict
from lxml import html
from bs4 import BeautifulSoup

def main():

	connection = sqlite3.connect("data/database.sqlite3");	
	cursor = connection.cursor();
	
	## Add 2002 - 2014 later if we have time
	years = ["2015"];

	for year in years:
	
		count = 0;
		year_page = html.fromstring(requests.get("http://www.basketball-reference.com/leagues/NBA_" + year + ".html").content);
		
		for i in range(1, 31):
			team_link = year_page.xpath('//*[@id="team"]/tbody/tr[' + str(i) + ']/td[2]/a/@href')
			if team_link:
				abr_regex = re.compile("\/.*\/(.*)\/.*");
				team_abr = abr_regex.search(team_link[0]).group(1);
				games_link = "http://www.basketball-reference.com" + team_link[0][:-5] + "_games" + ".html";
				games_page = requests.get(games_link);
				tree = html.fromstring(games_page.content);

				for i in range(87):
					if not (i % 21 == 0):
						link = tree.xpath('//*[@id="teams_games"]/tbody/tr[' + str(i) + ']/td[5]/a/@href');
						gameID_regex = re.compile('^/boxscores/([^.]+).html');
						gameID = gameID_regex.search(link[0]).group(1);
						play_by_play_link = "http://www.basketball-reference.com/boxscores/pbp/" + gameID + ".html";	
						parsePage(cursor, play_by_play_link, team_abr, gameID, year);

				print "Finished " + team_abr + ", " + year;

			else:
				break;

		print "Finished " + year;
		connection.commit();

	connection.close();


def parsePage(cursor, play_by_play_link, team_abr, gameID, year):
	response = urllib2.urlopen(play_by_play_link, 'lxml');
	page = response.read();
	soup = BeautifulSoup(page, "lxml");
	table = soup.find("table", {"class" : "no_highlight stats_table"});

	allRows = table.findAll('tr');
	quarter = ""; 
	left = True;
	isHomeGame = False;
	
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
		# get the first and second 
		time = tds[0].getText();
		if left:
			description = tds[1];
		# get the fifth and sixth
		else:
			description = tds[5];

		description_text = description.getText();
		if ("misses" in description_text or "makes" in description_text) and ("free throw" not in description_text):
			
			player = description.findAll("a")[0];
			player_link = player['href'];
			
			distance = -1;
			if "rim" in description_text:
				distance = 0;
			else:
				distance_regex = re.compile("^.* ([0-9]+) ft.*");
				result = distance_regex.search(description_text);
				distance = int(result.group(1));

			two_point_regex = re.compile("^.* ([23])-pt.*");
			is_two_pointer = int(two_point_regex.search(description_text).group(1)) == 2;

			if distance < 0:
				print "Uh oh, negative distance...";

			shots.append( (time, quarter, player.getText(), player_link, "makes" in description_text, distance, is_two_pointer, gameID, int(year), isHomeGame,) );
		
	cursor.executemany("INSERT INTO RAW_SHOTS VALUES(?,?,?,?,?,?,?,?,?,?);", shots);


if __name__ == "__main__":
	main();

