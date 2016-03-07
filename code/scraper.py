from bs4 import BeautifulSoup
import requests
import urllib2
import csv

# This function parse a single page and write to a csv file 
# @param: url of the page, the team we are working on now
#

def parsePage(url, curTeam):
	# url = 'http://www.basketball-reference.com/boxscores/pbp/201410280SAS.html'
	response = urllib2.urlopen(url, 'lxml')
	page = response.read()
	soup = BeautifulSoup(page)
	table = soup.find("table", {"class" : "no_highlight stats_table"})

	allRows = table.findAll('tr')
	left = True
	team1 = allRows[1].findAll('th')[1].string
	team2 = allRows[1].findAll('th')[3].string
	f = open(curTeam + "_data.csv", 'wb')
	writer = csv.writer(f)
	writer.writerow(["time", "player", "player link", "score description"])
	if team1 != curTeam:
		left = False
	for r in allRows:
		# check tr id if it is a quarter header
		if r.id:
			continue
		# check th if it is titles of the table
		tds = r.findAll('td')
		if len(tds) == 0 or len(tds) == 2:
			continue
		# then get data
		# get the first and second 
		time = tds[0].getText()
		description = tds[1]
  	# get the fifth and sixth
		if not left:
			time = tds[4]
			description = tds[5]
		if "misses" in description.getText() or "makes" in description.getText():
			# I am assuming the first link is the player who scores
			player = description.findAll("a")[0]
			player_link = player['href']
			writer.writerow([time, player.getText(), player_link, description.getText()])
	f.close()

if __name__ == '__main__':
	url = 'http://www.basketball-reference.com/boxscores/pbp/201410280SAS.html'
	parsePage(url,'Dallas')