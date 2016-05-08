import requests
from lxml import html
from bs4 import BeautifulSoup
import urllib2
import re
import sqlite3

def main():
	try:
		connection = sqlite3.connect("data/database.sqlite3");
		c = connection.cursor();

		players_seen = set();

		rows = c.execute('SELECT DISTINCT player_id FROM raw_shots where player_id not in (SELECT player_id from completed);').fetchall();
		for row in rows:
			player_id = row[0];
		
			response = urllib2.urlopen("http://www.basketball-reference.com" + player_id, 'lxml').read();
			soup = BeautifulSoup(response, 'lxml');

			if player_id not in players_seen:
				players_seen.add(player_id);
			
				info_box = soup.find(id = 'info_box');
				player_info = info_box.find("p", {"class": "padding_bottom_half"});

				full_name = info_box.find('h1').get_text().encode('utf-8');
				position = player_info.contents[1].strip(u' \xa0\u25aa\xa0').encode('utf-8').split(' and ')[0];
				height = player_info.contents[6].strip(u' \xa0\u25aa\xa0').encode('utf-8');
				weight = player_info.contents[8].strip(u' \xa0\u25aa\xa0').rstrip().encode('utf-8');
			
				height_reg = re.compile('([5678])-([0-9]+)');
				weight_reg = re.compile('([0-9]+) lbs\.');

				height_res = height_reg.search(height);
				height = int(height_res.group(1)) * 12 + int(height_res.group(2));
				weight = int(weight_reg.search(weight).group(1));

				c.execute("INSERT INTO Players VALUES(?,?,?,?);", (player_id, height, weight, position));
				c.execute("UPDATE Raw_Shots SET Player_Name = ? WHERE Player_ID = ?;", (full_name, player_id));

			years = c.execute('SELECT DISTINCT Year from raw_shots WHERE player_id =? ;', (player_id,)).fetchall();
			for year in years:
				year = year[0];
				year_row = soup.findAll(id = ('totals.' + str(year)));

				team_abrs = [];
				if len(year_row) > 1:
					for i in range(1, len(year_row)):
						team_abrs.append(year_row[i].contents[5].find('a').text);
				else:
					team_abrs.append(year_row[0].contents[5].find('a').text);

				team_abr = "/".join(team_abrs);

				c.execute("INSERT INTO Player_Team_Pairs VALUES(?,?,?);", (player_id, year, team_abr));

			c.execute("INSERT INTO Completed VALUES(?);", (player_id,));
			connection.commit();
			print "Completed " + full_name + " (" + team_abr + ")";

		print "finishing"
		connection.close();
	
	except:
		print player_id;
		raise;

if __name__ == "__main__":
	main();
