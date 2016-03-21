import csv
import requests
import re
import urllib2
import time
from collections import defaultdict
from lxml import html
from bs4 import BeautifulSoup

class Player_Stats:

	def __init__(self, name, regular_fgp):
		self.name = name;
		self.regular_fgp = float(regular_fgp);
		self.hot_hand_shots = 0.0;
		self.hot_hand_makes = 0.0;

	def made_shot(self):
		self.hot_hand_shots += 1.0;
		self.hot_hand_makes += 1.0;

	def miss_shot(self):
		self.hot_hand_shots += 1.0;

	def get_hot_percentage(self):
		if self.hot_hand_shots == 0:
			return 0.0
		else:
			return self.hot_hand_makes / self.hot_hand_shots;

	def print_stats(self):
		if self.hot_hand_shots > 300:
			print self.name + " shot " + str(self.regular_fgp) + ", and shot " + str(self.get_hot_percentage()) + " on " + str(self.hot_hand_shots) + " when hot!";

class Hot_Object:

	def __init__(self):
		self.isHot = False;
		self.quarter = 0;
		self.gameID = "";
		self.time = "-10:-10:-10";
	
	def setHot(self, isHot):
		self.isHot = isHot;

	def setTime(self, time):
		self.time = time;

	def setQuarter(self, quarter):
		self.quarter = quarter;

	def setGameID(self, gameID):
		self.gameID = gameID;

def compare_times(time1, time2):
	min1 = float(time1.split(":")[0]);
	min2 = float(time2.split(":")[0]);
	sec1 = float(time1.split(":")[1]);
	sec2 = float(time2.split(":")[1]);

	return (min2 - min1 <= 5);

def getNormalFG(dic):
	response = urllib2.urlopen("http://www.basketball-reference.com/leagues/NBA_2015_per_game.html", 'lxml');
	page = response.read();
	soup = BeautifulSoup(page, "html.parser");

	allRows = soup.findAll('tr', {"class" : "full_table"}) #full_table include all unique players with TOT FG%

	for r in allRows:
		tds = r.findAll('td')
		if len(tds) == 0:
			continue;

		player_link = tds[1].findAll('a')[0]['href']
		FG_percentage = tds[10].getText()

		if FG_percentage:
			stats = Player_Stats(player_link, FG_percentage);
			dic[player_link] = stats;

def calcHotHandPercentage(dic):

	with open("data/teams.csv", "rb") as f:

		reader = csv.reader(f);
		next(reader, None);
		for team_row in reader:

			file_name = "data/" + team_row[2] + ".csv";
			with open(file_name, "rb") as f2:
		
				reader2 = csv.reader(f2);
				next(reader2, None);
				isPlayerHot = defaultdict(Hot_Object);
				
				for shot_row in reader2:
					curr_time = shot_row[0];
					curr_quarter = shot_row[1];
					player_link = shot_row[3];
					isMake = shot_row[4] == "True";
					curr_game = shot_row[7];
					
					hotObj = isPlayerHot[player_link];
					if hotObj.isHot and compare_times(curr_time, hotObj.time) and hotObj.quarter == curr_quarter and hotObj.gameID == curr_game:
						if isMake:
							dic[player_link].made_shot();
						else:
							dic[player_link].miss_shot();

					hotObj.setHot(isMake);
					hotObj.setQuarter(curr_quarter);
					hotObj.setGameID(curr_game);
					hotObj.setTime(curr_time);

		for player_link, stats in dic.iteritems():
			stats.print_stats();

def main():
	link_to_stats = {} # the dictionary that maps player link to the player's stats
	getNormalFG(link_to_stats);
	calcHotHandPercentage(link_to_stats);

if __name__ == "__main__":
	main();
