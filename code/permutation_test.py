import random
import argparse
import csv
import numpy as np

def load_file():
    # data = []
    regular = []
    hothand = []
    with open('../data/shooting_numbers.csv') as f:
    	reader = csv.DictReader(f)
    	for row in reader:
    		regular.append(float(row['regular_fgp']))
    		hothand.append(float(row['hot_fgp']))

    return regular, hothand



def permutation_test():

	# parser = argparse.ArgumentParser()
	# parser.add_argument('-regular', required=True, help='Path to regular data')
	# parser.add_argument('-holiday', required=True, help='Path to holiday data')
	# parser.add_argument('-iters', type=int, default=100000, help='Number of iterations to run')
	# opts = parser.parse_args()

	regular, hothand = load_file()
	iters = 100000
	# TODO: Fill in 
	diff = np.abs(np.mean(regular) - np.mean(hothand))
	n = len(regular)
	total = np.concatenate([regular, hothand])
	k = 0
	for i in range(iters):
		np.random.shuffle(total)
		if diff <= (np.mean(total[:n]) - np.mean(total[n:])):
			k += 1
	print float(k)/iters


if __name__ == '__main__':
	permutation_test()
