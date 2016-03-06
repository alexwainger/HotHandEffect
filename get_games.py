import csv
import requests
import re
from collections import defaultdict
from lxml import html

def main():

    team_to_pbp_links = defaultdict(list);
    with open("teams.csv", "rb") as file:
        reader = csv.reader(file);
        next(reader, None);
        for row in reader:
            print row;
            team_abr = row[1];
            schedule_url = "http://www.basketball-reference.com/teams/" + team_abr + "/2015_games.html";
            schedule_page = requests.get(schedule_url);
            tree = html.fromstring(schedule_page.content);
            for i in range(87):
                if not (i % 21 == 0):
                    link = tree.xpath('//*[@id="teams_games"]/tbody/tr[' + str(i) + ']/td[5]/a/@href');
                    '/boxscores/201504150CHI.html'
                    gameID_regex = re.compile('^/boxscores/([^.]+).html');
                    gameID = gameID_regex.search(link[0]).group(1);
                    play_by_play_link = "http://www.basketball-reference.com/boxscores/pbp/" + gameID + ".html";
                    team_to_pbp_links[team_abr].append(play_by_play_link);

            print len(team_to_pbp_links[team_abr]);

if __name__ == "__main__":
    main();
