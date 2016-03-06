from bs4 import BeautifulSoup
import requests
import urllib2
url = 'http://www.basketball-reference.com/boxscores/pbp/201410280SAS.html'
response = urllib2.urlopen(url, 'lxml')
page = response.read()
soup = BeautifulSoup(page)
table = soup.find("table", {"class" : "no_highlight stats_table"})

allRows = table.findAll('tr')
left = True
team1 = allRows[1].findAll('th')[1].string
team2 = allRows[1].findAll('th')[3].string

if team1 != 'Dallas':
	left = False
for r in allRows:
	# check tr id if it is a quarter header
	if r.id:
		continue
	# check th if it is titles of the table
	
	# then get data
	if left:
		# get the first and second 
  else:
  	# get the fifth and sixth
