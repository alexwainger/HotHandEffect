import csv
import requests
import re
import urllib2
from collections import defaultdict
from lxml import html
from bs4 import BeautifulSoup

def main():
	with open("teams.csv", "rb") as file:
		reader = csv.reader(file);	
		next(reader, None);
		for row in reader:
			team_abr = row[1];
			pbp_name = row[2];
			with open(pbp_name + ".csv", "wb") as team_csv:
				writer = csv.writer(team_csv);
				writer.writerow(["time", "player", "player link", "score description", "game id", "home game"]);
				schedule_url = "http://www.basketball-reference.com/teams/" + team_abr + "/2015_games.html";
				schedule_page = requests.get(schedule_url);
				tree = html.fromstring(schedule_page.content);
				for i in range(87):
					if not (i % 21 == 0):
						link = tree.xpath('//*[@id="teams_games"]/tbody/tr[' + str(i) + ']/td[5]/a/@href');
						gameID_regex = re.compile('^/boxscores/([^.]+).html');
						gameID = gameID_regex.search(link[0]).group(1);
						play_by_play_link = "http://www.basketball-reference.com/boxscores/pbp/" + gameID + ".html";

						parsePage(writer, play_by_play_link, pbp_name, gameID);

def parsePage(writer, play_by_play_link, pbp_name, gameID):
	response = urllib2.urlopen(play_by_play_link, 'lxml');
	page = response.read();
	soup = BeautifulSoup(page);
	table = soup.find("table", {"class" : "no_highlight stats_table"});

	allRows = table.findAll('tr');
	left = True;
	isHomeGame = False;
	team1 = allRows[1].findAll('th')[1].string;
	team2 = allRows[1].findAll('th')[3].string;
	if team1 != pbp_name:
		left = False;
		isHomeGame = True;
	for r in allRows:

		# check tr id if it is a quarter header
		if r.id:
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

		if "misses" in description.getText() or "makes" in description.getText():
			# I am assuming the first link is the player who scores
			player = description.findAll("a")[0];
			player_link = player['href'];
			writer.writerow([time, player.getText(), player_link, description.getText(), gameID, isHomeGame]);

if __name__ == "__main__":
	main();


