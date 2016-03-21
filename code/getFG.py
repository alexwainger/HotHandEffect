import csv
import requests
import re
import urllib2
from collections import defaultdict
from lxml import html
from bs4 import BeautifulSoup

def main():
	link_nomalFG = {} # the dictionary that maps player link to the player's FG%
	getNormalFG(link_nomalFG);

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
		dic[player_link] = FG_percentage



if __name__ == "__main__":
	main();