import random
import argparse
import csv
import numpy as np

def load_file():
	# data = []
	regular = []
	hothand = []
	with open('data/shooting_numbers.csv') as f:
		reader = csv.DictReader(f)
		for row in reader:
			regular.append( float(row['regular_fgp']) );
			hothand.append( float(row['hot_fgp']) );

	return regular, hothand

def permutation_test():
	regular, hothand = load_file();
	iters = 100000;
	diff = np.mean(hothand) - np.mean(regular);
	n = len(regular);
	total = np.concatenate([regular, hothand]);
	k = 0;
	for i in range(iters):
		np.random.shuffle(total);
		if diff <= (np.mean(total[:n]) - np.mean(total[n:])):
			k += 1;

	print float(k)/iters;


if __name__ == '__main__':
	permutation_test();
