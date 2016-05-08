import random
import argparse
import csv
import numpy as np
import sqlite3

class hot_object:

	def __init__(self, curr_game, curr_quarter, curr_time, makes_req, interval):
		self.time_between_shots = interval;
		self.req_consec_makes = makes_req;
		self.quarter = curr_quarter;
		self.game_id = curr_game;
		self.time = curr_time
		self.consec_makes = 0;
	
	def is_player_hot(self, gameid, quarter, time, curr_shot):
		is_within_time_range = self.compare_times(gameid, quarter, time);
		is_hot = is_within_time_range and (self.consec_makes >= self.req_consec_makes);
		self.game_id = gameid;
		self.quarter = quarter;
		self.time = time;
		if curr_shot:
			if is_within_time_range:
				self.consec_makes += 1;
			else:
				self.consec_makes = 1;
		else:
			self.consec_makes = 0;

		return is_hot;

	def compare_times(self, new_gameid, new_quarter, new_time):
		new_min = float(new_time.split(":")[0]);
		old_min = float(self.time.split(":")[0]);
		new_sec = float(new_time.split(":")[1]) / 60.0;
		old_sec = float(self.time.split(":")[1]) / 60.0;

		if new_quarter > self.quarter:
			old_min += 12.0 * (new_quarter - self.quarter);

		return ((new_gameid == self.game_id) and ((old_min + old_sec) - (new_min + new_sec) <= self.time_between_shots));

class player_object:
	
	def __init__(self, curr_link):
		self.player_link = curr_link;
		self.hot_makes = 0.0;
		self.hot_shots = 0.0;
		self.reg_makes = 0.0;
		self.reg_shots = 0.0;
		self.hot_fg = 0.0;
		self.reg_fg = 0.0;

	def hot_shot_missed(self):
		self.hot_shots += 1.0;
		self.reg_shots += 1.0; 

	def hot_shot_made(self):
		self.hot_shots += 1.0;
		self.hot_makes += 1.0;
		self.reg_shots += 1.0;
		self.reg_makes += 1.0;

	def reg_shot_missed(self):
		self.reg_shots += 1.0;

	def reg_shot_made(self):
		self.reg_shots += 1.0;
		self.reg_makes += 1.0;

	def calculate_hot(self):
		if self.hot_shots == 0.0:
			self.hot_fg = 0.0;
		else:
			self.hot_fg = self.hot_makes/self.hot_shots;

	def calculate_reg(self):
		if self.reg_shots == 0.0:
			self.reg_fg = 0.0;
		else:
			self.reg_fg = self.reg_makes/self.reg_shots;

##########################################################
################# Permutation Test #######################
##########################################################


def calculate_percentages(rows, makes, time_between_shots):
	regular = []
	hothand = []
	player_dict = {};
	hot_dict = {};

	for row in rows:
		curr_time = row[0];
		curr_quarter = row[1];
		curr_id = row[2];
		curr_shot = row[3];
		curr_game = row[4];
		
		if curr_id not in player_dict:
			player_dict[curr_id] = player_object(curr_id);
			hot_dict[curr_id] = hot_object(curr_game, curr_quarter, curr_time, makes, time_between_shots);
		
		hot_obj = hot_dict[curr_id];
		player_obj = player_dict[curr_id];
		is_hot = hot_obj.is_player_hot(curr_game, curr_quarter, curr_time, curr_shot);
		if curr_shot:
			if is_hot:
				player_obj.hot_shot_made();
			else:
				player_obj.reg_shot_made();
		else:
			if is_hot:
				player_obj.hot_shot_missed();
			else:
				player_obj.reg_shot_missed();

	for key in player_dict.keys():
		if player_dict[key].hot_shots > 100:
			player_dict[key].calculate_reg();
			player_dict[key].calculate_hot();
			hothand.append(player_dict[key].hot_fg);
			regular.append(player_dict[key].reg_fg);

	return regular, hothand

def permutation_test():	
	connection = sqlite3.connect("data/database.sqlite3");
	cursor = connection.cursor();
	
	queryString = "SELECT Time, Quarter, Player_ID, Is_Make, Game_ID FROM RAW_SHOTS;";# WHERE Year >= 2002 AND Year<=2016;";
	rows = cursor.execute(queryString).fetchall();

	for makes in range(1,5):
		for span in range(1, 9):
			regular, hothand = calculate_percentages(rows, makes, span);

			iters = 100000;
			diff = np.abs(np.mean(hothand) - np.mean(regular));
			n = len(regular);
			total = np.concatenate([regular, hothand]);
			k = 0;
			for i in range(iters):
				np.random.shuffle(total);
				if diff < np.abs(np.mean(total[:n]) - np.mean(total[n:])):
					k += 1;

			print "For makes: " + str(makes) + ", and span: " + str(span) + " ---> " + str(float(k)/iters) + "  (" + str(n) + " data points, " + str(np.mean(hothand) - np.mean(regular)) + " difference)";

if __name__ == '__main__':
	permutation_test();
