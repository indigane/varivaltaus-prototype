#!/bin/bash
# Study: Tiling Speed Study (Aggressive Bots)
# This script runs the go-flood simulator for all supported tiling types
# and gathers metrics to compare game speed.

TILINGS=(
    "square" "triangle" "hex" "trihexagonal" "truncated-hexagonal" "truncated-trihexagonal"
    "snub-square" "snub-trihexagonal" "elongated-triangular" "pentagon-cairo"
    "pentagon-prismatic" "pentagon-floret" "deltoidal-trihexagonal" "rhombille"
    "triakis-triangular" "kisrhombille" "tetrakis-square" "rhombitrihexagonal"
    "4.8.8" "voronoi-jittered" "voronoi-random" "pythagorean"
)

GAMES=1000
COLS=20
ROWS=20
COLORS=6
BOTS="aggressive,aggressive"
OUTPUT="raw_results.txt"

echo "Tiling Speed Study Data Collection (Aggressive Bots)" > $OUTPUT
echo "Parameters: Games=$GAMES, Size=${COLS}x${ROWS}, Colors=$COLORS, Bots=$BOTS" >> $OUTPUT
echo "----------------------------------------------------------------" >> $OUTPUT

for tiling in "${TILINGS[@]}"; do
    echo "Processing $tiling..."
    echo "TILING: $tiling" >> $OUTPUT
    cd ../../../go-flood
    go run cmd/sim/main.go \
        -games $GAMES \
        -board "$tiling" \
        -cols $COLS \
        -rows $ROWS \
        -colors $COLORS \
        -bots $BOTS >> ../research/tiling-speed-study/aggressive/$OUTPUT 2>&1
    cd ../research/tiling-speed-study/aggressive
    echo "----------------------------------------------------------------" >> $OUTPUT
done

echo "Data collection complete. Results saved to $OUTPUT"
